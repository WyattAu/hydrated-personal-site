import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

const H = 280;
const SERIES_COLORS = ['#00e5ff', '#ff4081', '#4caf50', '#ff9800', '#7c4dff', '#eab308'];

interface PortfolioWindow {
  start: number;
  end: number;
  ret: number;
  weights: number[];
}

interface PortfolioResult {
  mode: string;
  equity: number[];
  drawdown: number[];
  asset_equity: number[][];
  rebalances: Array<[number, number[]]>;
  windows?: PortfolioWindow[];
  cagr: number;
  sharpe: number;
  max_drawdown: number;
  total_cost: number;
  rebalances_per_year: number;
  error?: string;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

async function fetchCloses(symbol: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=2y&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
}

export default function PortfolioBacktest() {
  const [result, setResult] = createSignal<PortfolioResult | null>(null);
  const [labels, setLabels] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  const [mode, setMode] = createSignal<'equal' | 'inv_vol' | 'min_var'>('inv_vol');
  const [rebalanceEvery, setRebalanceEvery] = createSignal(20);
  let runId = 0;

  async function loadData() {
    const myRun = ++runId;
    setLoading(true);
    setErr(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 2) throw new Error('Select at least 2 tickers');
      const use = tickers.slice(0, 6);

      const fetched = await Promise.all(use.map((t) => fetchCloses(t.symbol)));
      if (myRun !== runId) return; // superseded by a newer run
      // Truncate to shortest series so the matrix is rectangular.
      const n = Math.min(...fetched.map((f) => f.length));
      if (n < 90) throw new Error(`need 90+ overlapping closes, got ${n}`);
      const validIdx: number[] = [];
      use.forEach((_t, i) => {
        if (fetched[i].length >= 90) validIdx.push(i);
      });
      if (validIdx.length < 2) throw new Error('Need 2+ assets with data');

      const nAssets = validIdx.length;
      const flat = new Float64Array(nAssets * n);
      validIdx.forEach((i, a) => {
        for (let d = 0; d < n; d++) flat[a * n + d] = fetched[i][d];
      });

      const wasm = await getWasmMod();
      if (myRun !== runId) return; // superseded by a newer run
      if (typeof wasm.quant_portfolio_backtest_v2 !== 'function') {
        throw new Error('stale WASM bundle: quant_portfolio_backtest_v2 missing');
      }
      const out: PortfolioResult = JSON.parse(
        wasm.quant_portfolio_backtest_v2(flat, nAssets, n, mode(), rebalanceEvery(), 2.0),
      );
      if (out.error) throw new Error(out.error);
      if (!Array.isArray(out.equity) || out.equity.length < 2) {
        throw new Error(`bad result shape for mode=${mode()}: equity missing`);
      }
      if (!Array.isArray(out.asset_equity)) out.asset_equity = [];
      if (myRun !== runId) return; // superseded by a newer run
      setResult(out);
      setLabels(validIdx.map((i) => use[i].label));
    } catch (e) {
      if (myRun !== runId) return; // a newer run owns the UI now
      console.error('[PortfolioBacktest]', e);
      setErr(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      if (myRun === runId) setLoading(false);
    }
  }

  function renderChart() {
    const r = result();
    if (!r) return;
    try {
      const toSeries = (vals: number[]) =>
        vals.map((v, i) => ({ time: i, open: 0, high: 0, low: 0, close: v, volume: 0 }));
      const series = [
        { color: '#00e5ff', data: toSeries(r.equity) },
        ...(Array.isArray(r.asset_equity) ? r.asset_equity : []).map((eq, i) => ({
          color: SERIES_COLORS[(i + 1) % SERIES_COLORS.length],
          data: toSeries(eq),
        })),
      ];
      renderPlychart('portfolio-backtest', 'update_line', JSON.stringify(series), '');
    } catch (e) {
      console.error('[PortfolioBacktest] render failed', e);
      setErr(e instanceof Error ? `render: ${e.message}` : 'render failed');
    }
  }

  createEffect(() => {
    result();
    mode();
    renderChart();
  });

  usePlychartAuto(() => 'portfolio-backtest', renderChart);

  // Force re-render when mode changes even if result is still loading
  createEffect(() => {
    mode();
    // Re-render existing chart with new mode after data loads
    if (result()) renderChart();
  });

  function renderWeights() {
    const r = result();
    if (!r || !r.windows || r.windows.length < 2) return;
    try {
      // Build a matrix: rows = rebalance windows, cols = assets, val = weight*100
      const nAssets = r.windows[0]?.weights.length ?? 0;
      if (nAssets === 0) return;
      const matrix = r.windows.map((w) => w.weights.map((x) => Math.round(x * 1000) / 10));
      renderPlychart('portfolio-weights', 'update_heatmap', JSON.stringify(matrix), '');
    } catch (e) {
      console.error('[PortfolioBacktest] weights render failed', e);
    }
  }

  createEffect(() => {
    result();
    renderWeights();
  });

  usePlychartAuto(() => 'portfolio-weights', renderWeights);

  onMount(() => loadData());
  onTickersChanged(() => loadData());

  function exportCsv() {
    const r = result();
    if (!r) return;
    const rows = ['day,portfolio_equity,drawdown'];
    r.equity.forEach((e, i) => {
      rows.push(`${i},${e.toFixed(6)},${(r.drawdown[i] ?? 0).toFixed(6)}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backtest-${r.mode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const r = () => result();

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          PORTFOLIO BACKTEST
        </p>
        <Show when={!loading() && r()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {labels().length} assets | rebalance {rebalanceEvery()}d | {r()!.mode}
          </span>
        </Show>
      </div>

      <div class="flex gap-2 mb-3 items-center flex-wrap">
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
          style={{
            'border-color': mode() === 'min_var' ? 'var(--accent)' : 'var(--border)',
            color: mode() === 'min_var' ? 'var(--bg-primary)' : 'var(--accent)',
            background: mode() === 'min_var' ? 'var(--accent)' : 'var(--bg-secondary)',
          }}
          onClick={() => {
            setMode('min_var');
            loadData();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setMode('min_var');
              loadData();
            }
          }}
        >
          MIN VARIANCE
        </button>
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
          style={{
            'border-color': mode() === 'inv_vol' ? 'var(--accent)' : 'var(--border)',
            color: mode() === 'inv_vol' ? 'var(--bg-primary)' : 'var(--accent)',
            background: mode() === 'inv_vol' ? 'var(--accent)' : 'var(--bg-secondary)',
          }}
          onClick={() => {
            setMode('inv_vol');
            loadData();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setMode('inv_vol');
              loadData();
            }
          }}
        >
          INVERSE VOL
        </button>
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
          style={{
            'border-color': mode() === 'equal' ? 'var(--accent)' : 'var(--border)',
            color: mode() === 'equal' ? 'var(--bg-primary)' : 'var(--accent)',
            background: mode() === 'equal' ? 'var(--accent)' : 'var(--bg-secondary)',
          }}
          onClick={() => {
            setMode('equal');
            loadData();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setMode('equal');
              loadData();
            }
          }}
        >
          EQUAL WEIGHT
        </button>
        <label class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          REBALANCE: {rebalanceEvery()}d
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={rebalanceEvery()}
            onInput={(e) => setRebalanceEvery(Number(e.currentTarget.value))}
            class="ml-2"
          />
        </label>
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer ml-auto"
          style={{
            'border-color': 'var(--border)',
            color: 'var(--accent)',
            background: 'var(--bg-secondary)',
          }}
          onClick={() => loadData()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') loadData();
          }}
        >
          RUN
        </button>
        <Show when={r()}>
          <button
            type="button"
            class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
            style={{
              'border-color': 'var(--border)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
            }}
            onClick={exportCsv}
            onKeyDown={(e) => {
              if (e.key === 'Enter') exportCsv();
            }}
          >
            CSV
          </button>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Backtesting portfolio...
        </p>
      </Show>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <Show when={!loading() && r()}>
        <canvas id="portfolio-backtest" class="w-full" style={{ height: `${H}px` }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          WEIGHT SHIFT OVER TIME (per-rebalance fitted weights, %)
        </p>
        <canvas id="portfolio-weights" class="w-full" style={{ height: '160px' }} />
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              CAGR
            </p>
            <p
              class="font-mono text-sm font-bold"
              style={{ color: (r()?.cagr ?? 0) >= 0 ? '#4caf50' : '#ff5252' }}
            >
              {pct(r()?.cagr ?? 0)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              SHARPE
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {(r()?.sharpe ?? 0).toFixed(2)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              MAX DD
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: '#ff5252' }}>
              {pct(r()?.max_drawdown ?? 0)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              COST PAID
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {pct(r()?.total_cost ?? 0)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              REBAL/YR
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {(r()?.rebalances_per_year ?? 0).toFixed(1)}
            </p>
          </div>
        </div>
        <Show when={r() && r()!.windows && r()!.windows!.length > 0}>
          <div class="mt-3 overflow-x-auto">
            <table
              class="w-full border-collapse font-mono text-[9px]"
              style={{ 'min-width': '420px' }}
            >
              <thead>
                <tr style={{ color: 'var(--accent)' }}>
                  <th class="text-left p-1 border-b" style={{ 'border-color': 'var(--border)' }}>
                    WINDOW
                  </th>
                  <th class="text-left p-1 border-b" style={{ 'border-color': 'var(--border)' }}>
                    WEIGHTS
                  </th>
                  <th class="text-right p-1 border-b" style={{ 'border-color': 'var(--border)' }}>
                    RETURN
                  </th>
                </tr>
              </thead>
              <tbody>
                {r()!
                  .windows!.slice(-12)
                  .map((w) => (
                    <tr style={{ color: 'var(--text-secondary)' }}>
                      <td class="p-1">
                        {w.start}-{w.end}
                      </td>
                      <td class="p-1">{w.weights.map((x) => (x * 100).toFixed(0)).join('/')}</td>
                      <td
                        class="p-1 text-right"
                        style={{ color: w.ret >= 0 ? '#4caf50' : '#ff5252' }}
                      >
                        {w.ret >= 0 ? '+' : ''}
                        {(w.ret * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <Show when={r()!.windows!.length > 12}>
              <p class="font-mono text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                +{r()!.windows!.length - 12} earlier windows
              </p>
            </Show>
          </div>
        </Show>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          <span class="font-mono text-[9px]" style={{ color: '#00e5ff' }}>
            - portfolio ({r()?.mode})
          </span>
          <For each={labels()}>
            {(label, i) => (
              <span
                class="font-mono text-[9px]"
                style={{ color: SERIES_COLORS[(i() + 1) % SERIES_COLORS.length] }}
              >
                - {label}
              </span>
            )}
          </For>
        </div>
        <p class="font-mono text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          weights from trailing 60d vol at each rebalance (no look-ahead) | 2bps turnover cost |
          longest common date range
        </p>
      </Show>
    </div>
  );
}

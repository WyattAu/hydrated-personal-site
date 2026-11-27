import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { setChartLabels } from '../../../lib/plychart-render';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import { getWasmMod } from '../../../lib/wasm-loader';

/**
 * Backtest window explorer — pick a basket of benchmark ETFs, drag the
 * window across two years of real daily closes, and the WASM backtest
 * engine recomputes the equity curve live on every drag. No preset
 * results: every number on screen is computed in your browser for the
 * exact window you chose.
 */

const H = 320;
const MIN_WINDOW = 90;
const SERIES_COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9'];

const UNIVERSE: Array<{ symbol: string; label: string }> = [
  { symbol: 'SPY', label: 'US large cap' },
  { symbol: 'QQQ', label: 'US tech-heavy' },
  { symbol: 'VTI', label: 'total US market' },
  { symbol: 'IWM', label: 'US small cap' },
  { symbol: 'GLD', label: 'gold' },
  { symbol: 'TLT', label: '20y+ treasuries' },
  { symbol: 'EFA', label: 'developed intl' },
  { symbol: 'VXUS', label: 'total intl' },
];

interface PortfolioResult {
  mode: string;
  equity: number[];
  drawdown: number[];
  asset_equity: number[][];
  cagr: number;
  sharpe: number;
  max_drawdown: number;
  total_cost: number;
  error?: string;
}

type Mode = 'equal' | 'inv_vol' | 'min_var';

function readSession(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}

export default function BacktestExplorer() {
  const [selected, setSelected] = createSignal<string[]>(
    JSON.parse(readSession('bte-symbols') ?? '["SPY","GLD"]') as string[],
  );
  const [mode, setMode] = createSignal<Mode>((readSession('bte-mode') as Mode | null) ?? 'inv_vol');
  const [closes, setCloses] = createSignal<Map<string, number[]>>(new Map());
  const [w0, setW0] = createSignal(0);
  const [w1, setW1] = createSignal(0);
  const [result, setResult] = createSignal<PortfolioResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [computing, setComputing] = createSignal(false);
  const [err, setErr] = createSignal<string | null>(null);
  let fetchRun = 0;
  let computeRun = 0;

  const n = () => closes().get(selected()[0])?.length ?? 0;

  function toggle(symbol: string) {
    const cur = selected();
    if (cur.includes(symbol)) {
      if (cur.length <= 2) return; // engine floor: 2 assets
      setSelected(cur.filter((s) => s !== symbol));
    } else {
      if (cur.length >= 6) return; // engine ceiling: 6 assets
      setSelected([...cur, symbol]);
    }
    sessionStorage.setItem('bte-symbols', JSON.stringify(selected()));
    loadData();
  }

  function setModePersist(m: Mode) {
    setMode(m);
    sessionStorage.setItem('bte-mode', m);
    recompute();
  }

  async function loadData() {
    const myRun = ++fetchRun;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const syms = selected();
      const fetched = await Promise.all(
        syms.map(async (s) => {
          const res = await fetch(
            `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(s)}&range=2y&interval=1d`,
          );
          if (!res.ok) return [s, [] as number[]] as const;
          const json = await res.json();
          const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
          const cs = (quote?.close ?? []).filter((c: number | null): c is number => c != null);
          return [s, cs] as const;
        }),
      );
      if (myRun !== fetchRun) return;
      const map = new Map(fetched);
      const min = Math.min(...fetched.map((f) => f[1].length));
      if (min < MIN_WINDOW) throw new Error(`need ${MIN_WINDOW}+ overlapping closes, got ${min}`);
      // Truncate every series to the shortest so the matrix is rectangular.
      for (const [s, cs] of map) map.set(s, cs.slice(0, min));
      setCloses(map);
      // Default window: the most recent 252 closes (one trading year).
      setW0(Math.max(0, min - 252));
      setW1(min);
      recompute();
    } catch (e) {
      if (myRun !== fetchRun) return;
      setErr(e instanceof Error ? e.message : 'Failed to load price data');
      setResult(null);
    } finally {
      if (myRun === fetchRun) setLoading(false);
    }
  }

  async function recompute() {
    const myRun = ++computeRun;
    const syms = selected();
    const map = closes();
    const start = w0();
    const end = w1();
    if (syms.length < 2 || end - start < MIN_WINDOW) return;
    setComputing(true);
    try {
      const win = end - start;
      const flat = new Float64Array(syms.length * win);
      syms.forEach((s, a) => {
        const cs = map.get(s) ?? [];
        for (let d = 0; d < win; d++) flat[a * win + d] = cs[start + d] ?? 0;
      });
      const wasm = await getWasmMod();
      if (myRun !== computeRun) return; // superseded by a newer computation
      if (typeof wasm.quant_portfolio_backtest_v2 !== 'function') {
        throw new Error('stale WASM bundle: quant_portfolio_backtest_v2 missing');
      }
      const out: PortfolioResult = JSON.parse(
        wasm.quant_portfolio_backtest_v2(flat, syms.length, win, mode(), 20, 2.0),
      );
      if (out.error) throw new Error(out.error);
      if (!Array.isArray(out.equity) || out.equity.length < 2) {
        throw new Error('bad result shape: equity missing');
      }
      if (myRun !== computeRun) return;
      setChartMetaState('backtest-explorer', {
        fallback: false,
        error: null,
        freshAt: Date.now(),
      });
      setResult(out);
    } catch (e) {
      if (myRun !== computeRun) return;
      console.error('[BacktestExplorer]', e);
      setErr(e instanceof Error ? e.message : 'Computation failed');
      setResult(null);
    } finally {
      if (myRun === computeRun) setComputing(false);
    }
  }

  function onWindowChange(which: 'start' | 'end', raw: number) {
    const total = n();
    if (total < MIN_WINDOW + 1) return;
    if (which === 'start') {
      const v = Math.min(Math.max(0, raw), total - MIN_WINDOW);
      setW0(v);
      if (w1() - v < MIN_WINDOW) setW1(Math.min(total, v + MIN_WINDOW));
    } else {
      const v = Math.min(Math.max(MIN_WINDOW, raw), total);
      setW1(v);
      if (v - w0() < MIN_WINDOW) setW0(Math.max(0, v - MIN_WINDOW));
    }
    recompute();
  }

  function renderChart() {
    const r = result();
    if (!r) return;
    try {
      const toSeries = (vals: number[], offset: number) =>
        vals.map((v, i) => ({ time: i + offset, open: 0, high: 0, low: 0, close: v, volume: 0 }));
      const series = [
        { color: 'var(--accent, #c9a86c)', data: toSeries(r.equity, w0()) },
        ...(Array.isArray(r.asset_equity) ? r.asset_equity : []).map((eq, i) => ({
          color: SERIES_COLORS[(i + 1) % SERIES_COLORS.length],
          data: toSeries(eq, w0()),
        })),
      ];
      renderPlychart('backtest-explorer', 'update_line', JSON.stringify(series), '');
    } catch (e) {
      console.error('[BacktestExplorer] render failed', e);
    }
  }

  createEffect(() => {
    result();
    renderChart();
  });
  usePlychartAuto(() => 'backtest-explorer', renderChart);

  onMount(() => {
    attachChartMeta('backtest-explorer', {
      source: 'Yahoo Finance',
      detail: '2y daily closes',
    });
    setChartLabels('backtest-explorer', { yUnit: 'equity (x initial)' });
    loadData();
  });

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
    a.download = `backtest-${selected().join('-')}-${mode()}-${w0()}-${w1()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const r = () => result();
  const windowDays = () => w1() - w0();

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          BACKTEST WINDOW EXPLORER
        </p>
        <Show when={!loading() && r()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {selected().length} assets | {windowDays()}d window | rebalance 20d | {r()!.mode}
          </span>
        </Show>
      </div>

      {/* Basket picker */}
      <fieldset class="flex gap-2 mb-4 flex-wrap" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend class="sr-only">Basket symbols</legend>
        <For each={UNIVERSE}>
          {(u) => (
            <button
              type="button"
              class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
              title={u.label}
              aria-pressed={selected().includes(u.symbol)}
              style={{
                'border-color': selected().includes(u.symbol) ? 'var(--accent)' : 'var(--border)',
                color: selected().includes(u.symbol)
                  ? 'var(--bg-primary)'
                  : 'var(--text-secondary)',
                background: selected().includes(u.symbol) ? 'var(--accent)' : 'var(--bg-secondary)',
              }}
              onClick={() => toggle(u.symbol)}
            >
              {u.symbol}
            </button>
          )}
        </For>
      </fieldset>

      {/* Mode */}
      <div class="flex gap-2 mb-4 items-center flex-wrap">
        <For each={['equal', 'inv_vol', 'min_var'] as Mode[]}>
          {(m) => (
            <button
              type="button"
              class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
              aria-pressed={mode() === m}
              style={{
                'border-color': mode() === m ? 'var(--accent)' : 'var(--border)',
                color: mode() === m ? 'var(--bg-primary)' : 'var(--accent)',
                background: mode() === m ? 'var(--accent)' : 'var(--bg-secondary)',
              }}
              onClick={() => setModePersist(m)}
            >
              {m === 'equal' ? 'EQUAL WEIGHT' : m === 'inv_vol' ? 'INVERSE VOL' : 'MIN VARIANCE'}
            </button>
          )}
        </For>
      </div>

      {/* Window drag */}
      <Show when={!loading() && n() > MIN_WINDOW}>
        <div class="mb-4 space-y-2">
          <div class="flex items-center gap-3">
            <label
              for="bte-window-start"
              class="font-mono text-[10px]"
              style={{ color: 'var(--text-secondary)', 'min-width': '110px' }}
            >
              WINDOW START
            </label>
            <input
              id="bte-window-start"
              type="range"
              min="0"
              max={n()}
              value={w0()}
              class="flex-1"
              aria-label="Backtest window start day"
              onInput={(e) => onWindowChange('start', Number(e.currentTarget.value))}
            />
            <span
              class="font-mono text-[10px] tabular-nums"
              style={{ color: 'var(--accent)', 'min-width': '48px', 'text-align': 'right' }}
            >
              {w0()}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <label
              for="bte-window-end"
              class="font-mono text-[10px]"
              style={{ color: 'var(--text-secondary)', 'min-width': '110px' }}
            >
              WINDOW END
            </label>
            <input
              id="bte-window-end"
              type="range"
              min="0"
              max={n()}
              value={w1()}
              class="flex-1"
              aria-label="Backtest window end day"
              onInput={(e) => onWindowChange('end', Number(e.currentTarget.value))}
            />
            <span
              class="font-mono text-[10px] tabular-nums"
              style={{ color: 'var(--accent)', 'min-width': '48px', 'text-align': 'right' }}
            >
              {w1()}
            </span>
          </div>
        </div>
      </Show>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Fetching 2y of daily closes...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <div style={{ position: 'relative' }}>
        <Show when={computing()}>
          <p
            class="font-mono text-[10px]"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              'z-index': 2,
              color: 'var(--accent)',
            }}
          >
            computing...
          </p>
        </Show>
        <canvas
          id="backtest-explorer"
          class="w-full"
          style={{ height: `${H}px` }}
          aria-label="Portfolio equity curve for the selected basket and window, computed live in your browser"
        />
      </div>

      {/* Stats */}
      <Show when={r()}>
        {(res) => (
          <div
            class="grid grid-cols-2 md:grid-cols-5 gap-px mt-3"
            style={{ background: 'var(--border)' }}
          >
            <For
              each={[
                { k: 'CAGR', v: `${((res().cagr || 0) * 100).toFixed(1)}%` },
                { k: 'SHARPE', v: (res().sharpe ?? 0).toFixed(2) },
                { k: 'MAX DRAWDOWN', v: `${((res().max_drawdown || 0) * 100).toFixed(1)}%` },
                {
                  k: 'TOTAL RETURN',
                  v: `${(((res().equity?.slice(-1)[0] ?? 1) - 1) * 100).toFixed(1)}%`,
                },
                { k: 'COST DRAG', v: `${((res().total_cost || 0) * 100).toFixed(2)}%` },
              ]}
            >
              {(s) => (
                <div class="p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                    {s.k}
                  </p>
                  <p
                    class="font-mono text-base font-bold tabular-nums"
                    style={{ color: 'var(--accent)' }}
                  >
                    {s.v}
                  </p>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>

      <div class="flex gap-2 mt-3">
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
          style={{ 'border-color': 'var(--border)', color: 'var(--text-secondary)' }}
          onClick={() => exportCsv()}
        >
          EXPORT CSV
        </button>
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1.5 border cursor-pointer"
          style={{ 'border-color': 'var(--border)', color: 'var(--text-secondary)' }}
          onClick={() => loadData()}
        >
          REFETCH PRICES
        </button>
      </div>

      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Real daily closes via the site's stock-chart proxy | engine: quant_portfolio_backtest_v2
        (WASM, in-browser) | 20d rebalance, 2bp cost model
      </p>
    </div>
  );
}

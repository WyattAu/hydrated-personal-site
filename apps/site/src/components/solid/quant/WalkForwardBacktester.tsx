import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import { getWasmMod } from '../../../lib/wasm-loader';

const H = 300;

interface WindowParam {
  start: number;
  end: number;
  fast: number;
  slow: number;
  is_sharpe: number;
}

interface BacktestResult {
  equity: number[];
  buyhold: number[];
  drawdown: number[];
  windows: WindowParam[];
  cagr: number;
  sharpe: number;
  sortino: number;
  max_drawdown: number;
  win_rate: number;
  trades_per_year: number;
  bh_cagr: number;
  bh_max_drawdown: number;
  error?: string;
}

const FASTS = [5, 10, 20];
const SLOWS = [20, 50, 100, 150, 200];

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export default function WalkForwardBacktester() {
  const [result, setResult] = createSignal<BacktestResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  const [isWindow, setIsWindow] = createSignal(120);
  const [oosWindow, setOosWindow] = createSignal(40);
  const [slippageBps, setSlippageBps] = createSignal(5);
  const [commissionBps, setCommissionBps] = createSignal(5);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const symbol = activeAsset();
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=2y&interval=1d`,
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < isWindow() + oosWindow() + 2) {
        throw new Error(`need ${isWindow() + oosWindow() + 2}+ closes, got ${closes.length}`);
      }

      const wasm = await getWasmMod();
      const out: BacktestResult = JSON.parse(
        wasm.quant_backtest(
          new Float64Array(closes),
          new Uint32Array(FASTS),
          new Uint32Array(SLOWS),
          isWindow(),
          oosWindow(),
          slippageBps(),
          commissionBps(),
        ),
      );
      if (out.error) throw new Error(out.error);
      setResult(out);
    } catch (e) {
      console.error('[WalkForwardBacktester]', e);
      setErr(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const r = result();
    if (!r) return;
    const toSeries = (vals: number[], time0: number) =>
      vals.map((v, i) => ({ time: i, open: 0, high: 0, low: 0, close: v, volume: 0 }));
    renderPlychart(
      'wf-backtest',
      'update_line',
      JSON.stringify([
        { color: '#00e5ff', data: toSeries(r.equity, 0) },
        { color: '#666666', data: toSeries(r.buyhold, 0) },
      ]),
      '',
    );
  }

  createEffect(() => {
    result();
    renderChart();
  });

  usePlychartAuto(() => 'wf-backtest', renderChart);

  onMount(() => loadData());
  onAssetChanged(() => loadData());

  const r = () => result();

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          WALK-FORWARD BACKTEST: {activeAsset()}
        </p>
        <Show when={!loading() && r()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {r()!.windows.length} windows | SMA {FASTS[0]}-{SLOWS[SLOWS.length - 1]} grid
          </span>
        </Show>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <label class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          IS WINDOW: {isWindow()}d
          <input
            type="range"
            min="60"
            max="252"
            step="10"
            value={isWindow()}
            onInput={(e) => setIsWindow(Number(e.currentTarget.value))}
            class="w-full mt-1"
          />
        </label>
        <label class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          OOS WINDOW: {oosWindow()}d
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={oosWindow()}
            onInput={(e) => setOosWindow(Number(e.currentTarget.value))}
            class="w-full mt-1"
          />
        </label>
        <label class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          SLIPPAGE: {slippageBps()}bps
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={slippageBps()}
            onInput={(e) => setSlippageBps(Number(e.currentTarget.value))}
            class="w-full mt-1"
          />
        </label>
        <label class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          COMMISSION: {commissionBps()}bps
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={commissionBps()}
            onInput={(e) => setCommissionBps(Number(e.currentTarget.value))}
            class="w-full mt-1"
          />
        </label>
      </div>

      <button
        type="button"
        class="font-mono text-[10px] px-3 py-1.5 border mb-3 cursor-pointer"
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
        RUN BACKTEST
      </button>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Running walk-forward...
        </p>
      </Show>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <Show when={!loading() && r()}>
        <canvas id="wf-backtest" class="w-full" style={{ height: `${H}px` }} />
        <div class="grid grid-cols-4 md:grid-cols-8 gap-2 mt-3">
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
              SORTINO
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {(r()?.sortino ?? 0).toFixed(2)}
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
              WIN RATE
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {pct(r()?.win_rate ?? 0)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              TRADES/YR
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {(r()?.trades_per_year ?? 0).toFixed(1)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              BH CAGR
            </p>
            <p
              class="font-mono text-sm font-bold"
              style={{ color: (r()?.bh_cagr ?? 0) >= 0 ? '#4caf50' : '#ff5252' }}
            >
              {pct(r()?.bh_cagr ?? 0)}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              BH MAX DD
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: '#ff5252' }}>
              {pct(r()?.bh_max_drawdown ?? 0)}
            </p>
          </div>
        </div>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: '#00e5ff' }}>-</span> strategy (net of{' '}
          {slippageBps() + commissionBps()}bps/flip) vs <span style={{ color: '#666' }}>-</span>{' '}
          buy-and-hold | params fit on trailing {isWindow()}d, traded {oosWindow()}d ahead | no
          look-ahead
        </p>
      </Show>
    </div>
  );
}

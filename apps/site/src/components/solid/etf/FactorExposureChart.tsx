import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { activeTicker } from '../../../lib/etf-store';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { getWasmMod } from '../../../lib/wasm-loader';

interface ChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close: Array<number | null> }> };
    }>;
  };
  error?: unknown;
}

interface RegResult {
  alpha: number;
  betas: number[];
  r_squared: number;
  adj_r_squared: number;
  f_statistic: number;
  t_stats: number[];
}

interface WindowPoint {
  ts: number;
  beta: number;
  alpha: number;
  r2: number;
  t: number;
}

const WINDOW = 90;
const STEP = 30;

export default function FactorExposureChart() {
  const [windows, setWindows] = createSignal<WindowPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function fetchCloses(symbol: string): Promise<{ ts: number[]; close: number[] }> {
    const res = await fetch(
      `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=3y&interval=1d`,
    );
    if (!res.ok) throw new Error(`${symbol} HTTP ${res.status}`);
    const json: ChartResponse = await res.json();
    if (json.error) throw new Error(`${symbol} error`);
    const result = json.chart?.result?.[0];
    const ts = result?.timestamp ?? [];
    const rawClose = result?.indicators?.quote?.[0]?.close ?? [];
    const paired: { ts: number; close: number }[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = rawClose[i];
      if (c != null && Number.isFinite(c)) paired.push({ ts: ts[i], close: c });
    }
    if (paired.length < WINDOW + 5) throw new Error(`${symbol} insufficient history`);
    return { ts: paired.map((p) => p.ts), close: paired.map((p) => p.close) };
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const ticker = activeTicker();
      const [etf, mkt] = await Promise.all([fetchCloses(ticker), fetchCloses('^GSPC')]);

      // Align on shared timestamps
      const mktMap = new Map<number, number>();
      for (let i = 0; i < mkt.ts.length; i++) mktMap.set(mkt.ts[i], mkt.close[i]);
      const tsShared: number[] = [];
      const etfCloses: number[] = [];
      const mktCloses: number[] = [];
      for (let i = 0; i < etf.ts.length; i++) {
        const m = mktMap.get(etf.ts[i]);
        if (m != null) {
          tsShared.push(etf.ts[i]);
          etfCloses.push(etf.close[i]);
          mktCloses.push(m);
        }
      }
      if (tsShared.length < WINDOW + 5) throw new Error('insufficient overlapping history');

      // Log returns
      const retTs: number[] = [];
      const etfRets: number[] = [];
      const mktRets: number[] = [];
      for (let i = 1; i < tsShared.length; i++) {
        etfRets.push(Math.log(etfCloses[i] / etfCloses[i - 1]));
        mktRets.push(Math.log(mktCloses[i] / mktCloses[i - 1]));
        retTs.push(tsShared[i]);
      }

      const sharedWasm = await getWasmMod();

      const pts: WindowPoint[] = [];
      const nObs = etfRets.length;
      for (let off = 0; off + WINDOW <= nObs; off += STEP) {
        const yWin = Float64Array.from(etfRets.slice(off, off + WINDOW));
        const xWin = Float64Array.from(mktRets.slice(off, off + WINDOW));
        const out = sharedWasm.quant_factor_regression(yWin, xWin, 1, WINDOW);
        const r = JSON.parse(out) as RegResult;
        if (typeof r.alpha !== 'number' || !Array.isArray(r.betas)) continue;
        pts.push({
          ts: retTs[off + WINDOW - 1],
          beta: r.betas[0] ?? 0,
          alpha: r.alpha,
          r2: r.r_squared ?? 0,
          t: r.t_stats?.[0] ?? 0,
        });
      }
      if (pts.length < 2) throw new Error('regression failed');
      setWindows(pts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setWindows([]);
    } finally {
      setLoading(false);
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const pts = windows();
    if (pts.length < 2) return;

    const toCandle = (v: number, t: number) => ({
      time: t,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    });

    // Map each factor/metric to a series. Original single-market regression yields beta & alpha;
    // derive 4 series for Market/SMB/HML/Momentum palette (remaining two use r² and t-stat scaled).
    const marketData = pts.map((p, i) => toCandle(p.beta, i));
    const alphaData = pts.map((p, i) => toCandle(p.alpha * 100, i));
    const smbData = pts.map((p, i) => toCandle(p.r2, i));
    const hmlData = pts.map((p, i) => toCandle(p.t / 10, i));

    const series = [
      { color: 'var(--accent, #00e5ff)', data: marketData },
      { color: '#ff6b35', data: alphaData },
      { color: '#7c4dff', data: smbData },
      { color: '#69f0ae', data: hmlData },
    ];
    tipData = marketData;

    renderPlychart('factor-exposure', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    windows();
    renderChart();
  });

  usePlychartAuto(() => 'factor-exposure', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('factor-exposure', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });
  createEffect(() => {
    activeTicker();
    loadData();
  });

  const last = () => windows()[windows().length - 1];

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        FACTOR EXPOSURE (MARKET)
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading factor regression for {activeTicker()}...
        </p>
      </Show>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas id="factor-exposure" class="w-full" style={{ height: '280px' }} />
      <Show when={!loading() && last()}>
        {(p) => (
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <Factor label="α (ANN.)" value={`${(p().alpha * 252 * 100).toFixed(2)}%`} />
            <Factor label="β (MARKET)" value={p().beta.toFixed(3)} accent />
            <Factor label="R²" value={p().r2.toFixed(3)} />
            <Factor label="β t-STAT" value={p().t.toFixed(2)} />
          </div>
        )}
      </Show>
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Rolling 90-day OLS | Fama-French Market Factor | t-stat tests significance
      </p>
    </div>
  );
}

function Factor(props: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      class="p-2 border"
      style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
    >
      <p
        class="font-mono text-[9px] uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        {props.label}
      </p>
      <p
        class="font-mono text-sm font-bold"
        style={{ color: props.accent ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {props.value}
      </p>
    </div>
  );
}

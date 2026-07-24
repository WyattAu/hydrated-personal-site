import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { activeTicker } from '../../../lib/etf-store';
import { getThemeColors } from '../../../lib/theme-colors';
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
  let canvasRef: HTMLCanvasElement | undefined;

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

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;
    const pts = windows();
    if (pts.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 280;
    const colors = getThemeColors();
    const pad = { l: 44, r: 44, t: 18, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    // Y range covers beta (with ref line at 1) and alpha*100
    const betas = pts.map((p) => p.beta);
    const alphas = pts.map((p) => p.alpha * 100);
    const yMaxRaw = Math.max(1.05, ...betas, ...alphas);
    const yMinRaw = Math.min(0.95, ...betas, ...alphas);
    const range = yMaxRaw - yMinRaw || 1;
    const yLo = yMinRaw - range * 0.1;
    const yHi = yMaxRaw + range * 0.1;
    const yRange = yHi - yLo || 1;

    const toX = (i: number) => pad.l + (i / (pts.length - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - yLo) / yRange) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.fillText((yHi - (yRange * i) / 4).toFixed(2), pad.l - 4, y);
    }

    // Beta = 1.0 reference line
    const y1 = toY(1.0);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, y1);
    ctx.lineTo(w - pad.r, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.45)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('β=1.0', w - pad.r + 4, y1);

    // Confidence band around beta (width ∝ 1 - r_squared)
    const bandK = 0.6;
    ctx.fillStyle = `${colors.accent || '#00e5ff'}1a`;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const half = (1 - Math.max(0, Math.min(1, p.r2))) * bandK;
      const x = toX(i);
      const y = toY(p.beta + half);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      const half = (1 - Math.max(0, Math.min(1, p.r2))) * bandK;
      ctx.lineTo(toX(i), toY(p.beta - half));
    }
    ctx.closePath();
    ctx.fill();

    // Alpha (×100) line
    ctx.strokeStyle = colors.accentWarm || '#ff6b35';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p.alpha * 100);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Beta line
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p.beta);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X labels (first / mid / last dates)
    const fmt = (ts: number) => {
      const d = new Date(ts * 1000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 5))) {
      ctx.fillText(fmt(pts[i].ts), toX(i), pad.t + cH + 4);
    }

    // Legend (top-left)
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.fillRect(pad.l, 6, 10, 2);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
    ctx.fillText('β (market)', pad.l + 14, 8);
    ctx.fillStyle = colors.accentWarm || '#ff6b35';
    ctx.fillRect(pad.l + 90, 6, 10, 2);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
    ctx.fillText('α ×100', pad.l + 104, 8);
  }

  onMount(() => loadData());
  createEffect(() => {
    activeTicker();
    loadData();
  });
  createEffect(() => {
    const v = windows();
    if (v.length > 0) draw();
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
      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
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

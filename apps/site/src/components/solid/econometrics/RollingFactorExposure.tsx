import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getThemeColors } from '../../../lib/theme-colors';
import { getWasmMod } from '../../../lib/wasm-loader';

interface RegressionResult {
  alpha: number;
  betas: number[];
  r_squared: number;
  adj_r_squared: number;
  f_statistic: number;
  t_stats: number[];
}

interface WindowPoint {
  idx: number;
  beta: number;
  alpha: number;
  r_squared: number;
  t_stat: number;
}

async function fetchReturns(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

export default function RollingFactorExposure() {
  const [data, setData] = createSignal<WindowPoint[]>([]);
  const [latest, setLatest] = createSignal<WindowPoint | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const asset = activeAsset();
      const [assetRets, marketRets] = await Promise.all([
        fetchReturns(asset, '3y'),
        fetchReturns('^GSPC', '3y'),
      ]);
      const len = Math.min(assetRets.length, marketRets.length);
      if (len < 80) throw new Error('Insufficient data');

      const wasmMod = await getWasmMod();

      const windowLen = 60;
      const step = 20;
      const points: WindowPoint[] = [];
      for (let s = 0; s + windowLen <= len; s += step) {
        const y = new Float64Array(windowLen);
        const x = new Float64Array(windowLen);
        for (let k = 0; k < windowLen; k++) {
          y[k] = assetRets[s + k];
          x[k] = marketRets[s + k];
        }
        const json = wasmMod.quant_factor_regression(y, x, 1, windowLen);
        const raw = JSON.parse(json) as RegressionResult;
        points.push({
          idx: s,
          beta: raw.betas?.[0] ?? 0,
          alpha: raw.alpha ?? 0,
          r_squared: raw.r_squared ?? 0,
          t_stat: raw.t_stats?.[0] ?? 0,
        });
      }
      if (points.length === 0) throw new Error('Insufficient windows');
      setData(points);
      setLatest(points[points.length - 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || data().length === 0) return;
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
    const pad = { l: 50, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pts = data();
    const n = pts.length;
    if (n < 2) return;
    const betas = pts.map((p) => p.beta);
    const minB = Math.min(0, Math.min(...betas));
    const maxB = Math.max(2, Math.max(...betas));
    const range = maxB - minB || 1;
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minB) / range) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxB - (range * i) / 4).toFixed(2)}`, pad.l - 5, y + 3);
    }

    // Confidence band where r_squared > 0.3
    ctx.fillStyle = `${colors.accent || '#00e5ff'}22`;
    for (let i = 0; i < n; i++) {
      if (pts[i].r_squared > 0.3) {
        const bandH = 0.15;
        const yTop = toY(pts[i].beta + bandH);
        const yBot = toY(pts[i].beta - bandH);
        const xL = i === 0 ? toX(i) : toX(i - 1);
        const xR = toX(i);
        ctx.fillRect(xL, yTop, xR - xL, yBot - yTop);
      }
    }

    // Beta=1 reference line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, toY(1));
    ctx.lineTo(w - pad.r, toY(1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('β=1.0', w - pad.r - 30, toY(1) - 3);

    // Rolling beta line
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => {
      i === 0 ? ctx.moveTo(toX(i), toY(p.beta)) : ctx.lineTo(toX(i), toY(p.beta));
    });
    ctx.stroke();

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.fillRect(pad.l + 10, h - 14, 8, 8);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.fillText('ROLLING β (60d)', pad.l + 22, h - 7);
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  createEffect(() => {
    data();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          ROLLING FACTOR EXPOSURE (β vs ^GSPC)
        </p>
        <Show when={!loading() && data().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 3Y | 60d window / 20d step
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing rolling beta...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />

      <Show when={!loading() && latest()} keyed>
        {(l) => (
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Alpha (daily)
              </p>
              <p
                class="font-mono text-base font-bold"
                style={{ color: l.alpha >= 0 ? '#4caf50' : '#ff5252' }}
              >
                {`${(l.alpha * 10000).toFixed(2)}bps`}
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Market Beta
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {l.beta.toFixed(3)}
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                R²
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {l.r_squared.toFixed(3)}
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                t-stat (β)
              </p>
              <p
                class="font-mono text-base font-bold"
                style={{ color: Math.abs(l.t_stat) > 2 ? '#4caf50' : 'var(--accent-warm)' }}
              >
                {l.t_stat.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

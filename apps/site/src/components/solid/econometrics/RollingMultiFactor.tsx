import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { activeAsset } from '../../../lib/asset-store';
import { getThemeColors } from '../../../lib/theme-colors';
import { getWasmMod } from '../../../lib/wasm-loader';

interface BetaPoint {
  idx: number;
  mkt: number;
  size: number;
  value: number;
}

async function fetchReturns(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
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

export default function RollingMultiFactor() {
  const [series, setSeries] = createSignal<BetaPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const asset = activeAsset();
      const [assetRets, mktRets, sizeRets, valueRets] = await Promise.all([
        fetchReturns(asset, '3y'),
        fetchReturns('^GSPC', '3y'),
        fetchReturns('IWM', '3y'),
        fetchReturns('GLD', '3y'),
      ]);
      const len = Math.min(assetRets.length, mktRets.length, sizeRets.length, valueRets.length);
      if (len < 150) throw new Error('Insufficient data');

      const y = new Float64Array(len);
      const xFlat = new Float64Array(3 * len);
      for (let k = 0; k < len; k++) {
        y[k] = assetRets[k];
        xFlat[0 * len + k] = mktRets[k];
        xFlat[1 * len + k] = sizeRets[k];
        xFlat[2 * len + k] = valueRets[k];
      }

      const wasmMod = await getWasmMod();
      const out = wasmMod.quant_rolling_factor(y, xFlat, 3, 120, 30);
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed?.series) || parsed.series.length === 0) {
        throw new Error('Invalid rolling factor output');
      }

      const pts: BetaPoint[] = parsed.series.map((s: { betas?: number[] }, i: number) => ({
        idx: i,
        mkt: s.betas?.[0] ?? 0,
        size: s.betas?.[1] ?? 0,
        value: s.betas?.[2] ?? 0,
      }));
      setSeries(pts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || series().length === 0) return;
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

    const pts = series();
    const n = pts.length;
    if (n < 2) return;

    const allVals = pts.flatMap((p) => [p.mkt, p.size, p.value]);
    let minY = Math.min(0, ...allVals);
    let maxY = Math.max(0, ...allVals);
    if (minY === maxY) {
      minY -= 0.5;
      maxY += 0.5;
    }
    minY -= 0.1;
    maxY += 0.1;
    const range = maxY - minY || 1;

    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minY) / range) * cH;

    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxY - (range * i) / 4).toFixed(2)}`, pad.l - 5, y + 3);
    }

    // beta = 0 reference line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, toY(0));
    ctx.lineTo(w - pad.r, toY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    const lines: Array<{ key: keyof BetaPoint; color: string; label: string }> = [
      { key: 'mkt', color: '#42a5f5', label: 'MARKET' },
      { key: 'size', color: '#ffa726', label: 'SIZE' },
      { key: 'value', color: '#4caf50', label: 'VALUE' },
    ];

    ctx.lineWidth = 2;
    for (const line of lines) {
      ctx.strokeStyle = line.color;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const v = p[line.key];
        i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
      });
      ctx.stroke();
    }

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    let lx = pad.l + 6;
    for (const line of lines) {
      ctx.fillStyle = line.color;
      ctx.fillRect(lx, h - pad.b - 18, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.7)';
      ctx.fillText(line.label, lx + 12, h - pad.b - 11);
      lx += 70;
    }
  }

  onMount(() => loadData());

  createEffect(() => {
    activeAsset();
    loadData();
  });

  createEffect(() => {
    series();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          ROLLING 3-FACTOR EXPOSURE
        </p>
        <Show when={!loading() && series().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | {series().length} windows | 120d / 30d step
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing rolling 3-factor regression...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />

      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Market (S&amp;P 500) + Size (IWM) + Value (GLD) | 120-day window, 30-day step
      </p>
    </div>
  );
}

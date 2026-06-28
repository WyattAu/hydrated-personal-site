import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { activeTicker } from '../../../lib/etf-store';
import { getThemeColors } from '../../../lib/theme-colors';

interface MCResult {
  drift: number;
  volatility: number;
  s0: number;
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
}

interface ChartResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{ close: Array<number | null> }>;
      };
    }>;
  };
  error?: unknown;
}

export default function EtfMonteCarlo() {
  // Ticker comes from the shared store - set by EtfApp search bar
  const [result, setResult] = createSignal<MCResult | null>(null);
  const [historical, setHistorical] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock-chart?symbol=${activeTicker()}&range=1y&interval=1d`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: ChartResponse = await res.json();
      if (json.error) throw new Error('chart unavailable');
      const quote = json.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c): c is number => c != null);
      if (closes.length < 30) throw new Error('insufficient data');
      setHistorical(closes);

      if (!wasmMod) {
        const _w = '/wasm/hydrated_widgets.js?v=j30';
        wasmMod = await import(_w);
        await wasmMod.default();
        wasmMod.quant_seed(Math.random() * 1e18, Math.random() * 1e18);
      }
      const out = wasmMod.quant_montecarlo(Float64Array.from(closes), 252, 90, 1000);
      setResult(JSON.parse(out));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !result()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 320 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 320;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const r = result()!;
    const hist = historical();
    const totalPoints = hist.length + r.p50.length;
    const padLeft = 60;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 32;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const allValues = [...hist, ...r.p95, ...r.p5];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    const padding = range * 0.05;

    const toX = (i: number) => padLeft + (i / (totalPoints - 1)) * chartW;
    const toY = (v: number) =>
      padTop + (1 - (v - minVal + padding) / (range + 2 * padding)) * chartH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padTop + (chartH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      const val = maxVal + padding - ((range + 2 * padding) * i) / 5;
      ctx.fillText(formatPrice(val), padLeft - 8, y + 3);
    }

    // Historical line
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    hist.forEach((p, i) => {
      i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p));
    });
    ctx.stroke();

    const histLen = hist.length;

    // Percentile fan bands (filled areas, widest first)
    const bands: Array<[number[], number[], string]> = [
      [r.p5, r.p95, `${colors.accent || '#00e5ff'}15`],
      [r.p25, r.p75, `${colors.accent || '#00e5ff'}30`],
    ];
    for (const [lower, upper, color] of bands) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(toX(histLen - 1), toY(hist[histLen - 1]));
      for (let i = 0; i < upper.length; i++) ctx.lineTo(toX(histLen + i), toY(upper[i]));
      for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(toX(histLen + i), toY(lower[i]));
      ctx.closePath();
      ctx.fill();
    }

    // Median line (dashed)
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    r.p50.forEach((v, i) => {
      i === 0 ? ctx.moveTo(toX(histLen), toY(v)) : ctx.lineTo(toX(histLen + i), toY(v));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Divider line
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(histLen - 1), padTop);
    ctx.lineTo(toX(histLen - 1), padTop + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HISTORICAL', toX(Math.floor(histLen / 2)), h - 10);
    ctx.fillText('90d FORECAST', toX(histLen + r.p50.length / 2), h - 10);

    // Stats overlay
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`vol: ${(r.volatility * 100).toFixed(1)}%`, w - padRight - 120, padTop + 14);
    ctx.fillText(`p50: ${formatPrice(r.p50[r.p50.length - 1])}`, w - padRight - 120, padTop + 28);
    ctx.fillText(`p5:  ${formatPrice(r.p5[r.p5.length - 1])}`, w - padRight - 120, padTop + 42);
  }

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    activeTicker();
    loadData();
  });

  createEffect(() => {
    const v = result();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        MONTE CARLO FORECAST: {activeTicker()}
      </p>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '320px' }} />
      <Show when={result()} keyed>
        {(mc) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            {activeTicker()} | 1000 GBM paths | annualized vol {(mc.volatility * 100).toFixed(1)}% |
            drift {(mc.drift * 100).toFixed(1)}%
          </p>
        )}
      </Show>
    </div>
  );
}

function formatPrice(v: number): string {
  if (v >= 10000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

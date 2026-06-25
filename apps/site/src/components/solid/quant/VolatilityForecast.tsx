import { Show, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

interface GarchResult {
  omega: number;
  alpha: number;
  beta: number;
  long_run_var: number;
  conditional_vars: number[];
  forecast: number[];
  ewma_vol: number[];
  realized_vol: number[];
}

export default function VolatilityForecast(props: { symbol?: string }) {
  const symbol = () => props.symbol || 'BTCUSDT';
  const [data, setData] = createSignal<GarchResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: WASM dynamic import returns untyped module
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/binance-klines?symbol=${symbol()}&interval=1d&limit=365`);
      if (!res.ok) return;
      const _raw = await res.json();
      const klines = _raw.data || _raw;
      const closes: number[] = klines.map((k: (string | number)[]) =>
        Number.parseFloat(k[4] as string),
      );
      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      if (!wasmMod) {
        const _w = '/wasm/hydrated_widgets.js';
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const json = wasmMod.quant_garch(returns, 30);
      setData(JSON.parse(json));
    } catch {
      /* skip */
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !data()) return;
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
    const d = data()!;

    const histVol = d.conditional_vars.map((v) => Math.sqrt(Math.max(0, v)) * Math.sqrt(252) * 100);
    const ewmaVol = d.ewma_vol.map((v) => v * Math.sqrt(252) * 100);
    const fcVol = d.forecast.map((v) => Math.sqrt(Math.max(0, v)) * Math.sqrt(252) * 100);

    const allVol = [...histVol, ...ewmaVol, ...fcVol];
    const minV = Math.min(...allVol) * 0.9;
    const maxV = Math.max(...allVol) * 1.1;
    const totalLen = histVol.length + fcVol.length;

    const toX = (i: number) => pad.l + (i / (totalLen - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxV - ((maxV - minV) * i) / 4).toFixed(0)}%`, pad.l - 5, y + 3);
    }

    // GARCH conditional vol
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    histVol.forEach((v, i) => {
      i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();

    // EWMA vol
    ctx.strokeStyle = '#7c4dff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ewmaVol.forEach((v, i) => {
      i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();

    // GARCH forecast (dashed)
    ctx.strokeStyle = colors.accentWarm || '#f0883e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    fcVol.forEach((v, i) => {
      i === 0
        ? ctx.moveTo(toX(histVol.length), toY(histVol[histVol.length - 1]))
        : ctx.lineTo(toX(histVol.length + i), toY(v));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Divider
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.15)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(histVol.length - 1), pad.t);
    ctx.lineTo(toX(histVol.length - 1), pad.t + cH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend = [
      ['GARCH(1,1)', colors.accent || '#00e5ff'],
      ['EWMA', '#7c4dff'],
      ['FORECAST', colors.accentWarm || '#f0883e'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 10 + i * 90;
      ctx.fillStyle = color;
      ctx.fillRect(x, h - 14, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, h - 7);
    });
  }

  onMount(() => {
    loadData();
  });
  const d = data();
  if (d) setTimeout(draw, 10);

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        GARCH(1,1) VOLATILITY FORECAST
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing...
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
      <Show when={d}>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          {symbol()} | alpha={d?.alpha.toFixed(3)} beta={d?.beta.toFixed(3)} | long-run vol=
          {(Math.sqrt(d?.long_run_var ?? 0) * Math.sqrt(252) * 100).toFixed(1)}%
        </p>
      </Show>
    </div>
  );
}

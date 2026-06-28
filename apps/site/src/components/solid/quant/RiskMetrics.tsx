import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

interface VarResult {
  var_historical: number;
  es_historical: number;
  var_parametric: number;
  es_parametric: number;
  histogram_edges: number[];
  histogram_counts: number[];
}

export default function RiskMetrics(props: { symbol?: string }) {
  const symbol = () => props.symbol || 'BTCUSDT';
  const [data, setData] = createSignal<VarResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: WASM dynamic import returns untyped module
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/binance-klines?symbol=${symbol()}&interval=1d&limit=365`);
      if (!res.ok) return;
      const klines = await res.json();
      const closes: number[] = klines.map((k: (string | number)[]) =>
        Number.parseFloat(k[4] as string),
      );
      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      if (!wasmMod) {
        const _w = '/wasm-v2/hydrated_widgets.js';
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const json = wasmMod.quant_var(returns, 0.05);
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
    canvas.height = 260 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 260;
    const colors = getThemeColors();
    const pad = { l: 50, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);
    const d = data()!;
    const edges = d.histogram_edges;
    const counts = d.histogram_counts;
    if (edges.length < 2) return;

    const maxCount = Math.max(...counts) || 1;
    const minRet = edges[0];
    const maxRet = edges[edges.length - 1];
    const range = maxRet - minRet || 1;
    const barW = cW / counts.length;

    const toX = (v: number) => pad.l + ((v - minRet) / range) * cW;
    const toH = (c: number) => (c / maxCount) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    }

    // Histogram bars
    counts.forEach((c, i) => {
      const x = pad.l + i * barW;
      const barH = toH(c);
      const isTail = edges[i] <= d!.var_historical;
      ctx.fillStyle = isTail
        ? `${colors.accentWarm || '#f0883e'}80`
        : `${colors.accent || '#00e5ff'}40`;
      ctx.fillRect(x + 1, pad.t + cH - barH, barW - 2, barH);
    });

    // VaR line
    const varX = toX(d!.var_historical);
    ctx.strokeStyle = colors.accentWarm || '#f0883e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(varX, pad.t);
    ctx.lineTo(varX, pad.t + cH);
    ctx.stroke();
    ctx.fillStyle = colors.accentWarm || '#f0883e';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`VaR(95%) ${(d!.var_historical * 100).toFixed(2)}%`, varX + 4, pad.t + 12);

    // ES line
    const esX = toX(d!.es_historical);
    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(esX, pad.t);
    ctx.lineTo(esX, pad.t + cH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff4081';
    ctx.fillText(`ES(95%) ${(d!.es_historical * 100).toFixed(2)}%`, esX + 4, pad.t + 26);

    // X axis
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const val = minRet + (range * i) / 5;
      ctx.fillText(`${(val * 100).toFixed(1)}%`, pad.l + (cW * i) / 5, h - 8);
    }
  }

  onMount(() => {
    loadData();
  });
  const d = data();

  createEffect(() => {
    const v = data();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        VALUE AT RISK
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing...
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '260px' }} />
      <Show when={d}>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          {symbol()} 1d returns | VaR(95%): {((d?.var_historical ?? 0) * 100).toFixed(2)}% |
          ES(95%): {((d?.es_historical ?? 0) * 100).toFixed(2)}% | Parametric VaR:{' '}
          {((d?.var_parametric ?? 0) * 100).toFixed(2)}%
        </p>
      </Show>
    </div>
  );
}

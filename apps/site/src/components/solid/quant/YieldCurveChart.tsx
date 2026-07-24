import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';

interface YieldResult {
  beta0: number;
  beta1: number;
  beta2: number;
  lambda: number;
  fitted: number[];
  spread_10y_3m: number;
  recession_probability: number;
}

interface YieldPoint {
  label: string;
  maturity: number;
  yield: number;
}

export default function YieldCurveChart() {
  const [data, setData] = createSignal<YieldResult | null>(null);
  const [raw, setRaw] = createSignal<YieldPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/treasury-yields`);
      if (!res.ok) throw new Error('API');
      const yields = await res.json();
      if (!Array.isArray(yields) || yields.length < 3) throw new Error('insufficient');
      setRaw(yields);

      const maturities = new Float64Array(yields.map((y: YieldPoint) => y.maturity));
      const yieldVals = new Float64Array(yields.map((y: YieldPoint) => y.yield));

      if (!wasmMod) {
        const _w = '/wasm/hydrated_widgets.js?v=j30';
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const json = wasmMod.quant_yield_curve(maturities, yieldVals);
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
    const pad = { l: 50, r: 16, t: 16, b: 32 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const d = data()!;
    const yields = raw();
    const allY = [...yields.map((y) => y.yield), ...d.fitted];
    const minY = Math.min(...allY) - 0.2;
    const maxY = Math.max(...allY) + 0.2;
    const minM = 0.05;
    const maxM = 30.0;

    const toX = (m: number) =>
      pad.l + ((Math.log(m) - Math.log(minM)) / (Math.log(maxM) - Math.log(minM))) * cW;
    const toY = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY)) * cH;

    // Background: recession warning if inverted
    if (d.spread_10y_3m < 0) {
      ctx.fillStyle = `${colors.accentWarm || '#f0883e'}08`;
      ctx.fillRect(pad.l, pad.t, cW, cH);
    }

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
      ctx.fillText(`${(maxY - ((maxY - minY) * i) / 4).toFixed(1)}%`, pad.l - 5, y + 3);
    }

    // Nelson-Siegel fitted curve
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const m = minM * (maxM / minM) ** (i / steps);
      const _fit = d.beta0; // simplified - just use beta0 as level
      // Actually evaluate NS: beta0 + beta1*f1 + beta2*f2
      const x = m / d.lambda;
      const f1 = x < 1e-10 ? 1 : (1 - Math.exp(-x)) / x;
      const f2 = f1 - Math.exp(-m / d.lambda);
      const y = d.beta0 + d.beta1 * f1 + d.beta2 * f2;
      i === 0 ? ctx.moveTo(toX(m), toY(y)) : ctx.lineTo(toX(m), toY(y));
    }
    ctx.stroke();

    // Raw yield dots
    ctx.fillStyle = colors.accent || '#00e5ff';
    yields.forEach((y) => {
      ctx.beginPath();
      ctx.arc(toX(y.maturity), toY(y.yield), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // X axis labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    const xLabels: Array<[string, number]> = [
      ['1M', 0.083],
      ['6M', 0.5],
      ['2Y', 2],
      ['5Y', 5],
      ['10Y', 10],
      ['30Y', 30],
    ];
    xLabels.forEach(([label, m]) => ctx.fillText(label, toX(m), h - 12));

    // Recession probability badge
    const prob = d.recession_probability;
    ctx.fillStyle = prob > 0.5 ? colors.accentWarm || '#f0883e' : '#4caf50';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`RECESSION RISK: ${(prob * 100).toFixed(0)}%`, w - pad.r - 5, pad.t + 14);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`spread 10Y-3M: ${d.spread_10y_3m.toFixed(2)}%`, w - pad.r - 5, pad.t + 28);
  }

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    const v = data();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        YIELD CURVE (NELSON-SIEGEL)
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading FRED Treasury data...
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
      <Show when={data()} keyed>
        {(d) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            FRED DGS1MO-DGS30 | NS fit: b0={d.beta0.toFixed(2)} b1={d.beta1.toFixed(2)} b2=
            {d.beta2.toFixed(2)} lam={d.lambda.toFixed(1)}
          </p>
        )}
      </Show>
    </div>
  );
}

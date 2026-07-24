import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';
import { getWasmMod } from '../../../lib/wasm-loader';

interface ForwardResult {
  maturities: number[];
  spot_rates: number[];
  forward_rates: number[];
  params: Record<string, number>;
}

export default function ForwardRateCurve() {
  const [result, setResult] = createSignal<ForwardResult | null>(null);
  const [source, setSource] = createSignal<string>('FRED');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/treasury-yields`);
      if (!res.ok) throw new Error('Treasury API unavailable');
      const json = await res.json();

      let maturities: number[];
      let yields: number[];
      if (json && Array.isArray(json.maturities) && Array.isArray(json.yields)) {
        maturities = json.maturities;
        yields = json.yields;
        setSource(typeof json.source === 'string' ? json.source : 'FRED');
      } else if (Array.isArray(json)) {
        maturities = json.map((y: { maturity: number }) => y.maturity);
        yields = json.map((y: { yield: number }) => y.yield);
      } else {
        throw new Error('Invalid treasury data');
      }
      if (maturities.length < 2 || yields.length < 2) throw new Error('Insufficient maturities');

      const wasmMod = await getWasmMod();
      const out = wasmMod.quant_forward_rates(
        new Float64Array(maturities),
        new Float64Array(yields),
      );
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed?.spot_rates) || !Array.isArray(parsed?.forward_rates)) {
        throw new Error('Invalid forward-rate output');
      }

      const spotArr: number[] = parsed.spot_rates.map((v: number | null) => v ?? 0);
      const fwdArr: number[] = parsed.forward_rates.map((v: number | null) => v ?? 0);
      const matArr: number[] = (
        Array.isArray(parsed.maturities) && parsed.maturities.length === spotArr.length
          ? parsed.maturities
          : maturities
      ).map((v: number | null) => v ?? 0);

      setResult({
        maturities: matArr,
        spot_rates: spotArr,
        forward_rates: fwdArr,
        params: parsed.params ?? {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const r = result();
    if (!canvas || !r) return;
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

    const mat = r.maturities;
    const spot = r.spot_rates;
    const fwd = r.forward_rates;
    const n = Math.min(mat.length, spot.length, fwd.length);
    if (n < 2) return;

    const allY = [...spot.slice(0, n), ...fwd.slice(0, n)];
    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);
    if (minY === maxY) {
      minY -= 0.5;
      maxY += 0.5;
    }
    minY -= 0.2;
    maxY += 0.2;

    const minM = 0.083;
    const maxM = 30.0;
    const logMin = Math.log(minM);
    const logMax = Math.log(maxM);
    const toX = (m: number) =>
      pad.l + ((Math.log(Math.max(minM, m)) - logMin) / (logMax - logMin)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY)) * cH;

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
      ctx.fillText(`${(maxY - ((maxY - minY) * i) / 4).toFixed(2)}%`, pad.l - 5, y + 3);
    }

    for (let i = 0; i < n - 1; i++) {
      const avgDiff = (fwd[i] - spot[i] + (fwd[i + 1] - spot[i + 1])) / 2;
      ctx.fillStyle = avgDiff > 0 ? 'rgba(76, 175, 80, 0.28)' : 'rgba(255, 82, 82, 0.28)';
      ctx.beginPath();
      ctx.moveTo(toX(mat[i]), toY(spot[i]));
      ctx.lineTo(toX(mat[i + 1]), toY(spot[i + 1]));
      ctx.lineTo(toX(mat[i + 1]), toY(fwd[i + 1]));
      ctx.lineTo(toX(mat[i]), toY(fwd[i]));
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#42a5f5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(mat[i]), toY(spot[i])) : ctx.lineTo(toX(mat[i]), toY(spot[i]));
    }
    ctx.stroke();

    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(mat[i]), toY(fwd[i])) : ctx.lineTo(toX(mat[i]), toY(fwd[i]));
    }
    ctx.stroke();

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    const xLabels: Array<[string, number]> = [
      ['3M', 0.25],
      ['2Y', 2],
      ['5Y', 5],
      ['10Y', 10],
      ['30Y', 30],
    ];
    xLabels.forEach(([label, m]) => ctx.fillText(label, toX(m), h - 12));

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#42a5f5';
    ctx.fillRect(pad.l + 8, pad.t + 4, 8, 8);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.7)';
    ctx.fillText('SPOT', pad.l + 20, pad.t + 11);
    ctx.fillStyle = '#ffa726';
    ctx.fillRect(pad.l + 60, pad.t + 4, 8, 8);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.7)';
    ctx.fillText('FORWARD', pad.l + 72, pad.t + 11);
  }

  onMount(() => loadData());

  createEffect(() => {
    result();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          FORWARD RATE CURVE
        </p>
        <Show when={!loading() && result()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {source()} | {result()?.maturities.length ?? 0} maturities
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing forward rates...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />

      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Spot vs forward rates | <span style={{ color: '#4caf50' }}>Green</span> = market expects
        rate hikes | <span style={{ color: '#ff5252' }}>Red</span> = expects cuts
      </p>
    </div>
  );
}

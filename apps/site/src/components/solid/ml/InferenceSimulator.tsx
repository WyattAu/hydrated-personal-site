import { createEffect, createMemo, createSignal } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const QUANTS = [
  { key: 'FP32', bytes: 4 },
  { key: 'FP16', bytes: 2 },
  { key: 'INT8', bytes: 1 },
  { key: 'INT4', bytes: 0.5 },
] as const;

function formatFlops(f: number): string {
  const a = Math.abs(f);
  if (a >= 1e15) return `${(f / 1e15).toFixed(2)} PFLOP`;
  if (a >= 1e12) return `${(f / 1e12).toFixed(2)} TFLOP`;
  if (a >= 1e9) return `${(f / 1e9).toFixed(2)} GFLOP`;
  if (a >= 1e6) return `${(f / 1e6).toFixed(2)} MFLOP`;
  return `${f.toFixed(0)} FLOP`;
}

export default function InferenceSimulator() {
  const [params, setParams] = createSignal(70);
  const [batch, setBatch] = createSignal(1);
  const [seq, setSeq] = createSignal(2048);
  const [quant, setQuant] = createSignal<string>('FP16');
  const [bandwidth, setBandwidth] = createSignal(900);
  let barRef: HTMLCanvasElement | undefined;

  const bpp = createMemo(() => QUANTS.find((q) => q.key === quant())?.bytes ?? 2);

  const out = createMemo(() => {
    const p = params();
    const b = bpp();
    const bw = bandwidth();
    const bs = batch();
    const sl = seq();
    const modelMemoryGB = p * b;
    const flopsPerToken = 2 * p * 1e9;
    const maxTokS = bw / (2 * p * b);
    const totalCompute = flopsPerToken * sl * bs;
    return { modelMemoryGB, flopsPerToken, maxTokS, totalCompute };
  });

  function drawBars() {
    const canvas = barRef;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 200;
    const colors = getThemeColors();
    const p = params();
    const bw = bandwidth();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 44, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    const vals = QUANTS.map((q) => bw / (2 * p * q.bytes));
    const maxV = Math.max(...vals, 1);

    // Grid + y ticks
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
      ctx.fillText((maxV * (1 - i / 4)).toFixed(1), pad.l - 4, y);
    }

    const selectedKey = quant();
    const barW = cW / QUANTS.length;
    vals.forEach((v, i) => {
      const barH = (v / maxV) * cH;
      const x = pad.l + i * barW + barW * 0.2;
      const bw2 = barW * 0.6;
      const y = pad.t + cH - barH;
      const isSel = QUANTS[i].key === selectedKey;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, isSel ? colors.accent || '#00e5ff' : 'rgba(0, 229, 255, 0.45)');
      grad.addColorStop(1, isSel ? colors.accentWarm || '#ff6b35' : 'rgba(0, 229, 255, 0.1)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, bw2, barH);

      // value label
      ctx.fillStyle = isSel
        ? colors.accent || '#00e5ff'
        : colors.canvasText || 'rgba(255,255,255,0.6)';
      ctx.font = `${isSel ? 'bold ' : ''}9px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(v.toFixed(2), x + bw2 / 2, y - 2);

      // x label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(QUANTS[i].key, x + bw2 / 2, pad.t + cH + 4);
    });

    // axis title
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('THEORETICAL tok/s BY QUANTIZATION', w / 2, h - 1);
  }

  createEffect(() => {
    params();
    bandwidth();
    quant();
    drawBars();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        INFERENCE SIMULATOR
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>PARAMETERS</span>
            <span style={{ color: 'var(--accent)' }}>{params().toFixed(0)}B</span>
          </span>
          <input
            type="range"
            min="1"
            max="450"
            step="1"
            value={params()}
            onInput={(e) => setParams(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>BATCH SIZE</span>
            <span style={{ color: 'var(--accent)' }}>{batch()}</span>
          </span>
          <input
            type="range"
            min="1"
            max="256"
            step="1"
            value={batch()}
            onInput={(e) => setBatch(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>SEQUENCE LENGTH</span>
            <span style={{ color: 'var(--accent)' }}>{seq()}</span>
          </span>
          <input
            type="range"
            min="128"
            max="32768"
            step="128"
            value={seq()}
            onInput={(e) => setSeq(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>MEMORY BANDWIDTH</span>
            <span style={{ color: 'var(--accent)' }}>{bandwidth()} GB/s</span>
          </span>
          <input
            type="range"
            min="100"
            max="3350"
            step="50"
            value={bandwidth()}
            onInput={(e) => setBandwidth(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            QUANTIZATION
          </span>
          <select
            class="font-mono text-[10px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={quant()}
            onChange={(e) => setQuant(e.currentTarget.value)}
          >
            {QUANTS.map((q) => (
              <option value={q.key}>
                {q.key} ({q.bytes} byte{q.bytes === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatCard
          label="MODEL MEMORY"
          value={`${out().modelMemoryGB.toFixed(1)} GB`}
          hint={`${params().toFixed(0)}B × ${bpp()} bytes`}
        />
        <StatCard
          label="FLOPs / TOKEN"
          value={formatFlops(out().flopsPerToken)}
          hint="2 × params"
        />
        <StatCard
          label="PEAK tok/s"
          value={`${out().maxTokS.toFixed(2)}`}
          hint="bandwidth / (2·p·bpp)"
          accent
        />
        <StatCard
          label="SEQUENCE COMPUTE"
          value={formatFlops(out().totalCompute)}
          hint={`× ${seq()} seq · ${batch()} batch`}
        />
      </div>

      <canvas ref={barRef} class="w-full" style={{ height: '200px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Roofline estimate | memory-bound decode | bars scale with params &amp; bandwidth
      </p>
    </div>
  );
}

function StatCard(props: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div
      class="p-2 border"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
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
      <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
        {props.hint}
      </p>
    </div>
  );
}

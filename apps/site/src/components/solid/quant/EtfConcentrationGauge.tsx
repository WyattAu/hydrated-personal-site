import { Show, createEffect, createSignal } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

interface ConcentrationResult {
  hhi: number;
  normalised_hhi: number;
  effective_n: number;
  entropy: number;
  max_entropy: number;
  top5_concentration: number;
  top10_concentration: number;
  gini: number;
  classification: string;
}

interface Holding {
  ticker: string;
  weight: number;
}

export default function EtfConcentrationGauge(props: { holdings: Holding[] }) {
  const [result, setResult] = createSignal<ConcentrationResult | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;

  async function compute() {
    setError(null);
    try {
      const raw = props.holdings.map((h) => Number(h.weight) || 0).filter((w) => w > 0);
      if (raw.length < 2) throw new Error('insufficient holdings');
      // Normalise to fractions (0-1) — WASM expects weights summing to 1.
      const sum = raw.reduce((a, b) => a + b, 0);
      if (sum <= 0) throw new Error('invalid weights');
      const weights = Float64Array.from(raw.map((w) => w / sum));

      if (!wasmMod) {
        const _w = '/wasm/hydrated_widgets.js?v=j30';
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const out = wasmMod.quant_concentration(weights);
      setResult(JSON.parse(out));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
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
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 200;
    const colors = getThemeColors();
    const r = result()!;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    // Gauge geometry
    const padX = 56;
    const gaugeY = 70;
    const gaugeH = 26;
    const gaugeW = w - padX * 2;
    const gaugeX = padX;

    // Track background with DOJ zones
    const seg = (frac: number) => gaugeX + frac * gaugeW;
    const drawZone = (x0: number, x1: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x0, gaugeY, x1 - x0, gaugeH);
    };
    drawZone(seg(0), seg(0.15), 'rgba(0, 229, 255, 0.12)'); // diversified
    drawZone(seg(0.15), seg(0.25), 'rgba(255, 196, 0, 0.14)'); // moderate
    drawZone(seg(0.25), seg(1), 'rgba(255, 64, 129, 0.14)'); // concentrated

    // Track border
    ctx.strokeStyle = colors.border || '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

    // DOJ threshold marks at 0.15 and 0.25
    for (const t of [0.15, 0.25]) {
      const x = seg(t);
      ctx.strokeStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, gaugeY - 6);
      ctx.lineTo(x, gaugeY + gaugeH + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Fill value bar (normalised HHI)
    const val = Math.max(0, Math.min(1, r.normalised_hhi));
    const fillGrad = ctx.createLinearGradient(gaugeX, 0, seg(val), 0);
    fillGrad.addColorStop(0, colors.accent || '#00e5ff');
    fillGrad.addColorStop(1, colors.accentWarm || '#f0883e');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(gaugeX, gaugeY, val * gaugeW, gaugeH);

    // Needle
    const nx = seg(val);
    ctx.strokeStyle = colors.textPrimary || '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nx, gaugeY - 8);
    ctx.lineTo(nx, gaugeY + gaugeH + 8);
    ctx.stroke();

    // Threshold labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0.15', seg(0.15), gaugeY + gaugeH + 18);
    ctx.fillText('0.25', seg(0.25), gaugeY + gaugeH + 18);
    ctx.textAlign = 'left';
    ctx.fillText('0', seg(0) + 2, gaugeY + gaugeH + 18);
    ctx.textAlign = 'right';
    ctx.fillText('1', seg(1) - 2, gaugeY + gaugeH + 18);

    // Value readout (top-left)
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HHI ${r.hhi.toFixed(3)}`, gaugeX, 34);
    ctx.fillStyle = colors.textPrimary || '#fff';
    ctx.fillText(r.classification.toUpperCase(), gaugeX, 50);

    // Gauge title (top-right)
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('NORMALISED HHI', gaugeX + gaugeW, 34);
    ctx.fillStyle = colors.accentWarm || '#f0883e';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(val.toFixed(3), gaugeX + gaugeW, 52);

    // Effective N + entropy line
    ctx.fillStyle = colors.textPrimary || '#fff';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`EFF N: ${r.effective_n.toFixed(1)}`, gaugeX, h - 6);
    ctx.fillText(
      `ENTROPY: ${r.entropy.toFixed(2)} / ${r.max_entropy.toFixed(2)} bits`,
      gaugeX + 110,
      h - 6,
    );
    ctx.textAlign = 'right';
    ctx.fillText(`GINI: ${r.gini.toFixed(3)}`, gaugeX + gaugeW, h - 6);
  }

  createEffect(() => {
    void props.holdings;
    compute();
  });

  createEffect(() => {
    const v = result();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        HOLDINGS CONCENTRATION
      </p>
      {error() && (
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      )}
      <canvas ref={canvasRef} class="w-full" style={{ height: '200px' }} />
      <Show when={result()} keyed>
        {(r) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            top5 {(r.top5_concentration * 100).toFixed(1)}% | top10{' '}
            {(r.top10_concentration * 100).toFixed(1)}% | DOJ thresholds 0.15 / 0.25
          </p>
        )}
      </Show>
    </div>
  );
}

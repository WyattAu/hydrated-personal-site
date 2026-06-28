import { createEffect, createSignal } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const GICS_SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
] as const;

export default function EtfSectorRadar(props: { sectorAllocation: Record<string, number> }) {
  const [tick, setTick] = createSignal(0);
  let canvasRef: HTMLCanvasElement | undefined;

  function values(): number[] {
    return GICS_SECTORS.map((s) => Number(props.sectorAllocation?.[s]) || 0);
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 340 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 340;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 6;
    const n = GICS_SECTORS.length;
    const radius = Math.min(w, h) / 2 - 70;
    const vals = values();
    const maxVal = Math.max(...vals, 1);

    const angleFor = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
    const pointFor = (i: number, frac: number) => {
      const a = angleFor(i);
      return { x: cx + Math.cos(a) * radius * frac, y: cy + Math.sin(a) * radius * frac };
    };

    // Concentric rings
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      const frac = ring / 4;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const { x, y } = pointFor(idx, frac);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Spokes
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    for (let i = 0; i < n; i++) {
      const { x, y } = pointFor(i, 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Polygon fill (accent at ~30% opacity)
    const accent = colors.accent || '#00e5ff';
    ctx.fillStyle = `${accent}4d`;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const frac = Math.max(0, Math.min(1, vals[i] / maxVal));
      const { x, y } = pointFor(i, frac);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertices
    ctx.fillStyle = accent;
    for (let i = 0; i < n; i++) {
      const frac = Math.max(0, Math.min(1, vals[i] / maxVal));
      const { x, y } = pointFor(i, frac);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Axis labels: sector name + percentage
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i < n; i++) {
      const a = angleFor(i);
      const lx = cx + Math.cos(a) * (radius + 22);
      const ly = cy + Math.sin(a) * (radius + 22);
      const pct = vals[i];
      ctx.textAlign = Math.abs(Math.cos(a)) < 0.2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
      const label = GICS_SECTORS[i].toUpperCase();
      ctx.fillText(label, lx, ly - 5);
      ctx.fillStyle = colors.accent || '#00e5ff';
      ctx.fillText(`${pct.toFixed(1)}%`, lx, ly + 6);
    }
  }

  createEffect(() => {
    void props.sectorAllocation;
    setTick((t) => t + 1);
    draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        SECTOR ALLOCATION
      </p>
      <canvas ref={canvasRef} class="w-full" style={{ height: '340px' }} data-tick={tick()} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        11 GICS sectors | radar scaled to dominant sector
      </p>
    </div>
  );
}

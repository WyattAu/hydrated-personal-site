import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';
import TickerSelector from './EtfTickerSelector';

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

const SECTOR_LABELS = [
  'Tech',
  'Health',
  'Financials',
  'Cons Disc',
  'Comm Svcs',
  'Industrials',
  'Cons Staples',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
];

interface EtfEntry {
  ticker: string;
  name: string;
  sector_allocation: Record<string, number>;
}

export default function EtfSectorRadar() {
  const [ticker, setTicker] = createSignal('SPY');
  const [allocations, setAllocations] = createSignal<Record<string, number>>({});
  const [loading, setLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/data/etf-database.json');
      if (!res.ok) throw new Error('failed');
      const data: EtfEntry[] = await res.json();
      const etf = data.find((e) => e.ticker === ticker());
      if (etf?.sector_allocation) {
        setAllocations(etf.sector_allocation);
      }
    } catch {
      // keep previous data
    }
    setLoading(false);
  }

  function values(): number[] {
    const alloc = allocations();
    return GICS_SECTORS.map((s) => Number(alloc[s]) || 0);
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
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 50;
    const n = GICS_SECTORS.length;
    const vals = values();
    const maxVal = Math.max(1, ...vals);

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    // Grid rings
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const lx = cx + (radius + 20) * Math.cos(angle);
      const ly = cy + (radius + 20) * Math.sin(angle);
      ctx.fillText(SECTOR_LABELS[i], lx, ly);
    }

    // Data polygon
    const accent = colors.accent || '#00e5ff';
    ctx.fillStyle = `${accent}30`;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
      const r = (vals[idx] / maxVal) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Data points
    ctx.fillStyle = accent;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = (vals[i] / maxVal) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Percentage label near the point
      if (vals[i] > 0) {
        ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${vals[i].toFixed(1)}%`, x, y - 8);
        ctx.fillStyle = accent;
      }
    }
  }

  onMount(() => loadData());
  createEffect(() => {
    ticker();
    loadData();
  });
  createEffect(() => {
    allocations();
    draw();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          SECTOR ALLOCATION RADAR
        </p>
        <TickerSelector ticker={ticker} setTicker={setTicker} />
      </div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading {ticker()}...
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '340px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        {ticker()} 11 GICS sector allocation radar chart
      </p>
    </div>
  );
}

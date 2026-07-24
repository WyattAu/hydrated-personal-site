import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { getThemeColors } from '../../../lib/theme-colors';

const FIB_LEVELS: { ratio: number; label: string; golden?: boolean }[] = [
  { ratio: 0, label: '0%' },
  { ratio: 0.236, label: '23.6%' },
  { ratio: 0.382, label: '38.2%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0.618, label: '61.8%', golden: true },
  { ratio: 0.786, label: '78.6%' },
  { ratio: 1, label: '100%' },
];

interface FibState {
  closes: number[];
  swingHigh: number;
  swingLow: number;
  levels: { ratio: number; label: string; price: number; golden: boolean }[];
  current: number;
}

async function fetchCloses(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
}

export default function FibonacciLevels() {
  const [state, setState] = createSignal<FibState | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const closes = await fetchCloses(activeAsset(), '6mo');
      if (closes.length < 10) throw new Error('Insufficient data');
      const swingHigh = closes.reduce((a, b) => (b > a ? b : a), closes[0]);
      const swingLow = closes.reduce((a, b) => (b < a ? b : a), closes[0]);
      const span = swingHigh - swingLow || 1;
      const levels = FIB_LEVELS.map((f) => ({
        ratio: f.ratio,
        label: f.label,
        price: swingHigh - span * f.ratio,
        golden: !!f.golden,
      }));
      setState({ closes, swingHigh, swingLow, levels, current: closes[closes.length - 1] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !state()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 300;
    const colors = getThemeColors();
    const s = state()!;
    const closes = s.closes;
    const n = closes.length;
    if (n < 2) return;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 96, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    const lo = s.swingLow;
    const hi = s.swingHigh;
    const range = hi - lo || 1;
    const padY = range * 0.04;
    const yLo = lo - padY;
    const yHi = hi + padY;
    const yRange = yHi - yLo || 1;
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - yLo) / yRange) * cH;

    // Fibonacci level lines
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.lineWidth = 1;
    for (const lv of s.levels) {
      const y = toY(lv.price);
      const isSupport = lv.price < s.current;
      const baseColor = isSupport ? '#4caf50' : '#ff5252';
      ctx.strokeStyle = lv.golden ? '#ffc107' : baseColor;
      ctx.lineWidth = lv.golden ? 2 : 1;
      ctx.setLineDash(lv.golden ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label (% + price)
      ctx.textAlign = 'right';
      ctx.fillStyle = lv.golden ? '#ffc107' : colors.canvasText || 'rgba(255,255,255,0.7)';
      const tag = lv.golden
        ? `${lv.label} GOLDEN ${lv.price.toFixed(2)}`
        : `${lv.label} ${lv.price.toFixed(2)}`;
      ctx.fillText(tag, pad.l - 6, y + 3);
    }

    // Price line over time
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(i), toY(closes[i])) : ctx.lineTo(toX(i), toY(closes[i]));
    }
    ctx.stroke();

    // Current price marker
    const lastX = toX(n - 1);
    const curY = toY(s.current);
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.beginPath();
    ctx.arc(lastX, curY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(s.current.toFixed(2), lastX + 6, curY - 4);

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['SUPPORT', '#4caf50'],
      ['RESISTANCE', '#ff5252'],
      ['GOLDEN 61.8%', '#ffc107'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 4 + i * 100;
      ctx.fillStyle = color;
      ctx.fillRect(x, h - 14, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, h - 7);
    });
  }

  onMount(() => loadData());

  createEffect(() => {
    activeAsset();
    loadData();
  });

  createEffect(() => {
    state();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          FIBONACCI RETRACEMENT
        </p>
        <Show when={!loading() && state()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 6M | H {state()?.swingHigh.toFixed(2)} / L{' '}
            {state()?.swingLow.toFixed(2)}
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing Fibonacci levels...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && state()}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '300px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Auto-detected swing high/low | 6M lookback | 61.8% = golden ratio
        </p>
      </Show>
    </div>
  );
}

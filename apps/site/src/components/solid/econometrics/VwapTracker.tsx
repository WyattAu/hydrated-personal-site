import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { getThemeColors } from '../../../lib/theme-colors';

interface VwapState {
  closes: number[];
  vwap: number[];
  spread: number;
}

async function fetchOhlcv(
  symbol: string,
  range: string,
): Promise<{ high: number[]; low: number[]; close: number[]; volume: number[] }> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return { high: [], low: [], close: [], volume: [] };
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const rawH: (number | null)[] = quote?.high ?? [];
  const rawL: (number | null)[] = quote?.low ?? [];
  const rawC: (number | null)[] = quote?.close ?? [];
  const rawV: (number | null)[] = quote?.volume ?? [];
  const n = Math.min(rawH.length, rawL.length, rawC.length, rawV.length);
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const volume: number[] = [];
  for (let i = 0; i < n; i++) {
    const hi = rawH[i];
    const lo = rawL[i];
    const c = rawC[i];
    const v = rawV[i];
    if (hi != null && lo != null && c != null && v != null && c > 0 && v > 0) {
      high.push(hi);
      low.push(lo);
      close.push(c);
      volume.push(v);
    }
  }
  return { high, low, close, volume };
}

function computeVwap(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
): VwapState | null {
  const n = close.length;
  if (n < 5) return null;
  const vwap: number[] = new Array(n);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < n; i++) {
    const typical = (high[i] + low[i] + close[i]) / 3;
    cumPV += typical * volume[i];
    cumV += volume[i];
    vwap[i] = cumV > 0 ? cumPV / cumV : close[i];
  }
  const lastClose = close[n - 1];
  const lastVwap = vwap[n - 1];
  return { closes: close, vwap, spread: lastClose - lastVwap };
}

export default function VwapTracker() {
  const [state, setState] = createSignal<VwapState | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { high, low, close, volume } = await fetchOhlcv(activeAsset(), '1mo');
      const s = computeVwap(high, low, close, volume);
      if (!s) throw new Error('Insufficient data');
      setState(s);
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
    canvas.height = 250 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 250;
    const colors = getThemeColors();
    const s = state()!;
    const closes = s.closes;
    const vwap = s.vwap;
    const n = closes.length;
    if (n < 2) return;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 52, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      if (closes[i] < lo) lo = closes[i];
      if (closes[i] > hi) hi = closes[i];
      if (vwap[i] < lo) lo = vwap[i];
      if (vwap[i] > hi) hi = vwap[i];
    }
    const padY = (hi - lo) * 0.05 || 1;
    lo -= padY;
    hi += padY;
    const range = hi - lo || 1;
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - lo) / range) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText((hi - (range * i) / 4).toFixed(2), pad.l - 5, y + 3);
    }

    // Fill between close and vwap: green where close >= vwap, red where close < vwap
    for (let i = 0; i < n - 1; i++) {
      const x0 = toX(i);
      const x1 = toX(i + 1);
      const top0 = toY(Math.max(closes[i], vwap[i]));
      const top1 = toY(Math.max(closes[i + 1], vwap[i + 1]));
      const bot0 = toY(Math.min(closes[i], vwap[i]));
      const bot1 = toY(Math.min(closes[i + 1], vwap[i + 1]));
      const bullish = (closes[i] + closes[i + 1]) / 2 >= (vwap[i] + vwap[i + 1]) / 2;
      ctx.fillStyle = bullish ? 'rgba(76, 175, 80, 0.22)' : 'rgba(255, 82, 82, 0.22)';
      ctx.beginPath();
      ctx.moveTo(x0, top0);
      ctx.lineTo(x1, top1);
      ctx.lineTo(x1, bot1);
      ctx.lineTo(x0, bot0);
      ctx.closePath();
      ctx.fill();
    }

    // VWAP line
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(i), toY(vwap[i])) : ctx.lineTo(toX(i), toY(vwap[i]));
    }
    ctx.stroke();

    // Close line
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(i), toY(closes[i])) : ctx.lineTo(toX(i), toY(closes[i]));
    }
    ctx.stroke();

    // Current price marker
    const lastX = toX(n - 1);
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.beginPath();
    ctx.arc(lastX, toY(closes[n - 1]), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['CLOSE', colors.accent || '#00e5ff'],
      ['VWAP', '#ffc107'],
      ['ABOVE', '#4caf50'],
      ['BELOW', '#ff5252'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 4 + i * 72;
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

  const spreadColor = () =>
    state() ? (state()?.spread >= 0 ? '#4caf50' : '#ff5252') : 'var(--text-secondary)';

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          VWAP TRACKER
        </p>
        <Show when={!loading() && state()}>
          <span class="font-mono text-[10px]" style={{ color: spreadColor() }}>
            spread {state()?.spread >= 0 ? '+' : ''}
            {state()?.spread.toFixed(2)}
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing VWAP...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && state()}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '250px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Volume-Weighted Average Price | Green = above VWAP (bullish) | Red = below VWAP (bearish)
        </p>
      </Show>
    </div>
  );
}

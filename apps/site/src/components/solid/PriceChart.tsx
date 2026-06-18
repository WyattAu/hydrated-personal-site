import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = '1d' | '1w' | '1m' | '3m' | '1y';

const TIMEFRAMES: { key: Timeframe; label: string; interval: string; limit: string }[] = [
  { key: '1d', label: '1D', interval: '5m', limit: '288' },
  { key: '1w', label: '1W', interval: '1h', limit: '168' },
  { key: '1m', label: '1M', interval: '4h', limit: '180' },
  { key: '3m', label: '3M', interval: '1d', limit: '90' },
  { key: '1y', label: '1Y', interval: '1d', limit: '365' },
];

function parseKlines(raw: unknown[]): Kline[] {
  return raw.map((k: unknown) => {
    const arr = k as unknown[];
    return {
      openTime: arr[0] as number,
      open: Number.parseFloat(arr[1] as string),
      high: Number.parseFloat(arr[2] as string),
      low: Number.parseFloat(arr[3] as string),
      close: Number.parseFloat(arr[4] as string),
      volume: Number.parseFloat(arr[5] as string),
    };
  });
}

function formatPrice(p: number): string {
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 100) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
  return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PriceChart(props: { symbol?: string; title?: string }) {
  const symbol = props.symbol || 'BTCUSDT';
  const title = props.title || 'Price History';

  const [tf, setTf] = createSignal<Timeframe>('1m');
  const [klines, setKlines] = createSignal<Kline[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [crosshair, setCrosshair] = createSignal<{
    price: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);

  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  function drawChart(data: Kline[]) {
    const canvas = canvasRef;
    if (!canvas || data.length === 0) return;

    const container = containerRef;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 320;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const padLeft = 70;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 32;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const prices = data.flatMap((d) => [d.high, d.low]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const pPadding = range * 0.05;
    const yMin = minP - pPadding;
    const yMax = maxP + pPadding;
    const yRange = yMax - yMin;

    const toX = (i: number) => padLeft + (i / (data.length - 1)) * chartW;
    const toY = (p: number) => padTop + (1 - (p - yMin) / yRange) * chartH;

    // Background
    const bgStyle = getComputedStyle(document.documentElement);
    const bgColor = bgStyle.getPropertyValue('--bg-card').trim() || '#0c0c0c';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const price = yMin + (yRange * i) / gridLines;
      const y = toY(price);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatPrice(price), padLeft - 8, y + 3);
    }

    // X-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += labelStep) {
      ctx.fillText(formatDate(data[i].openTime), toX(i), h - 8);
    }

    const accentColor = bgStyle.getPropertyValue('--accent').trim() || '#00e5ff';

    // Volume bars
    const maxVol = Math.max(...data.map((d) => d.volume));
    if (maxVol > 0) {
      const barW = Math.max(1, (chartW / data.length) * 0.6);
      data.forEach((d, i) => {
        const barH = (d.volume / maxVol) * chartH * 0.15;
        const x = toX(i) - barW / 2;
        const y = padTop + chartH - barH;
        ctx.fillStyle = 'rgba(0,229,255,0.08)';
        ctx.fillRect(x, y, barW, barH);
      });
    }

    // Price line
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    data.forEach((d, i) => {
      const x = toX(i);
      const y = toY(d.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    ctx.lineTo(toX(data.length - 1), padTop + chartH);
    ctx.lineTo(toX(0), padTop + chartH);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    gradient.addColorStop(0, 'rgba(0,229,255,0.15)');
    gradient.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Crosshair
    const ch = crosshair();
    if (ch) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;

      // Vertical
      ctx.beginPath();
      ctx.moveTo(ch.x, padTop);
      ctx.lineTo(ch.x, padTop + chartH);
      ctx.stroke();

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(padLeft, ch.y);
      ctx.lineTo(w - padRight, ch.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, ch.y - 10, padLeft - 4, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatPrice(ch.price), padLeft - 8, ch.y + 3);

      // Date label
      const dateW = 80;
      ctx.fillStyle = accentColor;
      ctx.fillRect(ch.x - dateW / 2, padTop + chartH + 2, dateW, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch.date, ch.x, padTop + chartH + 15);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const tfConfig = TIMEFRAMES.find((t) => t.key === tf())!;
      const res = await fetch(
        `/api/binance-klines?symbol=${symbol}&interval=${tfConfig.interval}&limit=${tfConfig.limit}`,
      );
      const raw = await res.json();
      setKlines(parseKlines(raw));
    } catch {
      setKlines([]);
    }
    setLoading(false);
  }

  createEffect(() => {
    tf();
    fetchData();
  });

  createEffect(() => {
    const data = klines();
    if (data.length > 0) drawChart(data);
  });

  onMount(() => {
    const observer = new ResizeObserver(() => {
      const data = klines();
      if (data.length > 0) drawChart(data);
    });
    if (containerRef) observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  function handleMouseMove(e: MouseEvent) {
    const canvas = canvasRef;
    const data = klines();
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const padLeft = 70;
    const padRight = 16;
    const chartW = w - padLeft - padRight;

    const idx = Math.round(((x - padLeft) / chartW) * (data.length - 1));
    if (idx < 0 || idx >= data.length) {
      setCrosshair(null);
      return;
    }

    const d = data[idx];
    const padTop = 16;
    const padBottom = 32;
    const chartH = 320 - padTop - padBottom;
    const prices = data.flatMap((dd) => [dd.high, dd.low]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const pPadding = range * 0.05;
    const yMin = minP - pPadding;
    const yMax = maxP + pPadding;
    const yRange = yMax - yMin;
    const price = yMin + (1 - (e.clientY - rect.top - padTop) / chartH) * yRange;

    setCrosshair({
      price,
      date: formatDate(d.openTime),
      x: padLeft + (idx / (data.length - 1)) * chartW,
      y: e.clientY - rect.top,
    });
  }

  function handleMouseLeave() {
    setCrosshair(null);
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style="color: var(--accent);">
          {title.toUpperCase()}
        </p>
        <div class="flex gap-1">
          <For each={TIMEFRAMES}>
            {(t) => (
              <button
                type="button"
                class="code-text px-2 py-1 transition-colors"
                style={{
                  color: tf() === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                  'border-bottom':
                    tf() === t.key ? '1px solid var(--accent)' : '1px solid transparent',
                }}
                onClick={() => setTf(t.key)}
              >
                {t.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div
        ref={containerRef}
        class="border relative"
        style="border-color: var(--border); background: var(--bg-card);"
      >
        <Show when={!loading()}>
          <canvas
            ref={canvasRef}
            class="w-full cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="img"
            aria-label={`${title} price chart`}
          />
        </Show>

        <Show when={loading()}>
          <div class="flex items-center justify-center" style="height: 320px;">
            <div class="text-center">
              <div
                class="w-6 h-6 border-2 mb-2 mx-auto"
                style="border-color: var(--border); border-top-color: var(--accent); animation: spin 1s linear infinite;"
              />
              <p class="code-text" style="color: var(--text-secondary);">
                Loading chart...
              </p>
            </div>
          </div>
        </Show>

        <Show when={!loading() && klines().length === 0()}>
          <div class="flex items-center justify-center" style="height: 320px;">
            <p class="code-text" style="color: var(--text-secondary);">
              No data available
            </p>
          </div>
        </Show>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

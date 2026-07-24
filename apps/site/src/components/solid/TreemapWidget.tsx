import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';
import { getThemeColors } from '../../lib/theme-colors';

interface TickerItem {
  symbol: string;
  price: number;
  priceChangePercent?: number | string;
  volume?: number | string;
  quoteVolume?: number | string;
  lastPrice?: number | string;
}

export default function TreemapWidget() {
  const [data, setData] = createSignal<TickerItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    try {
      const res = await fetch(`${apiBase()}/api/crypto-ticker`);
      if (!res.ok) return;
      const d = await res.json();
      const items = Array.isArray(d) ? d : d.data || [];
      if (items.length > 0) setData(items);
    } catch {}
    setLoading(false);
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || data().length === 0) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const ctx = c;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 300;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    // Compute market cap proxy: volume * price for each item
    const entries = data()
      .map((item) => {
        const vol = Number(item.volume || item.quoteVolume || 0);
        const price = Number(item.price || item.lastPrice || 0);
        const chg = Number(item.priceChangePercent || 0);
        return {
          name: (item.symbol || '').replace('USDT', ''),
          cap: vol * price,
          change: chg,
        };
      })
      .filter((e) => e.cap > 0)
      .sort((a, b) => b.cap - a.cap)
      .slice(0, 15);

    if (entries.length === 0) return;

    const grandTotal = entries.reduce((s, e) => s + e.cap, 0);

    // Simple treemap: slice-and-dice algorithm
    function drawTreemap(
      items: { name: string; cap: number; change: number }[],
      x: number,
      y: number,
      w: number,
      h: number,
      depth: number,
    ) {
      if (items.length === 0 || w < 2 || h < 2) return;
      if (items.length === 1 || depth > 4) {
        const item = items[0];
        const isPositive = item.change >= 0;
        const intensity = Math.min(1, Math.abs(item.change) / 10);
        const hue = isPositive ? 140 : 0; // green or red
        const lightness = 35 + intensity * 20;

        ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        ctx.strokeStyle = colors.bgCard || '#0c0c0c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        // Label
        if (w > 40 && h > 25) {
          const fontSize = Math.min(16, Math.max(9, Math.sqrt(w * h) * 0.08));
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(item.name, x + 5, y + 4);
          if (h > 35) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = `${fontSize * 0.7}px "JetBrains Mono", monospace`;
            const pct = ((item.cap / grandTotal) * 100).toFixed(1);
            ctx.fillText(`${pct}%`, x + 5, y + 4 + fontSize + 2);
          }
          if (h > 45) {
            ctx.fillStyle = isPositive ? '#69f0ae' : '#f85149';
            ctx.font = `${fontSize * 0.7}px "JetBrains Mono", monospace`;
            ctx.fillText(
              `${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%`,
              x + 5,
              y + h - fontSize - 2,
            );
          }
        }
        return;
      }

      // Split items into two groups
      const totalCap = items.reduce((s, e) => s + e.cap, 0);
      let bestSplit = 1;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (let i = 1; i < items.length; i++) {
        const leftCap = items.slice(0, i).reduce((s, e) => s + e.cap, 0);
        const ratio = leftCap / totalCap;
        const diff = Math.abs(ratio - 0.5);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestSplit = i;
        }
      }

      const left = items.slice(0, bestSplit);
      const right = items.slice(bestSplit);
      const leftRatio = left.reduce((s, e) => s + e.cap, 0) / totalCap;

      if (w > h) {
        // Split vertically
        const lw = w * leftRatio;
        drawTreemap(left, x, y, lw, h, depth + 1);
        drawTreemap(right, x + lw, y, w - lw, h, depth + 1);
      } else {
        // Split horizontally
        const lh = h * leftRatio;
        drawTreemap(left, x, y, w, lh, depth + 1);
        drawTreemap(right, x, y + lh, w, h - lh, depth + 1);
      }
    }

    drawTreemap(entries, 0, 0, w, h, 0);
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  });

  createEffect(() => {
    const d = data();
    if (d.length > 0) draw();
  });

  return (
    <div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading treemap...
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '300px' }} />
    </div>
  );
}

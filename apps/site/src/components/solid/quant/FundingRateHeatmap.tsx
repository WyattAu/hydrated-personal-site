import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';

export default function FundingRateHeatmap() {
  const [data, setData] = createSignal<Array<{ symbol: string; rate: number }>>([]);
  const [loading, setLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/funding-rates`);
      if (!res.ok) throw new Error('API');
      const d = await res.json();
      if (Array.isArray(d)) setData(d.slice(0, 30));
    } catch {
      /* skip */
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;
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
    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const d = data();
    if (d.length === 0) return;

    const barH = Math.max(12, Math.min(22, (h - 20) / d.length));
    const pad = { l: 80, r: 16, t: 10 };
    const cW = w - pad.l - pad.r;

    d.forEach((item, i) => {
      const y = 10 + i * (barH + 2);
      // Label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.max(8, barH * 0.55)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.symbol.replace('USDT', ''), pad.l - 8, y + barH / 2);

      // Bar
      const maxRate = Math.max(...d.map((x) => Math.abs(x.rate)));
      const barW = (Math.abs(item.rate) / (maxRate || 1)) * cW;
      if (item.rate > 0) {
        ctx.fillStyle = `rgba(76, 175, 80, ${0.3 + (Math.abs(item.rate) / maxRate) * 0.5})`;
        ctx.fillRect(pad.l, y, barW, barH);
      } else {
        ctx.fillStyle = `rgba(255, 64, 129, ${0.3 + (Math.abs(item.rate) / maxRate) * 0.5})`;
        ctx.fillRect(pad.l + cW - barW, y, barW, barH);
      }

      // Rate text
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
      ctx.font = `${Math.max(7, barH * 0.5)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`${(item.rate * 100).toFixed(4)}%`, pad.l + cW + 4, y + barH / 2);
    });
  }

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    const v = data();
    if (v && v.length > 0) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        FUNDING RATES (PERPS)
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading...
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '300px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Binance perpetuals | green = longs pay shorts | red = shorts pay longs
      </p>
    </div>
  );
}

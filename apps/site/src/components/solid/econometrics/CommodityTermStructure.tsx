import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { getThemeColors } from '../../../lib/theme-colors';

async function fetchLastClose(symbol: string): Promise<number | null> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=5d&interval=1d`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  return closes.length > 0 ? closes[closes.length - 1] : null;
}

export default function CommodityTermStructure() {
  const [prices, setPrices] = createSignal<number[]>([]);
  const [symbol, setSymbol] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const active = activeAsset();
      const isCommodity = active.endsWith('=F');
      const base = isCommodity ? active.replace(/=F$/, '') : 'CL';
      const front = `${base}=F`;
      setSymbol(front);

      const [m1, m2, m3] = await Promise.all([
        fetchLastClose(`${base}=F`),
        fetchLastClose(`${base}_2=F`),
        fetchLastClose(`${base}_3=F`),
      ]);
      const out = [m1, m2, m3].map((v) => (v == null ? 0 : v));
      if (out.every((v) => v === 0)) throw new Error('No futures data');
      setPrices(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || prices().length === 0) return;
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
    const pad = { l: 50, r: 16, t: 28, b: 36 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const p = prices();
    const maxP = Math.max(...p) || 1;
    const minP = Math.min(0, Math.min(...p));
    const range = maxP - minP || 1;
    const toY = (v: number) => pad.t + (1 - (v - minP) / range) * cH;

    const contango = p[0] < p[1];
    const barColor = contango ? '#ff5252' : '#4caf50';

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxP - (range * i) / 4).toFixed(2)}`, pad.l - 5, y + 3);
    }

    // Bars
    const slotW = cW / 3;
    const barW = slotW * 0.5;
    const labels = ['M1', 'M2', 'M3'];
    for (let i = 0; i < 3; i++) {
      const x = pad.l + i * slotW + (slotW - barW) / 2;
      const yTop = toY(p[i]);
      const yBase = toY(0);
      ctx.fillStyle = `${barColor}cc`;
      ctx.fillRect(x, yTop, barW, yBase - yTop);
      // price label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(p[i].toFixed(2), x + barW / 2, yTop - 4);
      // month label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(labels[i], x + barW / 2, h - pad.b + 14);
    }

    // Status header
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = barColor;
    const status = contango ? 'CONTANGO (normal carry)' : 'BACKWARDATION (supply stress)';
    ctx.fillText(status, pad.l, 16);

    // Spread
    if (p[0] > 0 && p[1] > 0) {
      const spread = p[1] - p[0];
      ctx.textAlign = 'right';
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`M2−M1: ${spread >= 0 ? '+' : ''}${spread.toFixed(3)}`, w - pad.r, 16);
    }
  }

  onMount(() => loadData());

  createEffect(() => {
    activeAsset();
    loadData();
  });

  createEffect(() => {
    prices();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  const isCommodity = () => activeAsset().endsWith('=F');

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          COMMODITY TERM STRUCTURE
        </p>
        <Show when={!loading() && prices().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {symbol()} | front 3 months
          </span>
        </Show>
      </div>

      <Show when={!isCommodity()}>
        <p
          class="font-mono text-[10px] p-2 border mb-2"
          style={{
            color: 'var(--accent-warm)',
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          Select a commodity futures contract (e.g. CL=F, GC=F, NG=F). Showing default CL=F.
        </p>
      </Show>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading term structure...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && prices().length > 0}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
      </Show>
    </div>
  );
}

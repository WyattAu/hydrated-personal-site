import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getThemeColors } from '../../../lib/theme-colors';

interface RangeData {
  wHigh: number;
  wLow: number;
  cmpHigh: number;
  cmpLow: number;
  current: number;
}

async function fetchRangeData(symbol: string): Promise<RangeData | null> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  if (closes.length === 0) return null;
  const cmpHigh = closes.reduce((a, b) => (b > a ? b : a), closes[0]);
  const cmpLow = closes.reduce((a, b) => (b < a ? b : a), closes[0]);
  const wHigh = Number(meta?.fiftyTwoWeekHigh ?? cmpHigh);
  const wLow = Number(meta?.fiftyTwoWeekLow ?? cmpLow);
  const current = Number(meta?.regularMarketPrice ?? closes[closes.length - 1]);
  if (!Number.isFinite(wHigh) || !Number.isFinite(wLow) || wHigh <= 0 || wLow <= 0) {
    return { wHigh: cmpHigh, wLow: cmpLow, cmpHigh, cmpLow, current };
  }
  return { wHigh, wLow, cmpHigh, cmpLow, current };
}

export default function WeekRange52() {
  const [data, setData] = createSignal<RangeData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchRangeData(activeAsset());
      if (!d) throw new Error('No chart data');
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !data()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 80 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 80;
    const colors = getThemeColors();
    const d = data()!;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const x0 = 52;
    const x1 = Math.max(x0 + 10, w - 52);
    const barW = x1 - x0;
    const barTop = 44;
    const barH = 14;

    const lo = d.wLow;
    const hi = d.wHigh;
    const range = hi - lo || 1;
    const pos = Math.max(0, Math.min(1, (d.current - lo) / range));
    const markerX = x0 + pos * barW;

    // Gradient gauge: red (low) -> yellow (mid) -> green (high)
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, '#ff5252');
    grad.addColorStop(0.5, '#ffc107');
    grad.addColorStop(1, '#4caf50');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, barTop, barW, barH);

    ctx.strokeStyle = colors.border || '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, barTop, barW, barH);

    // Triangle marker (pointing down) at current price
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.beginPath();
    ctx.moveTo(markerX, barTop - 1);
    ctx.lineTo(markerX - 6, barTop - 11);
    ctx.lineTo(markerX + 6, barTop - 11);
    ctx.closePath();
    ctx.fill();

    ctx.font = '9px "JetBrains Mono", monospace';
    // Current price above marker
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.textAlign = 'center';
    const labelX = Math.max(x0 + 24, Math.min(x1 - 24, markerX));
    ctx.fillText(d.current.toFixed(2), labelX, barTop - 14);

    // Low / High labels
    ctx.fillStyle = '#ff5252';
    ctx.textAlign = 'left';
    ctx.fillText(d.wLow.toFixed(2), x0, h - 4);
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'right';
    ctx.fillText(d.wHigh.toFixed(2), x1, h - 4);
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  createEffect(() => {
    data();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          52-WEEK RANGE
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 1Y
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading 52-week range...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && data()}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '80px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Position within 52-week trading range
        </p>
      </Show>
    </div>
  );
}

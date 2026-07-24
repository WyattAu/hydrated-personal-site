import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';

const SECTOR_ETFS = ['XLK', 'XLV', 'XLF', 'XLE', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'];

async function fetchCloses(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
}

function totalReturn(closes: number[]): number {
  if (closes.length < 2) return 0;
  return closes[closes.length - 1] / closes[0] - 1;
}

export default function SectorRotation() {
  const [rows, setRows] = createSignal<{ label: string; rs: number }[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const symbols = [...SECTOR_ETFS, 'SPY'];
      const fetched = await Promise.all(symbols.map((s) => fetchCloses(s, '3mo')));
      const spyRet = totalReturn(fetched[fetched.length - 1]);
      const out = SECTOR_ETFS.map((sym, i) => ({
        label: sym,
        rs: (totalReturn(fetched[i]) - spyRet) * 100,
      })).filter((r) => Number.isFinite(r.rs));
      if (out.length === 0) throw new Error('Insufficient data');
      setRows(out);
    } catch (e) {
      console.error('[SectorRotation]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || rows().length === 0) return;
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
    const labelW = 44;
    const pad = { l: 8, r: 40, t: 16, b: 28 };
    const plotX0 = pad.l + labelW;
    const plotW = w - pad.r - plotX0;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const sorted = [...rows()].sort((a, b) => b.rs - a.rs);
    const n = sorted.length;
    const vmax = Math.max(0, ...sorted.map((r) => r.rs));
    const vmin = Math.min(0, ...sorted.map((r) => r.rs));
    const range = vmax - vmin || 1;
    const zeroX = plotX0 + (-vmin / range) * plotW;
    const xOf = (v: number) => plotX0 + ((v - vmin) / range) * plotW;
    const rowH = cH / n;
    const barH = Math.min(20, rowH * 0.6);

    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i < n; i++) {
      const r = sorted[i];
      const y = pad.t + i * rowH + (rowH - barH) / 2;
      const xL = Math.min(zeroX, xOf(r.rs));
      const xR = Math.max(zeroX, xOf(r.rs));
      ctx.fillStyle = r.rs >= 0 ? '#4caf50' : '#ff5252';
      ctx.fillRect(xL, y, Math.max(1, xR - xL), barH);
      // label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'right';
      ctx.fillText(r.label, plotX0 - 4, y + barH / 2 + 3);
      // value
      ctx.textAlign = 'left';
      ctx.fillStyle = r.rs >= 0 ? '#4caf50' : '#ff5252';
      ctx.fillText(`${r.rs >= 0 ? '+' : ''}${r.rs.toFixed(2)}%`, xR + 4, y + barH / 2 + 3);
    }

    // Zero line
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(zeroX, pad.t);
    ctx.lineTo(zeroX, pad.t + cH);
    ctx.stroke();

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['OUTPERFORM', '#4caf50'],
      ['LAGGING', '#ff5252'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 8 + i * 110;
      ctx.fillStyle = color;
      ctx.fillRect(x, h - 14, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, h - 7);
    });
  }

  onMount(() => loadData());

  createEffect(() => {
    rows();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          SECTOR ROTATION SIGNAL
        </p>
        <Show when={!loading() && rows().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {rows().length} sectors | 3M | vs SPY
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing sector rotation...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && rows().length === 0}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <Show when={!loading() && rows().length > 0}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          3-month relative strength vs S&amp;P 500 | Green = outperforming | Red = lagging
        </p>
      </Show>
    </div>
  );
}

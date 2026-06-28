import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 340;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'];

export default function CurrencyMatrix() {
  const [matrix, setMatrix] = createSignal<{
    grid: number[][];
    rates: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/exchange-rates');
      if (!res.ok) throw new Error('API');
      const raw = await res.json();
      const body = raw.data || raw;
      const rates: Record<string, number> = body.rates || {};
      rates.USD = 1;

      // USD purchasing value of one unit of each currency = 1 / rate.
      const lnVal = CURRENCIES.map((c) => Math.log(1 / (rates[c] || 1)));
      const mean = lnVal.reduce((a, b) => a + b, 0) / lnVal.length;
      const rel = lnVal.map((v) => v - mean);

      const grid: number[][] = [];
      for (let i = 0; i < CURRENCIES.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < CURRENCIES.length; j++) row.push(rel[i] - rel[j]);
        grid.push(row);
      }
      setMatrix({ grid, rates });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function cellColor(v: number): string {
    const clamped = Math.max(-0.5, Math.min(0.5, v));
    const a = Math.min(1, Math.abs(clamped) / 0.5);
    return clamped >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
  }

  function draw() {
    const canvas = canvasRef;
    const m = matrix();
    if (!canvas || !m) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, H);

    const n = CURRENCIES.length;
    const labelPad = 46;
    const gridW = w - labelPad * 2;
    const gridH = H - labelPad * 2;
    const cellW = gridW / n;
    const cellH = gridH / n;
    const sx = labelPad;
    const sy = labelPad;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = cellColor(m.grid[i][j]);
        ctx.fillRect(sx + j * cellW, sy + i * cellH, cellW - 1, cellH - 1);
      }
    }

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
    for (let i = 0; i < n; i++) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(CURRENCIES[i], sx - 4, sy + i * cellH + cellH / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(CURRENCIES[i], sx + i * cellW + cellW / 2, sy - 4);
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('row relative strength vs column | green = stronger', w - 4, H - 4);
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = matrix();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        CURRENCY STRENGTH MATRIX
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading exchange rates...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        8x8 FX cross-rates | spot snapshot | green = row stronger than column
      </p>
    </div>
  );
}

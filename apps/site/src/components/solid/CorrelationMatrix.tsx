import { For, Show, createSignal, createEffect, onCleanup, onMount } from 'solid-js';
import type { EtfEntry } from '../../lib/types';

interface CorrelationMatrixProps {
  database: EtfEntry[];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCorrelation(tickers: string[]): number[][] {
  const n = tickers.length;
  const rand = seededRandom(42);
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
      } else {
        const base = rand() * 1.6 - 0.3;
        matrix[i][j] = Math.max(-1, Math.min(1, base));
      }
    }
  }
  return matrix;
}

function corrToColor(val: number): string {
  if (val >= 0) {
    const t = val;
    const r = Math.round(240 + (255 - 240) * t);
    const g = Math.round(240 - 240 * t);
    const b = Math.round(240 - 240 * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = -val;
  const r = Math.round(240 - 240 * t);
  const g = Math.round(240 - 100 * t);
  const b = Math.round(240 + (255 - 240) * t);
  return `rgb(${r},${g},${b})`;
}

function drawMatrix(
  canvas: HTMLCanvasElement,
  tickers: string[],
  matrix: number[][],
  hoverIdx: { row: number; col: number } | null,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 400;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const bg =
    getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#0c0c0c';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const n = tickers.length;
  const padLeft = 60;
  const padTop = 60;
  const cellW = (w - padLeft) / n;
  const cellH = (h - padTop) / n;

  // Draw cells
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = padLeft + j * cellW;
      const y = padTop + i * cellH;
      const val = matrix[i][j];

      const isHover = hoverIdx && hoverIdx.row === i && hoverIdx.col === j;
      ctx.fillStyle = corrToColor(val);
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

      if (isHover) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellW, cellH);
      }

      // Value text
      if (cellW > 30) {
        ctx.fillStyle = Math.abs(val) > 0.5 ? '#000' : 'rgba(0,0,0,0.5)';
        ctx.font = `${Math.min(11, cellW * 0.3)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toFixed(2), x + cellW / 2, y + cellH / 2);
      }
    }
  }

  // Ticker labels
  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() ||
    '#888';
  ctx.fillStyle = textColor;
  ctx.font = '9px "JetBrains Mono", monospace';

  for (let i = 0; i < n; i++) {
    // Top labels (rotated)
    ctx.save();
    ctx.translate(padLeft + i * cellW + cellW / 2, padTop - 8);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    ctx.fillText(tickers[i], 0, 0);
    ctx.restore();

    // Left labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(tickers[i], padLeft - 8, padTop + i * cellH + cellH / 2);
  }

  // Color scale legend
  const legendX = padLeft;
  const legendY = h - 24;
  const legendW = 120;
  for (let i = 0; i < legendW; i++) {
    const val = (i / legendW) * 2 - 1;
    ctx.fillStyle = corrToColor(val);
    ctx.fillRect(legendX + i, legendY, 1, 10);
  }
  ctx.fillStyle = textColor;
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('-1.0', legendX, legendY + 20);
  ctx.fillText('0', legendX + legendW / 2, legendY + 20);
  ctx.fillText('+1.0', legendX + legendW, legendY + 20);
}

export default function CorrelationMatrix(props: CorrelationMatrixProps) {
  const [selectedTickers, setSelectedTickers] = createSignal<string[]>([
    'SPY',
    'QQQ',
    'AGG',
    'GLD',
    'VTI',
  ]);
  const [hoverIdx, setHoverIdx] = createSignal<{ row: number; col: number } | null>(null);
  const [matrix, setMatrix] = createSignal<number[][]>([]);
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  function addTicker(ticker: string) {
    if (selectedTickers().length >= 10) return;
    if (selectedTickers().includes(ticker)) return;
    setSelectedTickers((prev) => [...prev, ticker]);
  }

  function removeTicker(ticker: string) {
    setSelectedTickers((prev) => prev.filter((t) => t !== ticker));
  }

  createEffect(() => {
    const tickers = selectedTickers();
    setMatrix(generateCorrelation(tickers));
    queueMicrotask(() => {
      if (canvasRef) drawMatrix(canvasRef, tickers, matrix(), hoverIdx());
    });
  });

  onMount(() => {
    const tickers = selectedTickers();
    setMatrix(generateCorrelation(tickers));
    if (canvasRef) drawMatrix(canvasRef, tickers, matrix(), null);

    const observer = new ResizeObserver(() => {
      if (canvasRef) drawMatrix(canvasRef, selectedTickers(), matrix(), hoverIdx());
    });
    if (containerRef) observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  function handleMouseMove(e: MouseEvent) {
    const canvas = canvasRef;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const n = selectedTickers().length;
    const padLeft = 60;
    const padTop = 60;
    const cellW = (canvas.clientWidth - padLeft) / n;
    const cellH = (canvas.clientHeight - padTop) / n;
    const col = Math.floor((x - padLeft) / cellW);
    const row = Math.floor((y - padTop) / cellH);
    if (row >= 0 && row < n && col >= 0 && col < n) {
      setHoverIdx({ row, col });
      drawMatrix(canvas, selectedTickers(), matrix(), { row, col });
    } else {
      setHoverIdx(null);
      drawMatrix(canvas, selectedTickers(), matrix(), null);
    }
  }

  function handleMouseLeave() {
    setHoverIdx(null);
    if (canvasRef) drawMatrix(canvasRef, selectedTickers(), matrix(), null);
  }

  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  const [addQuery, setAddQuery] = createSignal('');
  const [addOpen, setAddOpen] = createSignal(false);

  const availableETFs = () => {
    const q = addQuery().toLowerCase().trim();
    return props.database
      .filter((e) => !selectedTickers().includes(e.ticker))
      .filter(
        (e) =>
          q.length === 0 || e.ticker.toLowerCase().includes(q) || e.name.toLowerCase().includes(q),
      )
      .slice(0, 10);
  };

  return (
    <div
      ref={containerRef}
      class="border p-6"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <p class="label" style={{ color: accentColor() }}>
          CORRELATION MATRIX
        </p>
        <div
          class="flex items-center gap-2 mt-2 md:mt-0 font-mono text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>1Y Daily Returns</span>
          <span>|</span>
          <span>{selectedTickers().length}/10 ETFs</span>
        </div>
      </div>

      {/* Selected tickers */}
      <div class="flex flex-wrap gap-2 mb-4">
        <For each={selectedTickers()}>
          {(ticker) => (
            <button
              type="button"
              class="font-mono text-xs px-2 py-1 border flex items-center gap-1 transition-colors"
              style={{
                'border-color': accentColor(),
                color: accentColor(),
                background: 'var(--bg-secondary)',
              }}
              onClick={() => removeTicker(ticker)}
            >
              {ticker}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                role="img"
                aria-label={`Remove ${ticker}`}
              >
                <title>{`Remove ${ticker}`}</title>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </For>

        {/* Add ETF */}
        <div class="relative">
          <input
            type="text"
            placeholder="+ Add"
            class="font-mono text-xs px-2 py-1 border bg-transparent outline-none"
            style={{
              'border-color': 'var(--border)',
              color: 'var(--text-primary)',
              width: '80px',
            }}
            value={addQuery()}
            onInput={(e) => {
              setAddQuery(e.currentTarget.value);
              setAddOpen(true);
            }}
            onFocus={() => setAddOpen(true)}
            onBlur={() => setTimeout(() => setAddOpen(false), 150)}
          />
          <Show when={addOpen() && availableETFs().length > 0}>
            <ul
              class="absolute left-0 mt-1 border overflow-y-auto"
              style={{
                'border-color': 'var(--border)',
                background: 'var(--bg-secondary)',
                'max-height': '160px',
                width: '200px',
                'z-index': 'var(--z-overlay)',
              }}
            >
              <For each={availableETFs()}>
                {(entry) => (
                  <li
                    class="px-3 py-2 cursor-pointer text-xs font-mono border-b"
                    style={{
                      'border-color': 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTicker(entry.ticker);
                      setAddQuery('');
                      setAddOpen(false);
                    }}
                  >
                    <span style={{ color: accentColor() }}>{entry.ticker}</span>
                    <span class="ml-2" style={{ color: 'var(--text-secondary)' }}>
                      {entry.name}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </div>

      {/* Matrix Canvas */}
      <Show when={selectedTickers().length >= 2}>
        <div
          class="border"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          <canvas
            ref={canvasRef}
            class="w-full cursor-crosshair"
            style={{ height: '400px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="img"
            aria-label="ETF correlation matrix heatmap"
          />
        </div>
      </Show>

      {/* Hover tooltip */}
      <Show when={hoverIdx()}>
        <div class="mt-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: accentColor() }}>{selectedTickers()[hoverIdx()?.row]}</span>
          {' × '}
          <span style={{ color: accentColor() }}>{selectedTickers()[hoverIdx()?.col]}</span>
          {' = '}
          <span class="font-bold" style={{ color: 'var(--text-primary)' }}>
            {matrix()[hoverIdx()?.row][hoverIdx()?.col].toFixed(4)}
          </span>
        </div>
      </Show>

      <Show when={selectedTickers().length < 2}>
        <div class="text-center py-12 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Add at least 2 ETFs to generate a correlation matrix
        </div>
      </Show>
    </div>
  );
}

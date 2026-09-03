import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { renderPlychart, usePlychartAuto } from '../../lib/plychart-render';
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
  });

  function renderChart() {
    const tickers = selectedTickers();
    const mat = matrix();
    if (tickers.length < 2 || mat.length === 0) return;
    renderPlychart('corr-matrix', 'update_heatmap', JSON.stringify(mat), '');
  }

  createEffect(() => {
    selectedTickers();
    matrix();
    renderChart();
  });

  usePlychartAuto(() => 'corr-matrix', renderChart);

  onMount(() => {
    const tickers = selectedTickers();
    setMatrix(generateCorrelation(tickers));
  });

  function handleMouseMove(e: MouseEvent) {
    const canvas = document.getElementById('corr-matrix') as HTMLCanvasElement | null;
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
    } else {
      setHoverIdx(null);
    }
  }

  function handleMouseLeave() {
    setHoverIdx(null);
  }

  const accentColor = () => {
    return '#00e5ff';
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

      <Show when={selectedTickers().length >= 2}>
        <div
          class="border"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          <canvas
            id="corr-matrix"
            class="w-full cursor-crosshair"
            style={{ height: '400px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="img"
            aria-label="ETF correlation matrix heatmap"
          />
        </div>
      </Show>

      <Show when={hoverIdx()}>
        <div class="mt-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: accentColor() }}>{selectedTickers()[hoverIdx()?.row ?? 0]}</span>
          {' × '}
          <span style={{ color: accentColor() }}>{selectedTickers()[hoverIdx()?.col ?? 0]}</span>
          {' = '}
          <span class="font-bold" style={{ color: 'var(--text-primary)' }}>
            {matrix()[hoverIdx()?.row ?? 0][hoverIdx()?.col ?? 0].toFixed(4)}
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

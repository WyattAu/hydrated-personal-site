import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const H = 280;
const CANVAS_ID = 'sector-rotation';

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

  // Sorted descending by relative strength (same ordering the manual draw used)
  const sortedRows = () => [...rows()].sort((a, b) => b.rs - a.rs);

  function renderChart() {
    const list = sortedRows();
    if (list.length === 0) return;
    const bars = list.map((r) => ({
      time: 0,
      open: 0,
      high: 0,
      low: 0,
      close: r.rs,
      volume: 0,
    }));
    renderPlychart(CANVAS_ID, 'update_bar', JSON.stringify(bars), '');
  }

  createEffect(() => {
    sortedRows();
    renderChart();
  });

  usePlychartAuto(() => CANVAS_ID, renderChart);

  onMount(() => {
    loadData();
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

      <canvas id={CANVAS_ID} class="w-full" style={{ height: `${H}px` }} />

      <Show when={!loading() && rows().length > 0}>
        <div class="mt-2 font-mono text-[10px]">
          <For each={sortedRows()}>
            {(row) => (
              <div class="flex items-center justify-between py-0.5">
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span
                  style={{
                    color: row.rs >= 0 ? 'var(--positive, #4caf50)' : 'var(--negative, #ff5252)',
                  }}
                >
                  {row.rs >= 0 ? '+' : ''}
                  {row.rs.toFixed(2)}%
                </span>
              </div>
            )}
          </For>
        </div>

        <div
          class="flex items-center gap-4 mt-2 font-mono text-[9px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#4caf50' }} />
            OUTPERFORM
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#ff5252' }} />
            LAGGING
          </span>
        </div>

        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          3-month relative strength vs S&amp;P 500 | Green = outperforming | Red = lagging
        </p>
      </Show>
    </div>
  );
}

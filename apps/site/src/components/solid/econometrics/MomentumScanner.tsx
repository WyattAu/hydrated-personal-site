import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';

interface Row {
  symbol: string;
  label: string;
  r1w: number;
  r1m: number;
  r3m: number;
  r1y: number;
  z: number;
}

async function fetchCloses(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
}

function periodReturn(closes: number[], days: number): number {
  const n = closes.length;
  if (n < days + 1) return 0;
  const base = closes[n - 1 - days];
  if (!base || base <= 0) return 0;
  return closes[n - 1] / base - 1;
}

function standardize(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  let mean = 0;
  for (const v of values) mean += v;
  mean /= n;
  let variance = 0;
  for (const v of values) variance += (v - mean) ** 2;
  const std = Math.sqrt(variance / n) || 1;
  return values.map((v) => (v - mean) / std);
}

type SortKey = 'ticker' | '1w' | '1m' | '3m' | '1y' | 'z';

export default function MomentumScanner() {
  const [rows, setRows] = createSignal<Row[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey>('z');
  const [sortDir, setSortDir] = createSignal(1);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length === 0) throw new Error('No tickers selected');

      const fetched = await Promise.all(
        tickers.map(async (t) => ({ entry: t, closes: await fetchCloses(t.symbol, '1y') })),
      );
      const valid = fetched.filter((f) => f.closes.length >= 10);
      if (valid.length === 0) throw new Error('Insufficient data');

      const r1w = valid.map((f) => periodReturn(f.closes, 5));
      const r1m = valid.map((f) => periodReturn(f.closes, 21));
      const r3m = valid.map((f) => periodReturn(f.closes, 63));
      const r1y = valid.map((f) => periodReturn(f.closes, 252));

      const z1w = standardize(r1w);
      const z1m = standardize(r1m);
      const z3m = standardize(r3m);
      const z1y = standardize(r1y);

      const out: Row[] = valid.map((f, i) => {
        const z = (z1w[i] + z1m[i] + z3m[i] + z1y[i]) / 4;
        return {
          symbol: f.entry.symbol,
          label: f.entry.label,
          r1w: r1w[i] ?? 0,
          r1m: r1m[i] ?? 0,
          r3m: r3m[i] ?? 0,
          r1y: r1y[i] ?? 0,
          z: Number.isFinite(z) ? z : 0,
        };
      });
      setRows(out);
    } catch (e) {
      console.error('[MomentumScanner]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const sorted = createMemo(() => {
    const r = rows();
    const dir = sortDir();
    const key = sortKey();
    return [...r].sort((a, b) => {
      let va: number;
      let vb: number;
      if (key === 'ticker') {
        return a.label.localeCompare(b.label) * dir;
      }
      if (key === '1w') {
        va = a.r1w;
        vb = b.r1w;
      } else if (key === '1m') {
        va = a.r1m;
        vb = b.r1m;
      } else if (key === '3m') {
        va = a.r3m;
        vb = b.r3m;
      } else if (key === '1y') {
        va = a.r1y;
        vb = b.r1y;
      } else {
        va = a.z;
        vb = b.z;
      }
      return (va - vb) * dir;
    });
  });

  function toggleSort(key: SortKey) {
    if (sortKey() === key) setSortDir(-sortDir());
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function sortMark(key: SortKey) {
    return sortKey() === key ? (sortDir() > 0 ? ' <' : ' >') : '';
  }

  function pct(v: number): string {
    return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
  }

  function cellColor(v: number): string {
    return v > 0 ? '#4caf50' : v < 0 ? '#ff5252' : 'var(--text-secondary)';
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  const thClass =
    'cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider px-2 py-1';

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          MOMENTUM SCANNER
        </p>
        <Show when={!loading() && rows().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {rows().length} tickers | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Scanning momentum...
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
        <div class="overflow-x-auto">
          <table class="border-collapse w-full">
            <thead>
              <tr>
                <th
                  class={`${thClass} text-left`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('ticker')}
                >
                  Ticker{sortMark('ticker')}
                </th>
                <th
                  class={`${thClass} text-right`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('1w')}
                >
                  1W{sortMark('1w')}
                </th>
                <th
                  class={`${thClass} text-right`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('1m')}
                >
                  1M{sortMark('1m')}
                </th>
                <th
                  class={`${thClass} text-right`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('3m')}
                >
                  3M{sortMark('3m')}
                </th>
                <th
                  class={`${thClass} text-right`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('1y')}
                >
                  1Y{sortMark('1y')}
                </th>
                <th
                  class={`${thClass} text-right`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('z')}
                >
                  Z-Score{sortMark('z')}
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={sorted()}>
                {(row) => (
                  <tr style={{ 'border-top': '1px solid var(--border)' }}>
                    <td
                      class="font-mono text-[9px] px-2 py-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {row.label}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: cellColor(row.r1w) }}
                    >
                      {pct(row.r1w)}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: cellColor(row.r1m) }}
                    >
                      {pct(row.r1m)}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: cellColor(row.r3m) }}
                    >
                      {pct(row.r3m)}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: cellColor(row.r1y) }}
                    >
                      {pct(row.r1y)}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right font-bold"
                      style={{ color: cellColor(row.z) }}
                    >
                      {row.z >= 0 ? '+' : ''}
                      {row.z.toFixed(2)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <p class="font-mono text-[9px] mt-3" style={{ color: 'var(--text-secondary)' }}>
          Returns across timeframes | Z-Score = cross-period standardized average
        </p>
      </Show>
    </div>
  );
}

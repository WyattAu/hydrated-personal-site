import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface AssetData {
  label: string;
  rets: number[];
}

function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

async function fetchRets(symbol: string): Promise<number[]> {
  const res = await fetch(
    `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=3mo&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  return logReturns(closes);
}

export default function TailDependenceMatrix() {
  const [data, setData] = createSignal<AssetData[]>([]);
  const [matrix, setMatrix] = createSignal<number[][]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [hoverCell, setHoverCell] = createSignal<{ row: number; col: number } | null>(null);
  const [sortKey, setSortKey] = createSignal<string | null>(null);
  const [sortDir, setSortDir] = createSignal(1);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 2) throw new Error('Need at least 2 tickers');

      const fetched = await Promise.all(
        tickers.map(async (t) => ({ entry: t, rets: await fetchRets(t.symbol) })),
      );
      const valid = fetched
        .filter((f) => f.rets.length >= 20)
        .map((f) => ({ label: f.entry.label, rets: f.rets }));
      if (valid.length < 2) throw new Error('Insufficient data');

      const nAssets = valid.length;
      const nPeriods = Math.min(...valid.map((v) => v.rets.length));
      const flat = new Float64Array(nAssets * nPeriods);
      for (let i = 0; i < nAssets; i++) {
        for (let j = 0; j < nPeriods; j++) flat[i * nPeriods + j] = valid[i].rets[j];
      }

      const wasmMod = await getWasmMod();
      const out = wasmMod.quant_tail_matrix(flat, nAssets, nPeriods);
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed?.matrix)) throw new Error('Invalid tail matrix output');

      const nn: number = parsed.n_assets ?? nAssets;
      const m: number[][] = [];
      for (let i = 0; i < nn; i++) {
        m.push([]);
        for (let j = 0; j < nn; j++) {
          m[i].push(parsed.matrix[i * nn + j] ?? 0);
        }
      }

      setData(valid);
      setMatrix(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setData([]);
      setMatrix([]);
    } finally {
      setLoading(false);
    }
  }

  function tailColor(v: number): string {
    const abs = Math.min(1, Math.max(0, v));
    return `rgba(255, 60, 60, ${abs * 0.9})`;
  }

  const order = createMemo(() => {
    const d = data();
    if (d.length === 0) return [];
    const indices = d.map((_, i) => i);
    const key = sortKey();
    if (!key) return indices;
    const dir = sortDir();
    const avg = (idx: number) => {
      const mm = matrix();
      if (mm.length === 0) return 0;
      let sum = 0;
      for (let j = 0; j < mm.length; j++) if (j !== idx) sum += mm[idx][j] ?? 0;
      return sum / Math.max(1, mm.length - 1);
    };
    indices.sort((a, b) => {
      let va: number;
      let vb: number;
      if (key === 'label') {
        va = d[a].label.charCodeAt(0);
        vb = d[b].label.charCodeAt(0);
      } else if (key === 'tail') {
        va = avg(a);
        vb = avg(b);
      } else {
        return 0;
      }
      return (va - vb) * dir;
    });
    return indices;
  });

  function avgTail(idx: number): number {
    const m = matrix();
    if (m.length === 0) return 0;
    let sum = 0;
    for (let j = 0; j < m.length; j++) if (j !== idx) sum += m[idx][j] ?? 0;
    return sum / Math.max(1, m.length - 1);
  }

  function toggleSort(key: string) {
    if (sortKey() === key) setSortDir(-sortDir());
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          TAIL DEPENDENCE MATRIX
        </p>
        <Show when={!loading() && data().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {data().length} assets | 3M daily returns
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing tail dependence...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && data().length > 0 && matrix().length > 0}>
        <div class="overflow-x-auto">
          <table class="border-collapse w-full" style={{ 'border-spacing': '1px' }}>
            <thead>
              <tr>
                <th
                  class="cursor-pointer select-none font-mono text-[9px] uppercase tracking-wider px-2 py-1 text-left"
                  style={{ color: 'var(--text-secondary)', 'min-width': '60px' }}
                  onClick={() => toggleSort('label')}
                >
                  Asset {sortKey() === 'label' ? (sortDir() > 0 ? ' <' : ' >') : ''}
                </th>
                <For each={order()}>
                  {(ci) => (
                    <th
                      class="font-mono text-[8px] px-1 py-1 text-center select-none"
                      style={{
                        color:
                          hoverCell() && (hoverCell()?.row === ci || hoverCell()?.col === ci)
                            ? 'var(--accent)'
                            : 'var(--text-secondary)',
                        'min-width': '36px',
                        transition: 'color 0.15s',
                      }}
                    >
                      {data()[ci].label}
                    </th>
                  )}
                </For>
                <th
                  class="cursor-pointer select-none font-mono text-[9px] uppercase tracking-wider px-2 py-1 text-right"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('tail')}
                >
                  Avg {sortKey() === 'tail' ? (sortDir() > 0 ? ' <' : ' >') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={order()}>
                {(ri) => (
                  <tr>
                    <td
                      class="font-mono text-[10px] px-2 py-1 font-bold select-none cursor-pointer"
                      style={{
                        color:
                          hoverCell() && (hoverCell()?.row === ri || hoverCell()?.col === ri)
                            ? 'var(--accent)'
                            : 'var(--text-primary)',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={() => setHoverCell({ row: ri, col: -1 })}
                      onMouseLeave={() => setHoverCell(null)}
                    >
                      {data()[ri].label}
                    </td>
                    <For each={order()}>
                      {(ci) => {
                        const v = matrix()[ri][ci] ?? 0;
                        const isDiag = ri === ci;
                        const hv = hoverCell();
                        const isHovered =
                          hv && (hv.row === ri || hv.col === ri || hv.row === ci || hv.col === ci);
                        return (
                          <td
                            class="font-mono text-[9px] text-center select-none cursor-pointer"
                            style={{
                              background: isDiag ? 'var(--bg-secondary)' : tailColor(v),
                              color: v > 0.5 ? '#fff' : 'var(--text-secondary)',
                              opacity: hv && !isHovered && !isDiag ? 0.4 : 1,
                              'min-width': '36px',
                              height: '24px',
                              transition: 'opacity 0.15s',
                              'font-weight': isHovered ? 'bold' : 'normal',
                            }}
                            onMouseEnter={() => setHoverCell({ row: ri, col: ci })}
                            onMouseLeave={() => setHoverCell(null)}
                          >
                            {v.toFixed(2)}
                          </td>
                        );
                      }}
                    </For>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {avgTail(ri).toFixed(2)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <div
          class="mt-3 p-2 border flex items-center justify-between flex-wrap gap-2"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
            'min-height': '32px',
          }}
        >
          <Show
            when={hoverCell() && hoverCell()?.col >= 0 && hoverCell()?.row !== hoverCell()?.col}
            fallback={
              <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Hover any cell to see tail dependence. Click headers to sort.
              </p>
            }
          >
            <p class="font-mono text-[10px]" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)' }}>{data()[hoverCell()?.row].label}</span>
              {' vs '}
              <span style={{ color: 'var(--accent)' }}>{data()[hoverCell()?.col].label}</span>
              {' : '}
              <span
                style={{
                  color:
                    matrix()[hoverCell()?.row][hoverCell()?.col] > 0.3
                      ? '#ff5252'
                      : 'var(--text-secondary)',
                  'font-weight': 'bold',
                }}
              >
                {(matrix()[hoverCell()?.row][hoverCell()?.col] ?? 0).toFixed(4)}
              </span>
            </p>
            <p
              class="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              {(() => {
                const val = matrix()[hoverCell()?.row][hoverCell()?.col] ?? 0;
                return val > 0.5 ? 'HIGH CRASH LINK' : val > 0.2 ? 'MODERATE' : 'LOW';
              })()}
            </p>
          </Show>
        </div>

        <div
          class="mt-2 flex items-center gap-4 font-mono text-[9px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div class="flex items-center gap-1">
            <div style={{ width: '12px', height: '12px', background: 'rgba(255,60,60,0.9)' }} />
            <span>high tail dep</span>
          </div>
          <span>| 5% lower tail</span>
        </div>
      </Show>

      <p class="font-mono text-[10px] mt-3" style={{ color: 'var(--text-secondary)' }}>
        5% lower tail | P(both crash together) | Pearson correlation misses this
      </p>
    </div>
  );
}

import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface PairResult {
  yLabel: string;
  xLabel: string;
  hedge_ratio: number;
  adf_statistic: number;
  half_life: number;
  is_cointegrated: boolean;
  z_score: number;
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

export default function CointegrationScanner() {
  const [results, setResults] = createSignal<PairResult[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<'adf' | 'hl' | 'z' | 'pair'>('adf');
  const [sortDir, setSortDir] = createSignal(1);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 2) throw new Error('Need at least 2 tickers');

      const wasmMod = await getWasmMod();

      const series = await Promise.all(
        tickers.map(async (t) => ({ entry: t, closes: await fetchCloses(t.symbol, '1y') })),
      );
      const valid = series.filter((s) => s.closes.length >= 30);

      const out: PairResult[] = [];
      for (let i = 0; i < valid.length; i++) {
        for (let j = i + 1; j < valid.length; j++) {
          const y = valid[i];
          const x = valid[j];
          const len = Math.min(y.closes.length, x.closes.length);
          const yC = new Float64Array(len);
          const xC = new Float64Array(len);
          for (let k = 0; k < len; k++) {
            yC[k] = y.closes[k];
            xC[k] = x.closes[k];
          }
          const json = wasmMod.quant_cointegration(yC, xC);
          const raw = JSON.parse(json);
          if (!raw || raw.hedge_ratio === undefined || raw.hedge_ratio === null) continue;
          out.push({
            yLabel: y.entry.label,
            xLabel: x.entry.label,
            hedge_ratio: raw.hedge_ratio ?? 0,
            adf_statistic: raw.adf_statistic ?? 0,
            half_life: raw.half_life ?? 9999,
            is_cointegrated: !!raw.is_cointegrated,
            z_score: raw.z_score ?? 0,
          });
        }
      }
      if (out.length === 0) throw new Error('Insufficient data');
      setResults(out);
    } catch (e) {
      console.error('[CointegrationScanner]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  const sorted = createMemo(() => {
    const r = results();
    const dir = sortDir();
    const key = sortKey();
    return [...r].sort((a, b) => {
      let va: number;
      let vb: number;
      if (key === 'pair') {
        va = a.yLabel.charCodeAt(0);
        vb = b.yLabel.charCodeAt(0);
      } else if (key === 'hl') {
        va = a.half_life;
        vb = b.half_life;
      } else if (key === 'z') {
        va = Math.abs(a.z_score);
        vb = Math.abs(b.z_score);
      } else {
        va = a.adf_statistic;
        vb = b.adf_statistic;
      }
      return (va - vb) * dir;
    });
  });

  function toggleSort(key: 'adf' | 'hl' | 'z' | 'pair') {
    if (sortKey() === key) setSortDir(-sortDir());
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function sortMark(key: 'adf' | 'hl' | 'z' | 'pair') {
    return sortKey() === key ? (sortDir() > 0 ? ' <' : ' >') : '';
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          COINTEGRATION SCANNER
        </p>
        <Show when={!loading() && results().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {results().length} pairs | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing cointegration...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && results().length === 0}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <Show when={!loading() && results().length > 0}>
        <div class="overflow-x-auto">
          <table class="border-collapse w-full">
            <thead>
              <tr>
                <th
                  class="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-left"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('pair')}
                >
                  Pair{sortMark('pair')}
                </th>
                <th
                  class="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-right"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('adf')}
                >
                  ADF Stat{sortMark('adf')}
                </th>
                <th
                  class="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-right"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('hl')}
                >
                  Half-Life{sortMark('hl')}
                </th>
                <th
                  class="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-right"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('z')}
                >
                  Z-Score{sortMark('z')}
                </th>
                <th
                  class="font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-center"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Status
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
                      {row.yLabel} / {row.xLabel}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {row.adf_statistic.toFixed(3)}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {row.half_life > 9000 ? 'inf' : row.half_life.toFixed(1)}
                    </td>
                    <td
                      class="font-mono text-[9px] px-2 py-1 text-right"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {row.z_score.toFixed(2)}
                    </td>
                    <td class="font-mono text-[9px] px-2 py-1 text-center font-bold">
                      <span style={{ color: row.is_cointegrated ? '#4caf50' : '#ff5252' }}>
                        {row.is_cointegrated ? 'COINTEGRATED' : 'NOT'}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <p class="font-mono text-[9px] mt-3" style={{ color: 'var(--text-secondary)' }}>
          Engle-Granger 2-step | 5% significance | MacKinnon critical value -3.34
        </p>
      </Show>
    </div>
  );
}

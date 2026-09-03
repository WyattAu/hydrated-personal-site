import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getPlychart } from '../../../lib/plychart-loader';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

const H = 280;
const CANVAS_ID = 'hrp-alloc';

async function fetchRets(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

export default function HrpAllocation() {
  const [labels, setLabels] = createSignal<string[]>([]);
  const [weights, setWeights] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 2) throw new Error('Need at least 2 tickers');

      const fetched = await Promise.all(tickers.map((t) => fetchRets(t.symbol, '1y')));
      const validIdx: number[] = [];
      const validRets: number[][] = [];
      tickers.forEach((_t, i) => {
        if (fetched[i].length >= 30) {
          validIdx.push(i);
          validRets.push(fetched[i]);
        }
      });
      if (validRets.length < 2) throw new Error('Insufficient data');

      const nAssets = validRets.length;
      const nPeriods = Math.min(...validRets.map((r) => r.length));
      const flat = new Float64Array(nAssets * nPeriods);
      for (let i = 0; i < nAssets; i++) {
        for (let j = 0; j < nPeriods; j++) flat[i * nPeriods + j] = validRets[i][j];
      }

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_hrp(flat, nAssets, nPeriods);
      const parsed = JSON.parse(json);
      if (
        !parsed.weights ||
        !Array.isArray(parsed.weights) ||
        parsed.weights.some((w: unknown) => w === null || Number.isNaN(w))
      ) {
        throw new Error('HRP computation failed - check ticker data');
      }
      setWeights(parsed.weights.map((w: number | null) => w ?? 0));
      setLabels(validIdx.map((i) => tickers[i].label));
    } catch (e) {
      console.error('[HrpAllocation]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setWeights([]);
      setLabels([]);
    } finally {
      setLoading(false);
    }
  }

  // Sorted descending by weight (same ordering the manual draw used)
  const sorted = () =>
    labels()
      .map((label, i) => ({ label, w: weights()[i] ?? 0 }))
      .sort((a, b) => b.w - a.w);

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
      if (canvas) {
        const w = canvas.clientWidth || 600;
        p.create_chart(CANVAS_ID, w, H);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const rows = sorted();
    const ready = wasmReady();
    if (rows.length === 0 || !ready) return;
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) return;
    getPlychart().then((p) => {
      const w = canvas.clientWidth || 600;
      p.create_chart(CANVAS_ID, w, H);
      const bars = rows.map((r) => ({
        time: 0,
        open: 0,
        high: 0,
        low: 0,
        close: r.w,
        volume: 0,
      }));
      p.update_bar(CANVAS_ID, JSON.stringify(bars), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  onTickersChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          HRP ALLOCATION
        </p>
        <Show when={!loading() && weights().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {labels().length} assets | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing HRP allocation...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && weights().length === 0}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <canvas id={CANVAS_ID} class="w-full" style={{ height: `${H}px` }} />

      <Show when={!loading() && weights().length > 0}>
        <div class="mt-2 font-mono text-[10px]">
          <For each={sorted()}>
            {(row) => (
              <div class="flex items-center justify-between py-0.5">
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ color: '#4caf50' }}>{(row.w * 100).toFixed(1)}%</span>
              </div>
            )}
          </For>
        </div>

        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Hierarchical Risk Parity | Distance-correlation clustering | Recursive bisection | No
          matrix inversion
        </p>
      </Show>
    </div>
  );
}

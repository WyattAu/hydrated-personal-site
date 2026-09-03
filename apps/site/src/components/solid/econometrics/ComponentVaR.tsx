import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface VarResult {
  portfolio_var: number;
  contributions: number[];
  percentages: number[];
  total_var: number;
}

const H = 280;
const CANVAS_ID = 'component-var';

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

export default function ComponentVaR() {
  const [labels, setLabels] = createSignal<string[]>([]);
  const [data, setData] = createSignal<VarResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

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
      const w = new Float64Array(nAssets);
      const eq = 1 / nAssets;
      for (let i = 0; i < nAssets; i++) w[i] = eq;

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_component_var(flat, nAssets, nPeriods, w, 0.05);
      const parsed = JSON.parse(json);
      if (!parsed.contributions || !Array.isArray(parsed.contributions)) {
        throw new Error('Component VaR computation failed');
      }
      setData({
        portfolio_var: parsed.portfolio_var ?? 0,
        contributions: Array.isArray(parsed.contributions)
          ? parsed.contributions.map((v: number | null) => v ?? 0)
          : [],
        percentages: Array.isArray(parsed.percentages)
          ? parsed.percentages.map((v: number | null) => v ?? 0)
          : [],
        total_var: parsed.total_var ?? 0,
      });
      setLabels(validIdx.map((i) => tickers[i].label));
    } catch (e) {
      console.error('[ComponentVaR]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const d = data();
    if (!d) return;
    const bars = (d.percentages ?? []).map((v) => ({
      time: 0,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    renderPlychart(CANVAS_ID, 'update_bar', JSON.stringify(bars), '');
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => CANVAS_ID, renderChart);

  onMount(() => {
    loadData();
  });

  onTickersChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          COMPONENT VaR DECOMPOSITION
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {labels().length} assets | 1Y daily | 95%
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing component VaR...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && !data()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <canvas id={CANVAS_ID} class="w-full" style={{ height: `${H}px` }} />

      <Show when={!loading() && data()}>
        <div class="mt-2 font-mono text-[10px]">
          <For each={labels()}>
            {(lab, i) => {
              const v = () => data()?.percentages[i()] ?? 0;
              return (
                <div class="flex items-center justify-between py-0.5">
                  <span style={{ color: 'var(--text-secondary)' }}>{lab}</span>
                  <span style={{ color: v() >= 0 ? '#ff5252' : '#00a0ff' }}>
                    {(v() * 100).toFixed(1)}%
                  </span>
                </div>
              );
            }}
          </For>
        </div>

        <div
          class="flex items-center gap-4 mt-2 font-mono text-[9px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#ff5252' }} />
            RISK-ADDER
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#00a0ff' }} />
            DIVERSIFIER
          </span>
        </div>

        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          95% VaR | Leave-one-out decomposition | Positive = risk contributor | Negative =
          diversifier
        </p>
      </Show>
    </div>
  );
}

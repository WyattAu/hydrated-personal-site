import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getWasmMod } from '../../../lib/wasm-loader';

interface KellyResult {
  full_kelly: number;
  half_kelly: number;
  quarter_kelly: number;
  win_rate: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  geometric_growth: number;
}

interface Card {
  label: string;
  value: number;
  suffix: string;
  pct: boolean;
  kelly: boolean;
}

export default function KellyCalculator() {
  const [data, setData] = createSignal<KellyResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 30) throw new Error('Insufficient data');

      const rets = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) rets[i - 1] = Math.log(closes[i] / closes[i - 1]);

      const wasmMod = await getWasmMod();
      const json2 = wasmMod.quant_kelly(rets);
      setData(JSON.parse(json2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  function kellyColor(v: number): string {
    if (v > 0) return '#4caf50';
    if (v < 0) return '#ff5252';
    return '#888888';
  }

  function cards(d: KellyResult): Card[] {
    return [
      { label: 'FULL KELLY', value: d.full_kelly, suffix: '%', pct: true, kelly: true },
      { label: 'HALF KELLY', value: d.half_kelly, suffix: '%', pct: true, kelly: true },
      { label: 'QUARTER KELLY', value: d.quarter_kelly, suffix: '%', pct: true, kelly: true },
      { label: 'WIN RATE', value: d.win_rate, suffix: '%', pct: true, kelly: false },
      { label: 'PROFIT FACTOR', value: d.profit_factor, suffix: '', pct: false, kelly: false },
      { label: 'GEOMETRIC GROWTH', value: d.geometric_growth, suffix: '%', pct: true, kelly: true },
    ];
  }

  function fmt(card: Card): string {
    if (card.pct) return `${(card.value * 100).toFixed(2)}${card.suffix}`;
    return card.value.toFixed(3);
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          KELLY CRITERION
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing Kelly...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => (
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cards(d).map((card) => (
              <div
                class="border p-3 flex flex-col gap-1"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {card.label}
                </p>
                <p
                  class="font-mono text-lg font-bold"
                  style={{ color: card.kelly ? kellyColor(card.value) : 'var(--accent)' }}
                >
                  {fmt(card)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Show>
    </div>
  );
}

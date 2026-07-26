import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getWasmMod } from '../../../lib/wasm-loader';

interface LiquidityResult {
  amihud: number;
  cs_spread: number;
  roll_spread: number;
  kyle_lambda: number;
  avg_dollar_volume: number;
}

interface Card {
  label: string;
  value: string;
  desc: string;
}

export default function LiquidityMetrics() {
  const [data, setData] = createSignal<LiquidityResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=3mo&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const highs: number[] = (quote?.high ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      const lows: number[] = (quote?.low ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      const volumes: number[] = (quote?.volume ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 20) throw new Error('Insufficient data');

      const wasmMod = await getWasmMod();
      const json2 = wasmMod.quant_liquidity(
        Float64Array.from(highs),
        Float64Array.from(lows),
        Float64Array.from(closes),
        Float64Array.from(volumes),
      );
      const raw = JSON.parse(json2);
      setData({
        amihud: raw.amihud ?? 0,
        cs_spread: raw.cs_spread ?? 0,
        roll_spread: raw.roll_spread ?? 0,
        kyle_lambda: raw.kyle_lambda ?? 0,
        avg_dollar_volume: raw.avg_dollar_volume ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  function fmtAmihud(v: number): string {
    if (v === 0 || !Number.isFinite(v)) return 'N/A';
    if (v < 1e-9) return `${(v * 1e12).toFixed(1)} fp`;
    if (v < 1e-6) return `${(v * 1e9).toFixed(1)} np`;
    if (v < 1e-3) return `${(v * 1e6).toFixed(2)} \u00b5p`;
    if (v < 1) return `${(v * 1e3).toFixed(2)} bp`;
    return v.toFixed(2);
  }

  function fmtVolume(v: number): string {
    if (v === 0 || !Number.isFinite(v)) return 'N/A';
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }

  function fmtRoll(v: number): string {
    if (v === 0 || !Number.isFinite(v)) return 'N/A';
    if (v < 0.01) return `${(v * 10000).toFixed(1)} bps`;
    return v.toFixed(2);
  }

  function fmtKyle(v: number): string {
    if (v === 0 || !Number.isFinite(v)) return 'N/A';
    if (v < 1e-9) return `${(v * 1e12).toFixed(1)}e-12`;
    if (v < 1e-6) return `${(v * 1e9).toFixed(2)}e-9`;
    return v.toExponential(2);
  }

  function cards(d: LiquidityResult): Card[] {
    return [
      {
        label: 'AMIHUD ILLIQUIDITY',
        value: fmtAmihud(d.amihud),
        desc: 'Return per $1M traded (lower = more liquid)',
      },
      {
        label: 'CS EFFECTIVE SPREAD',
        value: `${((d.cs_spread ?? 0) * 100).toFixed(3)}%`,
        desc: 'Bid-ask from H/L range',
      },
      {
        label: 'ROLL SPREAD',
        value: fmtRoll(d.roll_spread),
        desc: 'Implicit spread from return autocovariance',
      },
      {
        label: "KYLE'S LAMBDA",
        value: fmtKyle(d.kyle_lambda),
        desc: 'Price impact coefficient (\u0394P per unit flow)',
      },
      {
        label: 'AVG DAILY VOLUME',
        value: fmtVolume(d.avg_dollar_volume),
        desc: 'Mean dollar volume traded per day',
      },
    ];
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          LIQUIDITY METRICS
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 3M daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing liquidity...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => (
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <For each={cards(d)}>
              {(card) => (
                <div
                  class="border p-3 flex flex-col gap-1"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <p
                    class="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: 'var(--accent)' }}
                  >
                    {card.label}
                  </p>
                  <p class="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {card.value}
                  </p>
                  <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                    {card.desc}
                  </p>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  );
}

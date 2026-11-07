import { Show, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';

interface RangeData {
  wHigh: number;
  wLow: number;
  cmpHigh: number;
  cmpLow: number;
  current: number;
}

async function fetchRangeData(symbol: string): Promise<RangeData | null> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  if (closes.length === 0) return null;
  const cmpHigh = closes.reduce((a, b) => (b > a ? b : a), closes[0]);
  const cmpLow = closes.reduce((a, b) => (b < a ? b : a), closes[0]);
  const wHigh = Number(meta?.fiftyTwoWeekHigh ?? cmpHigh);
  const wLow = Number(meta?.fiftyTwoWeekLow ?? cmpLow);
  const current = Number(meta?.regularMarketPrice ?? closes[closes.length - 1]);
  if (!Number.isFinite(wHigh) || !Number.isFinite(wLow) || wHigh <= 0 || wLow <= 0) {
    return { wHigh: cmpHigh, wLow: cmpLow, cmpHigh, cmpLow, current };
  }
  return { wHigh, wLow, cmpHigh, cmpLow, current };
}

export default function WeekRange52() {
  const [data, setData] = createSignal<RangeData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchRangeData(activeAsset());
      if (!d) throw new Error('No chart data');
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          52-WEEK RANGE
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 1Y
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading 52-week range...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => {
          const range = d.wHigh - d.wLow || 1;
          const pos = Math.max(0, Math.min(1, (d.current - d.wLow) / range));
          // Clamp so the price label never clips at the edges
          const markerPct = Math.max(4, Math.min(96, pos * 100));
          return (
            <div class="py-4">
              <div class="relative">
                {/* Current price label + triangle marker */}
                <div
                  class="absolute -top-1 flex flex-col items-center"
                  style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }}
                >
                  <span
                    class="font-mono text-[9px] mb-0.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {d.current.toFixed(2)}
                  </span>
                  <div
                    style={{
                      width: '0',
                      height: '0',
                      'border-left': '6px solid transparent',
                      'border-right': '6px solid transparent',
                      'border-top': '10px solid var(--text-primary)',
                    }}
                  />
                </div>

                {/* Gradient gauge: red (low) -> yellow (mid) -> green (high) */}
                <div
                  class="h-3.5 w-full mt-4"
                  style={{
                    background: 'linear-gradient(to right, #ff5252, #ffc107, #4caf50)',
                    border: '1px solid var(--border)',
                  }}
                />

                {/* Low / High labels */}
                <div class="flex justify-between mt-1 font-mono text-[9px]">
                  <span style={{ color: 'var(--negative, #ff5252)' }}>{d.wLow.toFixed(2)}</span>
                  <span style={{ color: 'var(--positive, #4caf50)' }}>{d.wHigh.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        }}
      </Show>

      <Show when={!loading() && data()}>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Position within 52-week trading range
        </p>
      </Show>
    </div>
  );
}

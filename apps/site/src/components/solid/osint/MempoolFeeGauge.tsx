import { For, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * MempoolFeeGauge — Bitcoin fee market from the site's mempool.space-proxied
 * /api/mempool endpoint: recommended fee tiers + mempool size snapshot.
 */

interface MempoolPayload {
  fees: {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
    minimumFee: number;
  };
  mempool: {
    count: number;
    vsize: number;
  };
}

export default function MempoolFeeGauge() {
  const [data, setData] = createSignal<MempoolPayload | null>(null);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/mempool`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as MempoolPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'mempool feed unavailable');
    }
  });

  const fees = () => data()?.fees;
  const count = () => data()?.mempool.count ?? 0;
  const congested = () => (fees()?.fastestFee ?? 0) >= 20;

  const tiers = () => {
    const f = fees();
    if (!f) return [];
    return [
      { label: 'NEXT BLOCK', v: f.fastestFee },
      { label: '30 MIN', v: f.halfHourFee },
      { label: '1 HR', v: f.hourFee },
      { label: 'ECONOMY', v: f.economyFee },
    ];
  };

  const maxFee = () => Math.max(...tiers().map((t) => t.v), 1);

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          BTC MEMPOOL
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'MEMPOOL.SPACE'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="flex items-baseline justify-between mb-3">
        <span
          class="font-mono text-2xl font-bold"
          style={{ color: congested() ? 'var(--negative, #ef4444)' : 'var(--text-primary)' }}
        >
          {fees() ? `${fees()?.fastestFee} sat/vB` : '—'}
        </span>
        <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          {count().toLocaleString('en-US')} TX PENDING
        </span>
      </div>
      <div class="space-y-1">
        <For each={tiers()}>
          {(t) => (
            <div class="flex items-center gap-2 font-mono text-[9px]">
              <span class="w-16 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {t.label}
              </span>
              <div class="flex-1 h-1.5" style={{ background: 'var(--border)' }}>
                <div
                  class="h-full"
                  style={{
                    width: `${Math.max(4, (t.v / maxFee()) * 100)}%`,
                    background: t.v >= 20 ? 'var(--negative, #ef4444)' : 'var(--accent)',
                  }}
                />
              </div>
              <span class="w-14 text-right" style={{ color: 'var(--text-primary)' }}>
                {t.v} sat/vB
              </span>
            </div>
          )}
        </For>
      </div>
      <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        next-block fees ≥20 sat/vB flagged as congestion
      </p>
    </div>
  );
}

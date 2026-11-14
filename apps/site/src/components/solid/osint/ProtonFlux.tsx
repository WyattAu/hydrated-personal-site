import { For, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * ProtonFlux — GOES integral proton channels (>=1 / >=10 / >=100 MeV),
 * the NOAA S-scale radiation-storm inputs. >=10 MeV > 10 pfu = S1 storm.
 */

interface ProtonPayload {
  time_tag: string;
  p1: number | null;
  p10: number | null;
  p100: number | null;
}

const CHANNELS = [
  { key: 'p1' as const, label: '≥1 MeV' },
  { key: 'p10' as const, label: '≥10 MeV' },
  { key: 'p100' as const, label: '≥100 MeV' },
];

function stormLevel(p10: number | null): { label: string; color: string } {
  if (p10 === null) return { label: '—', color: 'var(--text-secondary)' };
  if (p10 >= 100) return { label: 'S3', color: 'var(--negative, #ef4444)' };
  if (p10 >= 10) return { label: 'S1', color: 'var(--accent-warm, #ff9800)' };
  return { label: 'BELOW S1', color: 'var(--text-secondary)' };
}

export default function ProtonFlux() {
  const [data, setData] = createSignal<ProtonPayload | null>(null);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/proton-flux`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ProtonPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GOES feed unavailable');
    }
  });

  const p10 = () => data()?.p10 ?? null;
  const storm = () => stormLevel(p10());
  const maxVal = () => Math.max(data()?.p1 ?? 0, data()?.p10 ?? 0, data()?.p100 ?? 0, 1);

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          PROTON FLUX
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'GOES PRIMARY'}
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
          style={{ color: (p10() ?? 0) >= 10 ? 'var(--negative, #ef4444)' : 'var(--text-primary)' }}
        >
          {data() ? `${p10()?.toFixed(2) ?? '—'} pfu` : '—'}
        </span>
        <span class="font-mono text-[9px]" style={{ color: storm().color }}>
          {storm().label}
        </span>
      </div>
      <div class="space-y-1">
        <For each={CHANNELS}>
          {(c) => {
            const v = data()?.[c.key] ?? 0;
            return (
              <div class="flex items-center gap-2 font-mono text-[9px]">
                <span class="w-16 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {c.label}
                </span>
                <div class="flex-1 h-1.5" style={{ background: 'var(--border)' }}>
                  <div
                    class="h-full"
                    style={{
                      width: `${Math.max(4, (v / maxVal()) * 100)}%`,
                      background:
                        c.key === 'p10' && v >= 10 ? 'var(--negative, #ef4444)' : 'var(--accent)',
                    }}
                  />
                </div>
                <span class="w-16 text-right" style={{ color: 'var(--text-primary)' }}>
                  {v.toPrecision(2)} pfu
                </span>
              </div>
            );
          }}
        </For>
      </div>
      <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        S1 storm = {'\u2265'}10 MeV exceeding 10 pfu · {(data()?.time_tag ?? '').slice(11, 16)}Z
      </p>
    </div>
  );
}

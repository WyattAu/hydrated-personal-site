import { For, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * SolarCycle — F10.7 solar radio flux (10.7 cm), the standard solar-cycle
 * activity index, from NOAA SWPC. Current value + trend across the feed
 * window with mini bars, severity-colored.
 */

interface FluxEntry {
  time_tag: string;
  flux: number;
}

export default function SolarCycle() {
  const [entries, setEntries] = createSignal<FluxEntry[]>([]);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/solar-cycle`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as FluxEntry[];
      if (!Array.isArray(d) || d.length === 0) throw new Error('empty feed');
      setEntries(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SWPC feed unavailable');
    }
  });

  const current = () => entries()[entries().length - 1]?.flux ?? 0;
  const max = () => Math.max(...entries().map((e) => e.flux), 1);
  const mean = () => entries().reduce((s, e) => s + e.flux, 0) / Math.max(1, entries().length);
  // F10.7 below ~80 = quiet sun, above ~150 = active
  const levelColor = () => {
    const v = current();
    if (v >= 150) return 'var(--negative, #ef4444)';
    if (v >= 100) return 'var(--accent)';
    return 'var(--text-secondary)';
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          F10.7 FLUX
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'SWPC'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="flex items-baseline justify-between mb-2">
        <span class="font-mono text-2xl font-bold" style={{ color: levelColor() }}>
          {entries().length > 0 ? current().toFixed(0) : '—'}
        </span>
        <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          sfu ·{' '}
          {entries().length > 0
            ? current() >= 150
              ? 'ACTIVE'
              : current() >= 100
                ? 'MODERATE'
                : 'QUIET'
            : '—'}
        </span>
      </div>
      <div class="flex items-end gap-[2px] h-10 mb-2">
        <For each={entries().slice(-30)}>
          {(e) => (
            <div
              class="flex-1"
              style={{
                height: `${Math.max(6, (e.flux / max()) * 100)}%`,
                background: e.flux >= 150 ? 'var(--negative, #ef4444)' : 'var(--accent)',
                opacity: 0.7,
              }}
            />
          )}
        </For>
      </div>
      <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
        window mean {entries().length > 0 ? mean().toFixed(0) : '—'} sfu · F10.7 ≥150 = active sun
      </p>
    </div>
  );
}

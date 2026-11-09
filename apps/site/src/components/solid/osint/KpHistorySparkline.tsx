import { createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * KpHistorySparkline — planetary K-index history from the site's
 * NOAA-proxied /api/kp-index endpoint. 3-hourly readings, SVG sparkline,
 * storm threshold highlighted at Kp >= 5 (G1).
 */

interface KpReading {
  time_tag: string;
  Kp: number;
  a_running: number;
  station_count: number;
}

const W = 300;
const H = 72;
const K_MAX = 9;

export default function KpHistorySparkline() {
  const [readings, setReadings] = createSignal<KpReading[]>([]);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/kp-index`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as KpReading[];
      if (!Array.isArray(d) || d.length === 0) throw new Error('empty feed');
      setReadings(d.slice(-40));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NOAA feed unavailable');
    }
  });

  const current = () => readings()[readings().length - 1]?.Kp ?? 0;
  const maxRecent = () => Math.max(...readings().map((r) => r.Kp), 0);
  const storming = () => current() >= 5;

  // x/y scale for sparkline
  const points = () =>
    readings()
      .map((r, i) => {
        const x = (i / Math.max(1, readings().length - 1)) * W;
        const y = H - (Math.min(r.Kp, K_MAX) / K_MAX) * (H - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const stormY = () => H - (5 / K_MAX) * (H - 8) - 4;

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          KP INDEX
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'NOAA SWPC'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="flex items-baseline justify-between mb-2">
        <span
          class="font-mono text-2xl font-bold"
          style={{ color: storming() ? 'var(--negative, #ef4444)' : 'var(--text-primary)' }}
        >
          {readings().length > 0 ? current().toFixed(2) : '—'}
        </span>
        <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          {storming() ? 'G1 STORM' : 'QUIET'} · 3-HOURLY
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        class="w-full mb-1"
        role="img"
        aria-label="Planetary K-index history sparkline"
      >
        <line
          x1="0"
          y1={stormY()}
          x2={W}
          y2={stormY()}
          stroke="var(--negative, #ef4444)"
          stroke-width="1"
          stroke-dasharray="3 4"
          opacity="0.5"
        />
        <polyline
          points={points()}
          fill="none"
          stroke={storming() ? 'var(--negative, #ef4444)' : 'var(--accent)'}
          stroke-width="1.5"
        />
      </svg>
      <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
        dashed: G1 threshold (Kp 5) · 5-day max{' '}
        {readings().length > 0 ? maxRecent().toFixed(1) : '—'}
      </p>
    </div>
  );
}

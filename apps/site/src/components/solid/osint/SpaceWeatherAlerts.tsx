import { For, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * SpaceWeatherAlerts — newest NOAA SWPC alert products (X-ray events,
 * proton alerts, electron flux, geomagnetic warnings). Severity-colored
 * by the alert's leading code: M/X-ray and proton alerts read hot.
 */

interface Alert {
  product_id: string;
  issued: string;
  summary: string;
}

function severity(a: Alert): { color: string; tag: string } {
  const pid = a.product_id.toUpperCase();
  const s = a.summary.toUpperCase();
  if (s.includes('X-RAY EVENT') || pid.startsWith('X')) {
    return { color: 'var(--negative, #ef4444)', tag: 'X-RAY' };
  }
  if (s.includes('PROTON') || pid.startsWith('P')) {
    return { color: 'var(--accent-warm, #ff9800)', tag: 'PROTON' };
  }
  if (s.includes('GEOMAGNETIC') || pid.startsWith('G')) {
    return { color: 'var(--accent)', tag: 'GEO' };
  }
  return { color: 'var(--text-secondary)', tag: pid.slice(0, 4) || 'INFO' };
}

export default function SpaceWeatherAlerts() {
  const [alerts, setAlerts] = createSignal<Alert[]>([]);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/swpc-alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as Alert[];
      if (!Array.isArray(d) || d.length === 0) throw new Error('no alerts');
      setAlerts(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NOAA alerts unavailable');
    }
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          SWPC ALERTS
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : `NOAA · ${alerts().length}`}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="space-y-1.5">
        <For each={alerts()}>
          {(a) => {
            const sev = severity(a);
            return (
              <div
                class="border p-2"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span
                    class="font-mono text-[9px] px-1 border"
                    style={{ color: sev.color, 'border-color': sev.color }}
                  >
                    {sev.tag}
                  </span>
                  <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                    {(a.issued ?? '').slice(0, 16)}
                  </span>
                </div>
                <p
                  class="font-mono text-[10px] leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {a.summary}
                </p>
              </div>
            );
          }}
        </For>
      </div>
      <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        newest 6 public NOAA SWPC alert products · 10-min cache
      </p>
    </div>
  );
}

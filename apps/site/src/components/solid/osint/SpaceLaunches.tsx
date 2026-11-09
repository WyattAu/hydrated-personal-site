import { For, Show, createSignal, onMount } from 'solid-js';

/**
 * Upcoming orbital launches — OSINT panel.
 * Source: The Space Devs Launch Library 2 (free, no key, CORS: *).
 * Cached 30 min in localStorage to respect the anonymous rate limit.
 */

interface Launch {
  name: string;
  net: string; // earliest possible launch time, ISO
  status: { abbrev: string };
  launch_service_provider?: { name: string };
  rocket?: { configuration: { name: string; full_name?: string } };
  pad?: { location: { name: string } };
  slug?: string;
}

const CACHE_KEY = 'space-launches-cache-v1';
const CACHE_TTL = 30 * 60 * 1000;

const relTime = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return 'TBD';
  const past = diff < 0;
  const mins = Math.round(Math.abs(diff) / 60000);
  if (mins < 60) return past ? `${mins}m ago` : `T-${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return past ? `${hrs}h ago` : `T-${hrs}h`;
  return past ? `${Math.round(hrs / 24)}d ago` : `T-${Math.round(hrs / 24)}d`;
};

export default function SpaceLaunches() {
  const [launches, setLaunches] = createSignal<Launch[] | null>(null);
  const [error, setError] = createSignal('');
  const [source, setSource] = createSignal('LL2 · THESPACEDEVS');

  onMount(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { at, data } = JSON.parse(cached) as { at: number; data: Launch[] };
        if (Date.now() - at < CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setLaunches(data);
          setSource('LL2 · CACHED');
        }
      }
      if (launches() === null) {
        const res = await fetch(
          'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=4&mode=list',
        );
        if (!res.ok) throw new Error(`API ${res.status}`);
        const d = (await res.json()) as { results?: Launch[] };
        const data = (d.results ?? []).slice(0, 4);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
        setLaunches(data);
        setSource('LL2 · LIVE');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feed unavailable');
    }
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          UPCOMING LAUNCHES
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {source()}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-3" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()} — launch feed blocked or rate-limited.
        </p>
      )}
      <Show when={launches() !== null}>
        <style>
          {
            '@keyframes launch-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }'
          }
        </style>
        <div class="space-y-2">
          <For each={launches()}>
            {(l, i) => (
              <div
                class="border p-2 font-mono text-[10px] launch-stagger"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                  animation: `launch-in 0.35s ease ${(i() * 70).toString()}ms both`,
                }}
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate" style={{ color: 'var(--text-primary)' }}>
                    {l.name}
                  </span>
                  <span
                    class="shrink-0 px-1 border"
                    style={{
                      color:
                        l.status.abbrev === 'Go'
                          ? 'var(--positive, #34d399)'
                          : 'var(--text-secondary)',
                      'border-color': 'var(--border)',
                    }}
                  >
                    {l.status.abbrev}
                  </span>
                </div>
                <div
                  class="flex items-center justify-between gap-2 mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span class="truncate">
                    {l.launch_service_provider?.name ?? '—'} ·{' '}
                    {l.rocket?.configuration?.name ?? '—'}
                  </span>
                  <span class="shrink-0">{relTime(l.net)}</span>
                </div>
                {l.pad?.location?.name && (
                  <div class="truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {l.pad.location.name}
                  </div>
                )}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

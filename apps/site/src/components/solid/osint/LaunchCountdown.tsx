import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * LaunchCountdown — live per-second T-minus tickers for the next launches.
 * Sits above the launches panel on /world: a clock that visibly moves is
 * the strongest "this page is alive" signal. Reduced-motion users still
 * get the ticking text (informational, not decorative motion).
 */

interface Launch {
  name: string;
  net: string;
  status?: { abbrev?: string };
  launch_service_provider?: { name?: string };
}

function tminus(netIso: string, now: number): { text: string; past: boolean } {
  const diff = new Date(netIso).getTime() - now;
  const past = diff < 0;
  const s = Math.abs(Math.floor(diff / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  const core = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return { text: past ? `T+${core}` : `T-${core}`, past };
}

export default function LaunchCountdown() {
  const [launches, setLaunches] = createSignal<Launch[]>([]);
  const [now, setNow] = createSignal(Date.now());
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/space-launches`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as { results?: Launch[] };
      const list = (d.results ?? []).slice(0, 2);
      if (list.length === 0) throw new Error('no upcoming launches');
      setLaunches(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'launch feed unavailable');
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(timer));
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          NEXT LAUNCHES
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'LL2 · LIVE CLOCK'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <For each={launches()}>
          {(l, i) => {
            const t = tminus(l.net, now());
            return (
              <div
                class="border p-3 flex items-center justify-between gap-3"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <div class="min-w-0">
                  <div class="font-mono text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {l.name}
                  </div>
                  <div
                    class="font-mono text-[9px] mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {l.launch_service_provider?.name ?? ''} · {l.net.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div
                    class="font-mono text-lg font-bold tabular-nums"
                    style={{ color: t.past ? 'var(--text-secondary)' : 'var(--accent)' }}
                  >
                    {t.text}
                  </div>
                  <div class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                    {i() === 0 && !t.past ? 'NEXT UP' : (l.status?.abbrev ?? '')}
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}

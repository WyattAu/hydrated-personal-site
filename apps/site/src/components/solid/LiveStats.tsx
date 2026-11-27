import { For, Show, createSignal, onMount } from 'solid-js';

/**
 * Live site statistics — fetched from real endpoints on every visit,
 * never hardcoded at build time. Numbers update as the estate grows.
 */
export default function LiveStats() {
  const [funds, setFunds] = createSignal<number | null>(null);
  const [routes, setRoutes] = createSignal<number | null>(null);
  const [feeds, setFeeds] = createSignal<number | null>(null);
  const [failed, setFailed] = createSignal(false);

  onMount(async () => {
    try {
      const [db, spec, metrics] = await Promise.all([
        fetch('/data/etf-database.json').then((r) => r.json()),
        fetch('/api/openapi.json').then((r) => r.json()),
        fetch('/api/metrics').then((r) => r.json()),
      ]);
      setFunds(Array.isArray(db) ? db.length : null);
      setRoutes(Object.keys(spec?.paths ?? {}).length || null);
      setFeeds(Object.keys(metrics?.feedLastSuccess ?? {}).length || null);
    } catch {
      setFailed(true);
    }
  });

  const items = () => [
    { value: funds(), label: 'ETFs in the open database', href: '/data' },
    { value: routes(), label: 'documented API routes', href: '/api/openapi.json' },
    { value: feeds(), label: 'live data feeds', href: '/world' },
  ];

  return (
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <For each={items()}>
        {(item) => (
          <a
            href={item.href}
            class="border p-5 block hover:border-[var(--accent)] transition-colors"
            style="border-color: var(--border);"
          >
            <Show
              when={item.value !== null}
              fallback={
                <p class="text-4xl font-bold" style="color: var(--text-secondary);">
                  —
                </p>
              }
            >
              <p class="text-5xl font-bold tabular-nums" style="color: var(--accent);">
                {item.value}
              </p>
            </Show>
            <p class="text-sm mt-2" style="color: var(--text-secondary);">
              {item.label}
            </p>
          </a>
        )}
      </For>
      <Show when={failed()}>
        <p class="text-xs" style="color: var(--text-secondary);">
          Live stats unavailable right now: the numbers above read from the site's own endpoints on
          every visit.
        </p>
      </Show>
    </div>
  );
}

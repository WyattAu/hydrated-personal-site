import autoAnimate from '@formkit/auto-animate';
import { For, Show, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';

interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

export default function GuestbookList() {
  const [entries, setEntries] = createSignal<GuestbookEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [total, setTotal] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const PAGE_SIZE = 10;
  let listRef!: HTMLDivElement;

  async function fetchEntries(reset = false) {
    try {
      const offset = reset ? 0 : page() * PAGE_SIZE;
      const res = await fetch(`${apiBase()}/api/guestbook?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (reset) {
        setEntries(data.entries || []);
      } else {
        setEntries((prev) => [...prev, ...(data.entries || [])]);
      }
      setTotal(data.total || 0);
      setHasMore(data.has_more || false);
      setError(null);
    } catch {
      setError('Could not load guestbook entries.');
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    setPage((p) => p + 1);
    setLoading(true);
    fetchEntries(false);
  }

  onMount(() => {
    autoAnimate(listRef, {
      duration: 300,
      easing: 'ease-out',
    });
    fetchEntries(true);
    const interval = setInterval(() => fetchEntries(true), 30000);
    return () => clearInterval(interval);
  });

  function formatTime(ts: string): string {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div>
      <Show when={loading() && entries().length === 0}>
        <p class="font-mono text-xs" style="color: var(--text-secondary);">
          Loading entries...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs" style="color: var(--accent-warm);">
          {error()}
        </p>
      </Show>

      {!loading() && entries().length === 0 && !error() && (
        <p class="font-mono text-xs" style="color: var(--text-secondary);">
          No entries yet. Be the first to sign.
        </p>
      )}

      <div ref={listRef}>
        <For each={entries()}>
          {(entry) => (
            <div class="py-3 border-b" style="border-color: var(--border);">
              <div class="flex items-baseline justify-between mb-1 gap-2">
                <span class="font-mono text-sm font-bold" style="color: var(--text-primary);">
                  {entry.name}
                </span>
                <span class="font-mono text-[10px] shrink-0" style="color: var(--text-secondary);">
                  {formatTime(entry.created_at)}
                </span>
              </div>
              <p class="text-sm" style="color: var(--text-secondary); word-break: break-word;">
                {entry.message}
              </p>
            </div>
          )}
        </For>
      </div>

      {hasMore() && (
        <button
          type="button"
          class="mt-4 w-full py-2 font-mono text-xs border transition-colors"
          style="border-color: var(--border); color: var(--accent); background: var(--bg-card);"
          onClick={loadMore}
          disabled={loading()}
        >
          {loading() ? 'Loading...' : `Load More (${entries().length} of ${total()})`}
        </button>
      )}

      {!hasMore() && entries().length > 0 && (
        <p class="font-mono text-[10px] mt-4 text-center" style="color: var(--text-secondary);">
          {entries().length} entries — end of guestbook
        </p>
      )}
    </div>
  );
}

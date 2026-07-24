import autoAnimate from '@formkit/auto-animate';
import { For, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';

interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  created_at: string;
}

export default function GuestbookList() {
  const [entries, setEntries] = createSignal<GuestbookEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let listRef!: HTMLDivElement;

  async function fetchEntries() {
    try {
      const res = await fetch(`${apiBase()}/api/guestbook`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEntries(data.entries);
      setError(null);
    } catch {
      setError('Could not load guestbook entries.');
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    autoAnimate(listRef, {
      duration: 300,
      easing: 'ease-out',
    });
    fetchEntries();
    const interval = setInterval(fetchEntries, 30000);
    return () => clearInterval(interval);
  });

  function formatTime(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div>
      {loading() && entries().length === 0 && (
        <p class="font-mono text-xs" style="color: var(--text-secondary);">
          Loading entries...
        </p>
      )}

      {error() && (
        <p class="font-mono text-xs" style="color: var(--accent-warm);">
          {error()}
        </p>
      )}

      {!loading() && entries().length === 0 && !error() && (
        <p class="font-mono text-xs" style="color: var(--text-secondary);">
          No entries yet. Be the first to sign.
        </p>
      )}

      <div ref={listRef}>
        <For each={entries()}>
          {(entry) => (
            <div class="py-4 border-b" style="border-color: var(--border);">
              <div class="flex items-baseline justify-between mb-1 gap-2">
                <span class="font-mono text-sm font-bold" style="color: var(--text-primary);">
                  {entry.name}
                </span>
                <span class="font-mono text-[10px] shrink-0" style="color: var(--text-secondary);">
                  {formatTime(entry.created_at)}
                </span>
              </div>
              <p class="text-sm" style="color: var(--text-secondary);">
                {entry.message}
              </p>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

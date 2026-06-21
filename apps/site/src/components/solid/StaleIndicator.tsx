import { For, createSignal, onCleanup, onMount } from 'solid-js';

/** Call this after a successful API fetch to record the timestamp for stale tracking. */
export function recordFetch(sourceKey: string): void {
  try {
    localStorage.setItem(`lastFetch:${sourceKey}`, String(Date.now()));
  } catch {}
}

interface DataSourceStatus {
  key: string;
  label: string;
  timestamp: number;
  ttlMs: number;
}

const DATA_SOURCES: { key: string; label: string; ttlMs: number }[] = [
  { key: 'crypto-ticker', label: 'Crypto', ttlMs: 10_000 },
  { key: 'fear-greed', label: 'Fear/Greed', ttlMs: 5 * 60_000 },
  { key: 'kp-index', label: 'Kp Index', ttlMs: 10 * 60_000 },
  { key: 'mempool', label: 'Mempool', ttlMs: 60_000 },
  { key: 'earthquakes', label: 'Earthquakes', ttlMs: 5 * 60_000 },
  { key: 'hacker-news', label: 'Hacker News', ttlMs: 5 * 60_000 },
  { key: 'github-trending', label: 'GitHub', ttlMs: 30 * 60_000 },
  { key: 'llm-benchmarks', label: 'LLM Data', ttlMs: 6 * 60 * 60_000 },
];

function freshnessClass(
  timestamp: number,
  ttlMs: number,
  _key: string,
): { color: string; label: string } {
  const age = Date.now() - timestamp;
  if (age < ttlMs * 0.5) return { color: '#69f0ae', label: 'FRESH' };
  if (age < ttlMs) return { color: '#ffff00', label: 'AGING' };
  if (age < ttlMs * 2) return { color: '#ff9800', label: 'STALE' };
  return { color: '#f44336', label: 'DEAD' };
}

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function StaleIndicator() {
  const [sources, setSources] = createSignal<DataSourceStatus[]>([]);
  const [expanded, setExpanded] = createSignal(false);

  function poll() {
    const statuses: DataSourceStatus[] = DATA_SOURCES.map((src) => {
      const key = `lastFetch:${src.key}`;
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      const ts = stored ? Number.parseInt(stored) : Date.now();
      return {
        key: src.key,
        label: src.label,
        timestamp: ts,
        ttlMs: src.ttlMs,
      };
    });
    setSources(statuses);
  }

  onMount(() => {
    poll();
    const id = setInterval(poll, 60_000);
    onCleanup(() => clearInterval(id));
  });

  const allFresh = () =>
    sources().every((s) => {
      const age = Date.now() - s.timestamp;
      return age < s.ttlMs;
    });

  const anyDead = () =>
    sources().some((s) => {
      const age = Date.now() - s.timestamp;
      return age >= s.ttlMs * 2;
    });

  return (
    <div class="border" style="border-color: var(--border); background: var(--bg-card);">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded(!expanded())}
        aria-expanded={expanded()}
      >
        <div class="flex items-center gap-3">
          <div
            class="w-2 h-2"
            style={{
              background: anyDead() ? '#f44336' : allFresh() ? '#69f0ae' : '#ffff00',
            }}
          />
          <p class="label" style="color: var(--accent);">
            DATA FRESHNESS
          </p>
        </div>
        <span class="code-text" style="color: var(--text-secondary);">
          {expanded() ? '[-]' : '[+]'}
        </span>
      </button>

      {expanded() && (
        <div class="px-4 pb-3 border-t" style="border-color: var(--border);">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
            <For each={sources()}>
              {(src) => {
                const status = freshnessClass(src.timestamp, src.ttlMs, src.key);
                return (
                  <div class="flex flex-col gap-1">
                    <span class="code-text" style="color: var(--text-secondary); font-size: 9px;">
                      {src.label.toUpperCase()}
                    </span>
                    <span
                      class="code-text font-bold"
                      style={{ color: status.color, 'font-size': '10px' }}
                    >
                      {status.label}
                    </span>
                    <span class="code-text" style="color: var(--text-secondary); font-size: 9px;">
                      {formatAge(Date.now() - src.timestamp)}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      )}
    </div>
  );
}

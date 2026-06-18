import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js';
import type { EtfEntry } from '../../lib/types';

interface SearchBarProps {
  onSelect: (etf: EtfEntry) => void;
  database: EtfEntry[];
}

const DEBOUNCE_MS = 300;

export default function SearchBar(props: SearchBarProps) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<EtfEntry[]>([]);
  const [open, setOpen] = createSignal(false);
  const [activeIdx, setActiveIdx] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const q = query().toLowerCase().trim();
    clearTimeout(debounceTimer);
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceTimer = setTimeout(() => {
      const matches = props.database
        .filter(
          (e) =>
            e.ticker.toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q),
        )
        .slice(0, 12);
      setResults(matches);
      setOpen(matches.length > 0);
      setActiveIdx(-1);
    }, DEBOUNCE_MS);
  });

  onCleanup(() => clearTimeout(debounceTimer));

  function selectEntry(entry: EtfEntry) {
    setQuery(entry.ticker);
    setOpen(false);
    setActiveIdx(-1);
    props.onSelect(entry);
    inputRef?.blur();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open()) return;
    const list = results();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx() >= 0 && activeIdx() < list.length) {
        selectEntry(list[activeIdx()]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
      inputRef?.blur();
    }
  }

  function handleBlur(e: FocusEvent) {
    if (containerRef && !containerRef.contains(e.relatedTarget as Node)) {
      setTimeout(() => setOpen(false), 150);
    }
  }

  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  return (
    <div ref={containerRef} class="relative w-full" style="max-width: 600px;">
      <div
        class="flex items-center border px-4 py-3"
        style={{
          'border-color': open() ? accentColor() : 'var(--border)',
          background: 'var(--bg-card)',
          transition: 'border-color 0.2s ease',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          style={{ color: 'var(--text-secondary)', 'flex-shrink': 0 }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ETFs by ticker, name, or category..."
          class="w-full ml-3 bg-transparent outline-none font-mono text-sm"
          style={{ color: 'var(--text-primary)' }}
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onFocus={() => {
            if (results().length > 0) setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open()}
          aria-haspopup="listbox"
          aria-label="Search ETFs"
          aria-controls="etf-search-results"
        />
        <Show when={query().length > 0}>
          <button
            type="button"
            class="ml-2 p-1"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              role="img"
              aria-label="Clear"
            >
              <title>Clear</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </Show>
      </div>

      <Show when={open()}>
        <ul
          class="absolute left-0 right-0 mt-1 border overflow-y-auto"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
            'max-height': '360px',
            'z-index': 'var(--z-overlay)',
          }}
        >
          <For each={results()}>
            {(entry, i) => (
              <li
                class="px-4 py-3 cursor-pointer border-b transition-colors"
                style={{
                  'border-color': 'var(--border)',
                  background: i() === activeIdx() ? 'var(--bg-card)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={() => setActiveIdx(i())}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectEntry(entry);
                }}
                aria-selected={i() === activeIdx()}
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-mono text-sm font-bold" style={{ color: accentColor() }}>
                      {entry.ticker}
                    </span>
                    <span class="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {entry.name}
                    </span>
                  </div>
                  <span
                    class="font-mono text-xs px-2 py-0.5"
                    style={{
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {entry.category}
                  </span>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

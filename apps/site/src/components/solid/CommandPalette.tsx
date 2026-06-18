import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

interface CommandItem {
  label: string;
  href: string;
  shortcut?: string;
}

const commands: CommandItem[] = [
  { label: 'Home', href: '/', shortcut: 'g h' },
  { label: 'Projects', href: '/projects', shortcut: 'g p' },
  { label: 'Dossier', href: '/dossier', shortcut: 'g d' },
  { label: 'World Monitor', href: '/world', shortcut: 'g w' },
  { label: 'Docs', href: '/docs', shortcut: 'g o' },
  { label: 'ETF Intelligence', href: '/etf', shortcut: 'g e' },
  { label: 'Guestbook', href: '/guestbook', shortcut: 'g g' },
  { label: 'Uses', href: '/uses', shortcut: 'g u' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;
  let dialogRef: HTMLDivElement | undefined;

  const filtered = () => {
    const q = query().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) => cmd.label.toLowerCase().includes(q) || cmd.href.toLowerCase().includes(q),
    );
  };

  createEffect(() => {
    filtered();
    setSelectedIndex(0);
  });

  function open() {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef?.focus(), 50);
  }

  function close() {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }

  function navigate(href: string) {
    window.location.href = href;
    close();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered().length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const items = filtered();
      if (items[selectedIndex()]) {
        navigate(items[selectedIndex()].href);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  }

  onMount(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key === '/' && !isOpen() && !isInputFocused()) {
        e.preventDefault();
        open();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen()) {
          close();
        } else {
          open();
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKey);
    onCleanup(() => document.removeEventListener('keydown', handleGlobalKey));
  });

  function isInputFocused(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
  }

  return (
    <Show when={isOpen()}>
      <div
        ref={dialogRef}
        class="command-overlay"
        style={{
          position: 'fixed',
          inset: '0',
          'z-index': 'var(--z-modal)',
          display: 'flex',
          'align-items': 'flex-start',
          'justify-content': 'center',
          'padding-top': '20vh',
          background: 'rgba(0, 0, 0, 0.6)',
          'backdrop-filter': 'blur(8px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => {
          if (e.target === dialogRef) close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      >
        <div
          class="command-palette"
          style={{
            width: '100%',
            'max-width': '520px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            'box-shadow': 'var(--shadow-xl)',
          }}
        >
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              padding: '12px 16px',
              'border-bottom': '1px solid var(--border)',
            }}
          >
            <span
              style={{
                color: 'var(--text-secondary)',
                'font-family': "'JetBrains Mono', monospace",
                'font-size': '11px',
                'margin-right': '8px',
              }}
            >
              &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages..."
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: '1',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                'font-family': "'JetBrains Mono', monospace",
                'font-size': '13px',
              }}
            />
            <span
              style={{
                color: 'var(--text-secondary)',
                'font-family': "'JetBrains Mono', monospace",
                'font-size': '10px',
                border: '1px solid var(--border)',
                padding: '2px 6px',
              }}
            >
              ESC
            </span>
          </div>

          <div style={{ 'max-height': '320px', overflow: 'auto', padding: '4px 0' }}>
            <For each={filtered()}>
              {(item, i) => (
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    width: '100%',
                    padding: '10px 16px',
                    background: i() === selectedIndex() ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--text-primary)',
                    'font-family': "'JetBrains Mono', monospace",
                    'font-size': '12px',
                    'text-align': 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setSelectedIndex(i())}
                >
                  <span>{item.label}</span>
                  <Show when={item.shortcut}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '10px' }}>
                      {item.shortcut}
                    </span>
                  </Show>
                </button>
              )}
            </For>
            <Show when={filtered().length === 0}>
              <div
                style={{
                  padding: '16px',
                  'text-align': 'center',
                  color: 'var(--text-secondary)',
                  'font-size': '12px',
                }}
              >
                No results found.
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}

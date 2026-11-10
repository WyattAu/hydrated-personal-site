import { createSignal, onMount } from 'solid-js';
import { Show } from 'solid-js';
import Dock from './Dock';
import { prefersReducedMotion } from './theme';

/**
 * SiteDock — floating quick-nav dock for the landing page.
 * Bridge wrapper: Astro cannot pass function props (items' onClick) to
 * framework components, and Dock's Portal tooltips must not render
 * server-side, so items live here and mount is desktop-only.
 */
const LINKS = [
  { label: 'World Monitor', href: '/world', glyph: '◉' },
  { label: 'ETF Intelligence', href: '/etf', glyph: '▤' },
  { label: 'ML Benchmarks', href: '/ml', glyph: '▲' },
  { label: 'Docs', href: '/docs', glyph: '≡' },
  { label: 'Guestbook', href: '/guestbook', glyph: '✎' },
  { label: 'GitHub', href: 'https://github.com/WyattAu', glyph: '✦', external: true },
] as const;

export default function SiteDock() {
  const [enabled, setEnabled] = createSignal(false);

  onMount(() => {
    setEnabled(window.matchMedia('(min-width: 1024px)').matches && !prefersReducedMotion());
  });

  const go = (href: string, external?: boolean): void => {
    if (external) window.open(href, '_blank', 'noopener,noreferrer');
    else window.location.assign(href);
  };

  return (
    <Show when={enabled()}>
      <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40" aria-label="Quick navigation">
        <Dock
          items={LINKS.map((l) => ({
            icon: (
              <span
                class="font-mono text-lg leading-none"
                style={{ color: 'var(--text-primary)' }}
                aria-hidden="true"
              >
                {l.glyph}
              </span>
            ),
            label: l.label,
            onClick: () => go(l.href, 'external' in l && l.external),
          }))}
          position="bottom"
          baseItemSize={44}
          magnification={1.6}
          distance={110}
          accentColor="var(--accent)"
        />
      </div>
    </Show>
  );
}

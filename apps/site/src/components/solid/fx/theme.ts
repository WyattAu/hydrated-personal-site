import { createSignal, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Reactive theme colors for fx components. Reads CSS custom properties and
 * re-resolves when the ThemeToggle writes data-theme on <html>. Returns
 * accessors so Solid tracks the theme switch without a page reload.
 */
export interface FxThemeColors {
  accent: string;
  bgCard: string;
  border: string;
  textSecondary: string;
  /** theme name straight from data-theme (e.g. arctic-dawn) */
  name: string;
}

const LIGHT_THEMES = new Set(['arctic-dawn']);

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

export function useFxTheme(): {
  colors: Accessor<FxThemeColors>;
  isLight: Accessor<boolean>;
} {
  const read = (): FxThemeColors => ({
    accent: cssVar('--accent', '#00e5ff'),
    bgCard: cssVar('--bg-card', '#0a0a0a'),
    border: cssVar('--border', '#1a1a1a'),
    textSecondary: cssVar('--text-secondary', '#666666'),
    name:
      typeof document !== 'undefined'
        ? document.documentElement.getAttribute('data-theme') || 'midnight-navy'
        : 'midnight-navy',
  });

  const [colors, setColors] = createSignal<FxThemeColors>(read());
  const [isLight, setIsLight] = createSignal<boolean>(LIGHT_THEMES.has(colors().name));

  let observer: MutationObserver | undefined;

  onMount(() => {
    observer = new MutationObserver(() => {
      const next = read();
      setColors(next);
      setIsLight(LIGHT_THEMES.has(next.name));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  });

  onCleanup(() => observer?.disconnect());

  return { colors, isLight };
}

/** Respect the OS-level reduced-motion setting for decorative effects. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

import { createSignal, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import Aurora from './Aurora';
import { prefersReducedMotion, useFxTheme } from './theme';

/**
 * ThemeAurora — Aurora background that follows the site theme via useFxTheme.
 * Desktop-only (>= 1024px) and never mounts under prefers-reduced-motion,
 * so mobile GPUs and motion-sensitive users never pay the WebGL cost.
 * Color stops derive from the active theme's accent family.
 */

const THEME_STOPS: Record<string, string[]> = {
  'midnight-navy': ['#00e5ff', '#2563eb', '#7c3aed'],
  'tokyo-night': ['#7c3aed', '#db2777', '#00e5ff'],
  solaris: ['#f59e0b', '#ef4444', '#fbbf24'],
  'arctic-dawn': ['#38bdf8', '#818cf8', '#f472b6'],
  light: ['#60a5fa', '#a78bfa', '#34d399'],
};

const FALLBACK_STOPS = ['#00e5ff', '#2563eb', '#7c3aed'];

export default function ThemeAurora(props: {
  class?: string;
  style?: JSX.CSSProperties;
  height?: number;
  opacity?: number;
}) {
  const { colors, isLight } = useFxTheme();
  const [enabled, setEnabled] = createSignal(false);

  onMount(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    setEnabled(desktop && !prefersReducedMotion());
  });

  const stops = () => THEME_STOPS[colors().name] ?? FALLBACK_STOPS;

  return (
    <Show when={enabled()}>
      <div class={props.class} style={props.style} aria-hidden="true">
        <Aurora
          colorStops={stops()}
          amplitude={1.1}
          blend={0.55}
          speed={0.55}
          glow={isLight() ? 0.7 : 1.15}
          brightness={isLight() ? 0.85 : 1.0}
          height={props.height ?? 460}
          opacity={props.opacity ?? 0.4}
          direction="top"
          mouseInteraction={false}
          dpr={1.25}
        />
      </div>
    </Show>
  );
}

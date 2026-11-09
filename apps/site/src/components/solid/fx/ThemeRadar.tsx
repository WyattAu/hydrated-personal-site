import { createSignal, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import Radar from './Radar';
import { prefersReducedMotion, useFxTheme } from './theme';

/**
 * ThemeRadar — OSINT radar sweep background that follows the site theme.
 * Desktop-only (>= 1024px) and never mounts under prefers-reduced-motion,
 * so mobile GPUs and motion-sensitive users never pay the WebGL2 cost.
 * Colors derive from the active theme's accent family.
 */
export default function ThemeRadar(props: {
  class?: string;
  style?: JSX.CSSProperties;
  targets?: number;
  opacity?: number;
}) {
  const { colors, isLight } = useFxTheme();
  const [enabled, setEnabled] = createSignal(false);

  onMount(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    setEnabled(desktop && !prefersReducedMotion());
  });

  return (
    <Show when={enabled()}>
      <div class={props.class} style={props.style} aria-hidden="true">
        <Radar
          color={colors().accent}
          backgroundColor={isLight() ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)'}
          speed={0.7}
          targets={props.targets ?? 6}
          clutter={2}
          glow={isLight() ? 0.6 : 1.1}
          brightness={isLight() ? 0.8 : 1.0}
          gridOpacity={0.35}
          trail={0.85}
        />
      </div>
    </Show>
  );
}

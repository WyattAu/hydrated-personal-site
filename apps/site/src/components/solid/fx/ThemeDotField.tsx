import { type JSX, Show } from 'solid-js';
import DotField from './DotField';
import { prefersReducedMotion, useFxTheme } from './theme';

/**
 * Theme-aware DotField overlay for the landing hero. Renders an interactive
 * dot field tinted with the active theme accent, gated behind
 * prefers-reduced-motion (static nothing when the OS asks for calm).
 */
export default function ThemeDotField(props: { class?: string; style?: JSX.CSSProperties }) {
  const { colors, isLight } = useFxTheme();

  return (
    <Show when={!prefersReducedMotion()}>
      <DotField
        class={props.class}
        style={props.style}
        dotRadius={1.4}
        dotSpacing={18}
        gradientFrom={isLight() ? '#0055ee' : colors().accent}
        gradientTo={isLight() ? '#06b6d4' : colors().accent}
        glowColor={isLight() ? '#0055ee' : '#ffffff'}
        glowIntensity={0.55}
      />
    </Show>
  );
}

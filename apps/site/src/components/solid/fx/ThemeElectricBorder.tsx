import { type JSX, Show } from 'solid-js';
import { createSignal, onCleanup, onMount } from 'solid-js';
import ElectricBorder from './ElectricBorder';
import { prefersReducedMotion, useFxTheme } from './theme';

/**
 * Theme-aware ElectricBorder for interactive cards. Colors follow the active
 * theme accent; on touch-first viewports (no hover) or reduced-motion the
 * border degrades to a plain themed border instead of the animated canvas.
 */
export default function ThemeElectricBorder(props: {
  children?: JSX.Element;
  class?: string;
  style?: JSX.CSSProperties;
  borderRadius?: number;
  /** render the animated canvas only on hover-capable, wide-enough screens */
  desktopOnly?: boolean;
}) {
  const { colors, isLight } = useFxTheme();
  const [canAnimate, setCanAnimate] = createSignal(false);

  onMount(() => {
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluate = (): void => {
      setCanAnimate(hover.matches && !motion.matches && !prefersReducedMotion());
    };
    evaluate();
    hover.addEventListener('change', evaluate);
    motion.addEventListener('change', evaluate);
    onCleanup(() => {
      hover.removeEventListener('change', evaluate);
      motion.removeEventListener('change', evaluate);
    });
  });

  const accent = (): string => (isLight() ? '#0055ee' : colors().accent);

  return (
    <Show
      when={canAnimate() && !(props.desktopOnly ?? false)}
      fallback={
        <div
          class={props.class}
          style={{
            ...props.style,
            'border-radius': `${props.borderRadius ?? 8}px`,
            border: `1px solid ${accent()}`,
          }}
        >
          {props.children}
        </div>
      }
    >
      <ElectricBorder
        class={props.class}
        style={props.style}
        borderRadius={props.borderRadius ?? 8}
        color={accent()}
        glowColor={accent()}
        thickness={1}
        speed={0.6}
        chaos={0.6}
        glow={0.55}
      >
        {props.children}
      </ElectricBorder>
    </Show>
  );
}

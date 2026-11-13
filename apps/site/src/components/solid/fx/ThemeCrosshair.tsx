import { createSignal, onMount } from 'solid-js';
import { Show } from 'solid-js';
import Crosshair from './Crosshair';
import { prefersReducedMotion, useFxTheme } from './theme';

/**
 * ThemeCrosshair — intel-style pointer crosshair with live coordinate
 * readout. Desktop-only, pointer-fine devices only, and never mounts
 * under prefers-reduced-motion (decorative tracking UI).
 */
export default function ThemeCrosshair(props: { targetSelector?: string }) {
  const { colors } = useFxTheme();
  const [enabled, setEnabled] = createSignal(false);

  onMount(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    setEnabled(desktop && finePointer && !prefersReducedMotion());
  });

  return (
    <Show when={enabled()}>
      <Crosshair
        color={colors().accent}
        lineStyle="dashed"
        thickness={1}
        opacity={0.85}
        showCoordinates
        clickPulse
        targetEffect="lock"
        targetSelector={props.targetSelector}
        gap={8}
        smoothing={0.18}
      />
    </Show>
  );
}

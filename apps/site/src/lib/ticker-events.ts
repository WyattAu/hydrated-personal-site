import { onCleanup, onMount } from 'solid-js';

// Hook for cross-asset components to listen for ticker list changes.
// Astro islands have separate reactive roots, so SolidJS createEffect
// in one island won't fire when a signal is updated from another island.
// We use a window event for cross-island sync.

export function onTickersChanged(callback: () => void) {
  onMount(() => {
    window.addEventListener('tickers-changed', callback);
  });
  onCleanup(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('tickers-changed', callback);
    }
  });
}

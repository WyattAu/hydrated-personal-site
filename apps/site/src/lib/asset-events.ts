import { onMount, onCleanup } from 'solid-js';

// Hook for single-asset components to listen for asset changes from AssetSelector.
// Astro islands have separate reactive roots, so SolidJS createEffect
// in one island won't fire when a signal is updated from another island.
// We use a window event for cross-island sync.

export function onAssetChanged(callback: () => void) {
  onMount(() => {
    window.addEventListener('asset-changed', callback);
  });
  onCleanup(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('asset-changed', callback);
    }
  });
}

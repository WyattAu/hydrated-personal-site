import { onCleanup, onMount } from 'solid-js';
import { getPlychart } from './plychart-loader';

/**
 * Hook that sets up ResizeObserver on a canvas element and
 * re-creates the plychart chart when the canvas is resized.
 *
 * @param canvasId - The canvas element ID
 * @param width - Signal getter for current width
 * @param height - Signal getter for current height
 * @param dataJson - Signal getter for current data (JSON string)
 * @param updateFn - The WASM function to call (e.g. 'update_treemap')
 * @param extraArgs - Additional arguments after dataJson (e.g. theme_json)
 */
export function usePlychartResize(
  canvasId: () => string,
  width: () => number,
  height: () => number,
  dataJson: () => string,
  updateFn: string,
  extraArgs: string[] = [],
) {
  let observer: ResizeObserver | undefined;

  onMount(() => {
    const el = document.getElementById(canvasId());
    if (!el) return;

    observer = new ResizeObserver(async () => {
      const p = await getPlychart();
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        p.create_chart(canvasId(), w, h);
        const fn = (p as any)[updateFn];
        if (fn) {
          fn(canvasId(), dataJson(), ...extraArgs);
        }
      }
    });

    observer.observe(el);
  });

  onCleanup(() => {
    observer?.disconnect();
  });
}

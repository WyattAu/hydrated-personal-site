/**
 * Shared plychart WASM module loader.
 * Singleton pattern: loads exactly once across all SolidJS islands.
 */

import { PLYCHART_VERSION } from './plychart-version';

// biome-ignore lint/suspicious/noExplicitAny: WASM module type
let modPromise: Promise<any> | null = null;

export async function getPlychart() {
  if (!modPromise) {
    modPromise = (async () => {
      const _p = `/wasm/plychart.js?v=${PLYCHART_VERSION}`;
      const mod = await import(/* @vite-ignore */ _p);
      await mod.default();
      return mod;
    })();
  }
  return modPromise;
}

/**
 * Shared plychart WASM module loader.
 * Singleton pattern: loads exactly once across all SolidJS islands.
 */

import { PLYCHART_VERSION } from './plychart-version';

// biome-ignore lint/suspicious/noExplicitAny: WASM module type
let modPromise: Promise<any> | null = null;

/** True when the browser exposes the WebAssembly global (hardened
 *  Firefox/Fennec security levels and some content blockers remove it). */
export function isWasmAvailable(): boolean {
  return typeof WebAssembly !== 'undefined';
}

const WASM_UNAVAILABLE_MSG =
  'Graphs need WebAssembly, which this browser has disabled. ' +
  'Hardened Firefox/Tor security levels (Safer/Safest) turn it off — switch to ' +
  "'Standard' or use Chrome/Samsung Internet to see the graphs. " +
  'Text and live-data readouts on this page still work.';

export async function getPlychart() {
  if (!isWasmAvailable()) {
    throw new Error(WASM_UNAVAILABLE_MSG);
  }
  if (!modPromise) {
    modPromise = (async () => {
      const _p = `/wasm/plychart.js?v=${PLYCHART_VERSION}`;
      const mod = await import(/* @vite-ignore */ _p);
      await mod.default();
      return mod;
    })().catch((err) => {
      modPromise = null; // allow retry (transient network, not a hard disable)
      const msg = err instanceof Error ? err.message : String(err);
      if (/WebAssembly is not defined|WebAssembly.instantiate/.test(msg)) {
        throw new Error(WASM_UNAVAILABLE_MSG);
      }
      throw err;
    });
  }
  return modPromise;
}

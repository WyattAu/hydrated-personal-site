// Shared WASM module loader — ensures the WASM binary is loaded exactly once.
// Without this, multiple SolidJS islands each call `import()` + `default()`
// simultaneously, causing a race condition in wasm-bindgen's init function
// where multiple parallel loads corrupt the internal `wasm` variable.

import { WASM_VERSION } from './wasm-version';

let wasmPromise: Promise<any> | null = null;

/** True when the browser exposes the WebAssembly global (hardened
 *  Firefox/Fennec security levels and some content blockers remove it). */
export function isWasmAvailable(): boolean {
  return typeof WebAssembly !== 'undefined';
}

const WASM_UNAVAILABLE_MSG =
  'Interactive charts need WebAssembly, which this browser has disabled. ' +
  'Hardened Firefox/Tor security levels (Safer/Safest) turn it off — switch to ' +
  "'Standard' or use Chrome/Samsung Internet to see the graphs. " +
  'Live data readouts on this page still work.';

export async function getWasmMod(): Promise<any> {
  if (!isWasmAvailable()) {
    throw new Error(WASM_UNAVAILABLE_MSG);
  }
  if (!wasmPromise) {
    const _w = `/wasm/hydrated_widgets.js?${WASM_VERSION}`;
    wasmPromise = import(_w)
      .then(async (mod) => {
        await mod.default();
        return mod;
      })
      .catch((err) => {
        wasmPromise = null; // allow retry (transient network, not a hard disable)
        const msg = err instanceof Error ? err.message : String(err);
        if (/WebAssembly is not defined|WebAssembly.instantiate/.test(msg)) {
          throw new Error(WASM_UNAVAILABLE_MSG);
        }
        throw err;
      });
  }
  return wasmPromise;
}

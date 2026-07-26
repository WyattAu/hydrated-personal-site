// Shared WASM module loader — ensures the WASM binary is loaded exactly once.
// Without this, multiple SolidJS islands each call `import()` + `default()`
// simultaneously, causing a race condition in wasm-bindgen's init function
// where multiple parallel loads corrupt the internal `wasm` variable.

let wasmPromise: Promise<any> | null = null;

export async function getWasmMod(): Promise<any> {
  if (!wasmPromise) {
    const _w = '/wasm/hydrated_widgets.js?v=j45';
    wasmPromise = import(_w).then(async (mod) => {
      await mod.default();
      return mod;
    });
  }
  return wasmPromise;
}

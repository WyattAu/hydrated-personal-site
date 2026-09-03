/**
 * Shared plychart WASM module loader.
 * Singleton pattern: loads exactly once across all SolidJS islands.
 */

// Bump when apps/site/public/wasm/plychart_bg.wasm is replaced.
// Cloudflare caches /wasm/* immutably; the query string busts it.
const PLYCHART_VERSION = 'p1';

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

import { BUILD_ID } from './build-id';

// Version-derive the WASM cache-buster from the build id: a hardcoded
// string here kept the URL constant across deploys, so the service
// worker's cache-first /wasm/* rule served stale glue+wasm forever
// (the "wasm unloaded on cached pages" bug).
export const WASM_VERSION = `b-${BUILD_ID}`;

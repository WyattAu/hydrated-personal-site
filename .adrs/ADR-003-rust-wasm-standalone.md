# ADR-003: Rust WASM — Standalone Widgets Only

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-WASM-WIDGETS-001 |

## Context

The current site uses Leptos WASM for islands, which requires the full Leptos framework (reactive runtime, hydration context). This adds ~200-400KB per widget.

## Decision

Use **standalone Rust + web-sys + wasm-bindgen** for WASM widgets:
1. **Smaller bundle** — 70-100KB per widget (vs 200-400KB with Leptos)
2. **No framework dependency** — Pure Canvas2D rendering, no reactive runtime
3. **Simple build** — `wasm-pack build --target web`
4. **Easy loading** — `import init, { create_chart } from './widget.js'; await init(); create_chart(canvas);`
5. **Clean boundaries** — WASM owns its `<div>` subtree, nothing else touches it

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Leptos framework widgets | Reactive signals, type-safe | Heavy (200-400KB), complex build | Rejected |
| Plain JS (no WASM) | Simple, fast | No Rust showcase | Rejected |
| Plain Rust + web-sys | Lightweight, simple | No reactive signals | **Accepted** |
| Yew framework | Component model | Heavy, complex | Rejected |
| Sycamore | Lightweight reactive | Less mature | Considered |

## Consequences

- WASM widgets are pure Canvas2D renderers
- No Leptos framework dependency in widgets
- Simple `wasm-pack build --target web` pipeline
- Each widget is 70-100KB gzipped
- Total WASM ~1.05MB (all 13 widgets)

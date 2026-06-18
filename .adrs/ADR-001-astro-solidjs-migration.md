# ADR-001: Framework Choice — Astro + SolidJS

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001, BP-SOLIDJS-COMPONENTS-001 |

## Context

The current site uses Leptos 0.8 islands architecture. The Leptos islands fight vanilla JS for DOM ownership, causing:
- Price time scale labels missing
- ETF allocations/holdings broken
- World chart not loading
- SSG build fragile (WASM hash mismatches)
- Deployment requires manual HTML injection

The site is a personal portfolio with 13 WASM widgets, 20+ API proxies, world intelligence monitor, and ETF analytics. It must achieve Lighthouse 95+ across all categories.

## Decision

Migrate to **Astro 5.x + SolidJS 1.9** for the following reasons:
1. **Astro** provides native SSG, file-based routing, and content collections without WASM overhead
2. **SolidJS** provides reactive UI without fighting vanilla JS (uses `client:load` for specific elements)
3. **No hydration conflicts** — SolidJS only touches elements it owns, vanilla JS handles the rest
4. **Better DX** — TypeScript, instant HMR, normal browser DevTools
5. **Smaller bundle** — No 1.1MB hydrate WASM on every page

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Leptos (current) | Rust type-safety, WASM performance | Fights vanilla JS, fragile SSG, complex debugging | Rejected |
| Next.js + React | Huge ecosystem, great DX | Heavier bundle, React overhead for simple site | Rejected |
| SvelteKit | Lightweight, fast | Less mature ecosystem | Considered |
| Astro + Solid | Native SSG, lightweight, no conflicts | Newer ecosystem | **Accepted** |

## Consequences

- All interactive UI in SolidJS (no WASM for UI)
- Vanilla JS handles chart libraries (Lightweight Charts, Leaflet)
- Rust WASM only for compute-heavy widgets (correlation, FFT, optimization)
- Clear ownership boundaries between layers
- Zero hydration overhead on static content
- Familiar React-like API for SolidJS
- ~15KB runtime for full SolidJS

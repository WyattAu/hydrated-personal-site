# ADR-024: Motion & Transitions — Motion One

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001 |

## Context

The site needs lightweight, performant transitions between states. GSAP is for complex sequences; Motion One is for simple state changes.

## Decision

Use **Motion One** (Solid-native) for simple transitions:
1. **Enter/exit** — Component mount/unmount animations
2. **Hover states** — Button/card hover effects
3. **Page transitions** — Astro View Transitions integration
4. **5KB bundle** — Much lighter than GSAP for simple cases
5. **Solid-native** — Works with Solid's reactive model

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| CSS transitions | Native, simple | Limited sequencing | Rejected |
| GSAP | Powerful | Heavier for simple transitions | Rejected (for simple cases) |
| Framer Motion | Popular | React-specific | Rejected |
| Motion One | Lightweight, Solid-native, 5KB | Newer | **Accepted** |

## Consequences

- Fast, lightweight transitions for most UI interactions
- GSAP reserved for complex cinematic sequences
- No animation framework conflict
- 5KB gzipped bundle

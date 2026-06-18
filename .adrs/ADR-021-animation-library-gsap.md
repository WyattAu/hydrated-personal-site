# ADR-021: Animation Library — GSAP

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001, BP-SOLIDJS-COMPONENTS-001 |

## Context

The site needs cinematic animations: parallax scrolling, scroll reveals, hover effects, page transitions. CSS animations alone can't handle complex sequences.

## Decision

Use **GSAP (GreenSock Animation Platform)** for complex animations:
1. **ScrollTrigger** — Parallax effects, scroll-based reveals
2. **Spring physics** — Organic, amoebic hover states
3. **Timeline** — Sequenced animations (hero intro, section reveals)
4. **MorphSVG** — Shape morphing (future: card hover effects)
5. **Performance** — Hardware-accelerated, 60fps guaranteed

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| CSS animations | Native, simple | Limited sequencing, no spring physics | Rejected |
| Framer Motion | React-specific | React-only | Rejected |
| Motion One | Lightweight | Less powerful for complex sequences | Considered (for simple transitions) |
| GSAP | Professional, powerful, 60fps | Heavier (~28KB) | **Accepted** |

## Consequences

- Cinematic parallax on hero section
- Smooth scroll-triggered reveals
- Organic hover states with spring physics
- Professional-grade animation quality

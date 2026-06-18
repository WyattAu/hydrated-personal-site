# ADR-022: Organic Graphics — Rough.js

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001 |

## Context

The design calls for "amoebic UI" — organic shapes that contrast with the brutalist grid. Pure CSS can't create hand-drawn, sketchy effects.

## Decision

Use **Rough.js** for organic graphics:
1. **Hand-drawn borders** — Project cards, section dividers
2. **Sketchy fills** — Background textures, accent elements
3. **Organic lines** — Connection lines, flow paths
4. **Roughness parameter** — Control organic feel (0=clean, 3=very rough)
5. **Canvas2D rendering** — No DOM overhead

## Implementation

```javascript
import rough from 'roughjs';
const rc = rough.canvas(canvasElement);
rc.rectangle(10, 10, 200, 120, {
  fill: 'rgba(0, 229, 255, 0.1)',
  stroke: '#00e5ff',
  roughness: 1.5,
  bowing: 1.0,
});
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| CSS filters | Native | Can't create hand-drawn effect | Rejected |
| Paper.js | Powerful | Heavier, more complex | Rejected |
| Rough.js | Lightweight, organic, simple | Canvas2D only | **Accepted** |

## Consequences

- Organic, hand-drawn feel on brutalist grid
- Visual contrast between rigid structure and fluid art
- Adds personality without sacrificing performance
- Works with Canvas2D (no WebGL required)

# ADR-005: Styling — Tailwind CSS 4 + Custom Properties

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001 |

## Context

The current site uses Tailwind 3.4 with 4488 lines of custom CSS. The design system is brutalist with 6 themes. The migration must maintain the same visual identity.

## Decision

Port to **Tailwind CSS 4** with the same design tokens:
1. **Same visual identity** — No design changes, just technology migration
2. **Same 6 themes** — CSS custom properties ported directly
3. **Same animations** — CSS keyframes ported directly
4. **Better tree-shaking** — Tailwind 4 purges unused classes
5. **Smaller output** — Target <80KB CSS (from 103KB)

## Implementation

```css
/* themes.css - Same custom properties */
:root {
  --bg-primary: #050505;
  --accent: #00e5ff;
  /* ... same tokens ... */
}
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Tailwind 3.4 (current) | Stable, familiar | Larger output, older | Rejected |
| Vanilla CSS | No build step | No utility classes, harder to maintain | Rejected |
| CSS Modules | Scoped styles | Less efficient for utilities | Considered |
| Tailwind CSS 4 | Smaller output, better purging | Newer | **Accepted** |

## Consequences

- Zero visual changes
- Same design system
- Smaller CSS bundle (<80KB)
- Easier maintenance

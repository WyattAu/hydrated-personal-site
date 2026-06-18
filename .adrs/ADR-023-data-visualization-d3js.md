# ADR-023: Data Visualization — D3.js

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001, BP-WASM-WIDGETS-001 |

## Context

The correlation network graph requires force-directed layout, edge rendering, and interactive node manipulation. Canvas2D alone can't handle this efficiently.

## Decision

Use **D3.js** for network/data visualizations:
1. **Force-directed layout** — Automatic node positioning
2. **Edge rendering** — Curved/straight lines with labels
3. **Zoom/pan** — Interactive exploration
4. **Tooltips** — Hover information
5. **Animation** — Smooth transitions on data updates

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Chart.js | Simple | No force-directed layout | Rejected |
| vis.js | Network-focused | Heavier, less flexible | Rejected |
| Custom Canvas2D | Full control | Complex force simulation | Rejected |
| D3.js | Powerful, flexible, well-documented | Heavier (~230KB gzipped) | **Accepted** |

## Consequences

- Interactive correlation network on ETF page
- Force-directed graph for network topology
- Data-driven visualizations that update reactively
- 230KB gzipped bundle (loaded on-demand)

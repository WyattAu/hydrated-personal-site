# ADR-002: Chart Library — uPlot

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-WASM-WIDGETS-001, BP-SOLIDJS-COMPONENTS-001 |

## Context

The current site uses custom Canvas2D chart rendering that conflicts between Leptos WASM and vanilla JS. Charts are the primary source of bugs. TradingView's Lightweight Charts has a watermark we don't want.

## Decision

Use **uPlot** for all financial visualizations:
1. **No watermark** — MIT license, no branding
2. **Smallest bundle** — 48KB gzipped (vs 45KB lightweight-charts, but more features)
3. **Fastest rendering** — Benchmarked as fastest JS chart library
4. **Financial features** — Candlestick, line, area charts with crosshair
5. **No Canvas2D conflicts** — uPlot owns its container div
6. **Active maintenance** — Last updated March 2025

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Lightweight Charts | Popular, financial-focused | Watermark, TradingView branding | Rejected |
| Apache ECharts | Feature-rich, no watermark | 800KB bundle (too large) | Rejected |
| KLineChart | Purpose-built, no watermark | 40KB, smaller community | Considered |
| Chart.js + Financial | Popular, good plugins | Heavier, less financial-focused | Rejected |
| D3.js | Maximum flexibility | Very complex, overkill | Rejected |
| Custom Canvas2D | Full control | Conflicts between systems | Rejected |
| uPlot | Fastest, smallest, no watermark | Needs custom candlestick extension | **Accepted** |

## Consequences

- All financial charts use uPlot (price, ETF, correlation)
- Canvas2D only for scatter plots and WASM widgets
- No watermark on any chart
- 48KB gzipped bundle
- Fastest chart rendering in the stack

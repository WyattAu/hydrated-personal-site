# Traceability Matrix

## Requirements to Architecture

| Requirement | Architecture Component | ADR | Test Case | Status |
|-------------|----------------------|-----|-----------|--------|
| FR-001 (TOML Config) | Astro Content Collections | ADR-006 | TC-001 | Planned |
| FR-002 (GitHub Sync) | SolidJS ProjectsList | ADR-017 | TC-002 | Planned |
| FR-003 (Forgejo Sync) | SolidJS ProjectsList | ADR-017 | TC-003 | Planned |
| FR-004 (World Monitor) | Leaflet + SolidJS + uPlot | ADR-002 | TC-004 | Planned |
| FR-005 (Market Ticker) | SolidJS TickerBar | ADR-007 | TC-005 | Planned |
| FR-006 (SEO) | Astro SSG + RouteMeta | ADR-012 | TC-006 | Planned |
| FR-007 (Responsive) | Tailwind CSS 4 | ADR-005 | TC-007 | Planned |
| NFR-001 (TTFB <50ms) | CF Pages CDN | ADR-004 | PERF-001 | Planned |
| NFR-002 (Bundle <110KB) | Lazy-load + code splitting | ADR-010 | PERF-002 | Planned |
| NFR-003 (LCP <1.5s) | Astro SSG + critical CSS | ADR-001 | PERF-003 | Planned |
| NFR-004 (CLS <0.01) | Fixed dimensions, font-display | ADR-005 | PERF-004 | Planned |
| NFR-005 (Type Safety) | TypeScript all JS | ADR-016 | TC-008 | Planned |
| NFR-006 (Accessibility) | WCAG 2.1 AA, Kobalte | ADR-018 | A11Y-001 | Planned |
| NFR-007 (Reproducible) | Bun + Turborepo | ADR-015 | TC-009 | Planned |

## ADR to Component

| ADR | Component | Status |
|-----|-----------|--------|
| ADR-001 | Astro + SolidJS | Accepted |
| ADR-002 | uPlot charts | Accepted |
| ADR-003 | Standalone WASM widgets | Accepted |
| ADR-004 | CF Pages + Workers | Accepted |
| ADR-005 | Tailwind CSS 4 | Accepted |
| ADR-006 | Content Collections | Accepted |
| ADR-007 | SolidJS Signals | Accepted |
| ADR-008 | CustomEvent Bridge | Accepted |
| ADR-009 | IntersectionObserver WASM | Accepted |
| ADR-010 | Turborepo monorepo | Accepted |
| ADR-011 | Vitest + Playwright | Accepted |
| ADR-012 | Astro SEO | Accepted |
| ADR-015 | Bun | Accepted |
| ADR-016 | Biome | Accepted |
| ADR-017 | Solid Query | Accepted |
| ADR-018 | Kobalte UI | Accepted |
| ADR-019 | Valibot | Accepted |
| ADR-020 | Solid Primitives | Accepted |
| ADR-021 | GSAP animations | Accepted |
| ADR-022 | Rough.js organic graphics | Accepted |
| ADR-023 | D3.js network viz | Accepted |
| ADR-024 | Motion One transitions | Accepted |

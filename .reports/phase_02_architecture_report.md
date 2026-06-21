# Phase 2 Architecture Report

**Project**: Hydrated Personal Site
**Phase**: 2 — Architecture Design
**Date**: 2026-06-17
**Author**: Construct (Systems Architect)
**Status**: Complete

---

## Executive Summary

Phase 2 delivers IEEE 1016-compliant Blue Papers, formalized ADRs, and interface contracts for the Hydrated Personal Site migration from Leptos 0.8 to Astro 5 + SolidJS 1.9. The architecture defines 4 major subsystems across 4 Blue Papers, 24 ADRs, and 20+ API endpoint contracts.

---

## Deliverables

### Blue Papers (IEEE 1016)

| ID | Title | Sections | Status |
|----|-------|----------|--------|
| BP-ASTRO-SITE-001 | Astro Site Core — SSG, Routing, Content Collections | BP-1 through BP-10 | Approved |
| BP-CF-WORKER-001 | CF Worker API Layer — Proxy, KV, Security | BP-1 through BP-10 | Approved |
| BP-WASM-WIDGETS-001 | Rust WASM Widget System — 13 Showcase Widgets | BP-1 through BP-10 | Approved |
| BP-SOLIDJS-COMPONENTS-001 | SolidJS Component Library — Reactive UI Islands | BP-1 through BP-10 | Approved |

### ADRs (Architecture Decision Records)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Framework Choice — Astro + SolidJS | Accepted |
| ADR-002 | Chart Library — uPlot | Accepted |
| ADR-003 | Rust WASM — Standalone Widgets Only | Accepted |
| ADR-004 | Deployment — Cloudflare Pages + Workers | Accepted |
| ADR-005 | Styling — Tailwind CSS 4 + Custom Properties | Accepted |
| ADR-006 | Content Management — Astro Content Collections | Accepted |
| ADR-007 | State Management — SolidJS Signals | Accepted |
| ADR-008 | API Communication — CustomEvent Bridge | Accepted |
| ADR-009 | WASM Loading — IntersectionObserver | Accepted |
| ADR-010 | Monorepo Structure — Turborepo | Accepted |
| ADR-011 | Testing Strategy | Accepted |
| ADR-012 | SEO Strategy | Accepted |
| ADR-015 | Package Manager — Bun | Accepted |
| ADR-016 | Code Quality — Biome | Accepted |
| ADR-017 | Data Fetching — Solid Query | Accepted |
| ADR-018 | UI Components — Kobalte | Accepted |
| ADR-019 | Schema Validation — Valibot | Accepted |
| ADR-020 | State Management — Solid Primitives | Accepted |
| ADR-021 | Animation Library — GSAP | Accepted |
| ADR-022 | Organic Graphics — Rough.js | Accepted |
| ADR-023 | Data Visualization — D3.js | Accepted |
| ADR-024 | Motion & Transitions — Motion One | Accepted |

### Interface Contracts

| File | Endpoints | Status |
|------|-----------|--------|
| interface_contracts_api.toml | 20+ API endpoints with request/response schemas | Approved |

### Registry

| File | Status |
|------|--------|
| blue_paper_registry.toml | Approved |

---

## Architecture Overview

### System Decomposition

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Astro 5.x (SSG / Routing / MDX)                       │    │
│  │  BP-ASTRO-SITE-001                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SolidJS 1.9 (Client-side Interactivity)                │    │
│  │  BP-SOLIDJS-COMPONENTS-001                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Rust WASM Showcase Widgets (13 widgets)                │    │
│  │  BP-WASM-WIDGETS-001                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CF Worker (API Layer)                                  │    │
│  │  BP-CF-WORKER-001                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Coupling Analysis

| Interface | Type | Coupling Level | Blueprint |
|-----------|------|----------------|-----------|
| Astro → SolidJS | `client:load` directive | Low | BP-ASTRO-SITE-001 |
| Astro → WASM | IntersectionObserver | Low | BP-WASM-WIDGETS-001 |
| SolidJS → CF Worker | fetch() HTTP | Low | BP-CF-WORKER-001 |
| WASM → CF Worker | fetch() HTTP | Low | BP-CF-WORKER-001 |
| SolidJS → WASM | CustomEvent bridge | Low | BP-SOLIDJS-COMPONENTS-001 |
| CFW → KV | Native binding | Tight | BP-CF-WORKER-001 |

**Overall coupling**: Low. All inter-component communication uses loose coupling patterns (HTTP, CustomEvent, dynamic import). The only tight coupling is CF Worker → KV (native CF binding).

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| SSG | Astro | 5.x | Static site generation, routing, content |
| UI | SolidJS | 1.9 | Client-side interactivity |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Charts | uPlot | latest | Financial visualizations |
| Animations | GSAP + Motion One | latest | Cinematic animations |
| Graphics | Rough.js | latest | Organic hand-drawn feel |
| Data Viz | D3.js | latest | Network graphs |
| Compute | Rust + wasm-pack | latest | WASM widgets |
| API | Cloudflare Workers | — | API proxying |
| Storage | Cloudflare KV | — | Guestbook, rate limiting |
| Hosting | Cloudflare Pages | — | Static hosting |
| Build | Turborepo + pnpm | — | Monorepo orchestration |
| Runtime | Bun | 1.0+ | Package management |
| Linting | Biome | latest | Code quality |
| Testing | Vitest + Playwright | latest | Unit + E2E testing |
| Validation | Valibot | latest | Schema validation |
| UI Components | Kobalte | latest | Accessible headless UI |
| Data Fetching | Solid Query | latest | API caching |

---

## Design Decisions Summary

### Key Architectural Decisions

1. **Astro + SolidJS (ADR-001)**: Islands architecture eliminates hydration conflicts. Static content has zero JS overhead.

2. **Standalone Rust WASM (ADR-003)**: 70-130KB per widget vs 200-400KB with Leptos. Clean boundaries.

3. **uPlot (ADR-002)**: Fastest JS chart library, no watermark, MIT license, 48KB gzipped.

4. **CF Worker API Layer (ADR-004)**: Framework-agnostic proxy, security headers, KV storage.

5. **CustomEvent Bridge (ADR-008)**: Clean decoupling between SolidJS, WASM, and vanilla JS.

6. **IntersectionObserver (ADR-009)**: WASM only loads when visible, skeleton loading provides smooth UX.

7. **TanStack Solid Query (ADR-017)**: Automatic caching, background refetch, deduplication.

8. **Kobalte (ADR-018)**: Accessible by default, headless, Solid-native.

9. **Valibot (ADR-019)**: 10x smaller than Zod, tree-shakeable, TypeScript-first.

10. **GSAP + Rough.js + D3.js (ADR-021/022/023)**: Professional animations, organic graphics, network graphs.

---

## Performance Budget

| Asset | Target | Strategy |
|-------|--------|----------|
| Initial HTML | <10KB | SSG pre-render |
| CSS | <80KB | Tailwind 4 purging |
| JS (initial) | <50KB | SolidJS ~4KB + Alpine ~16KB |
| WASM (per widget) | <100KB | Standalone Rust, no framework |
| Total first load | <400KB | SSG + lazy WASM |
| Charts | <50KB | uPlot (48KB gzipped) |
| Fonts | 78KB | Inter (47KB) + JetBrains Mono (31KB) |

### Core Web Vitals Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | <1.5s | SSG + critical CSS + font preload |
| FID | <50ms | SolidJS hydration only on islands |
| CLS | <0.01 | Fixed dimensions, font-display: swap |
| TTI | <1.5s | Lazy WASM, minimal initial JS |

---

## Security Architecture

### Headers (CF Worker)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [see BP-CF-WORKER-001]
```

### API Security

- Rate limiting: 5 posts/IP/10min on guestbook
- Bearer token for admin operations
- Honeypot spam protection
- Input validation via Valibot
- No sensitive data in error messages

### WASM Security

- WASM loaded from same origin
- No external WASM dependencies
- No eval() or Function() constructors
- Memory-safe Rust (no unsafe blocks)

---

## Traceability Matrix

### Requirements → Blue Papers

| Requirement | BP-ASTRO | BP-CFW | BP-WASM | BP-Solid |
|-------------|----------|--------|---------|----------|
| FR-2.1: Page Structure | Y | | | |
| FR-2.2.1: Theme System | | | | Y |
| FR-2.2.2: Navigation | Y | | | Y |
| FR-2.2.3: World Monitor | | | Y | Y |
| FR-2.2.4: ETF Intelligence | | | Y | Y |
| FR-2.2.5: Guestbook | | Y | | Y |
| FR-2.2.6: WASM Widgets | | | Y | |
| FR-2.3: API Endpoints | | Y | | |
| FR-3.1: Performance | Y | Y | Y | Y |
| FR-3.2: SEO | Y | | | |
| FR-3.3: Accessibility | Y | | Y | Y |
| FR-3.4: Security | | Y | | |
| FR-3.5: Reliability | Y | Y | Y | Y |
| FR-4.1: CF Platform | Y | Y | | |
| FR-4.4: Build Tools | Y | | Y | Y |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| SolidJS hydration fails | Low | High | Use `client:only="lazy"` for isolation | BP-SOLIDJS |
| WASM widgets don't load | Medium | Medium | Skeleton loading + error boundaries | BP-WASM |
| CF Worker API changes | Low | Medium | Framework-agnostic (no Leptos dep) | BP-CFW |
| Visual regression | Medium | High | Screenshot comparison CI | BP-ASTRO |
| Performance regression | Low | Medium | Lighthouse CI on every PR | All |
| SEO regression | Low | High | Google Rich Results Test validation | BP-ASTRO |
| Accessibility regression | Medium | Medium | Automated axe-core testing | BP-Solid |
| Bundle size exceeds budget | Low | Medium | Size analysis in CI | All |
| WASM memory leak | Low | High | Strict cleanup lifecycle | BP-WASM |

---

## File Inventory

### Created Files

```
.specs/02_architecture/
├── blue_paper_registry.toml          # Registry of all Blue Papers
├── BP-ASTRO-SITE-001.md              # Astro Site Core (IEEE 1016)
├── BP-CF-WORKER-001.md               # CF Worker API Layer (IEEE 1016)
├── BP-WASM-WIDGETS-001.md            # WASM Widget System (IEEE 1016)
├── BP-SOLIDJS-COMPONENTS-001.md      # SolidJS Components (IEEE 1016)
└── interface_contracts/
    └── interface_contracts_api.toml  # API endpoint contracts

.adrs/
├── ADR-001-astro-solidjs-migration.md
├── ADR-002-chart-library-uplot.md
├── ADR-003-rust-wasm-standalone.md
├── ADR-004-deployment-cf-pages-workers.md
├── ADR-005-styling-tailwind-css4.md
├── ADR-006-content-astro-collections.md
├── ADR-007-state-solidjs-signals.md
├── ADR-008-communication-customevent-bridge.md
├── ADR-009-wasm-loading-intersectionobserver.md
├── ADR-010-monorepo-turborepo.md
├── ADR-011-testing-strategy.md
├── ADR-012-seo-strategy.md
├── ADR-015-package-manager-bun.md
├── ADR-016-code-quality-biome.md
├── ADR-017-data-fetching-solid-query.md
├── ADR-018-ui-components-kobalte.md
├── ADR-019-schema-validation-valibot.md
├── ADR-020-state-management-solid-primitives.md
├── ADR-021-animation-library-gsap.md
├── ADR-022-organic-graphics-roughjs.md
├── ADR-023-data-visualization-d3js.md
└── ADR-024-motion-transitions-motion-one.md

.reports/
└── phase_02_architecture_report.md   # This report
```

---

## Next Steps (Phase 3)

Phase 3 will cover detailed implementation design:

1. **Component Implementation** — Detailed SolidJS component code
2. **WASM Widget Implementation** — Rust widget code and build pipeline
3. **API Implementation** — CF Worker endpoint code
4. **Styling Implementation** — Tailwind CSS 4 + theme system
5. **Testing Implementation** — Unit, integration, E2E tests
6. **CI/CD Implementation** — GitHub Actions pipeline

---

*Phase 2 Architecture Report — Construct (Systems Architect)*
*Generated: 2026-06-17*

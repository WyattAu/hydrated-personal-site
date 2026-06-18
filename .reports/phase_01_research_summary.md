# Phase 1 Research Summary

**Date:** 2026-06-17  
**Author:** DeepThought (Researcher)  
**Status:** Complete

---

## Executive Summary

Phase 1 establishes theoretical ground truth for the Hydrated Personal Site migration from Leptos 0.8 to Astro 5 + SolidJS 1.9. Five Yellow Papers were produced covering the core architectural domains: web framework, reactivity, WASM widgets, data visualization, and edge infrastructure.

**Key Findings:**

| Domain | Decision | Confidence |
|--------|----------|------------|
| Framework | Astro 5 SSG + SolidJS 1.9 islands | High |
| Reactivity | Fine-grained signals (no VDOM) | High |
| WASM | Standalone rust + web-sys (no Leptos framework) | High |
| Charts | uPlot (48KB) + Canvas2D + D3.js (lazy) | High |
| Infrastructure | CF Pages + CF Worker + CF KV | High |

---

## Yellow Papers Summary

### YP-WEB-ASTRO-SSG-001: Astro SSG Architecture

**Core thesis:** SSG is optimal for a portfolio site where content changes on deploy, not at request time. Astro islands provide partial hydration, reducing the hydration cost from $O(n)$ (all components) to $O(k)$ (interactive islands only).

**Key metrics:**
- 7/8 pages are static (87.5% routes)
- Total first load: ~201KB (target: <400KB)
- LCP target: <1.5s (SSG + CDN + critical CSS)
- Build pipeline: WASM → CSS → Astro SSG → CF Pages

**Tradeoff acknowledged:** Content freshness is limited to build-time snapshots. Mitigated by API proxies for dynamic data (crypto, weather, news).

### YP-WEB-SOLIDJS-REACTIVITY-001: SolidJS Reactivity

**Core thesis:** Fine-grained reactivity via signals eliminates the VDOM overhead. Update cost is $O(1)$ per signal subscriber vs $O(n)$ for React's VDOM diff.

**Key metrics:**
- Runtime size: ~15KB (vs React's ~40KB)
- Update granularity: Node-level (not component-level)
- Hydration: 10 islands with mixed directives (load/visible/idle)

**Migration path:** Leptos `create_signal` → SolidJS `createSignal` (same mental model). Component ownership model maps directly.

### YP-WASM-WIDGET-ARCH-001: WASM Widget Architecture

**Core thesis:** Standalone Rust + web-sys widgets are 55-70% smaller than Leptos framework widgets (70-130KB vs 200-400KB). Clean ownership boundaries prevent DOM conflicts.

**Key metrics:**
- 13 widgets, ~1.1MB total WASM
- Per-widget: 40-130KB (target: <130KB)
- Loading: IntersectionObserver with 200px margin
- Communication: CustomEvent bridge (SolidJS ↔ WASM)

**Risk identified:** `Closure::forget()` in WASM event listeners causes memory leaks. Mitigated by widget lifecycle management (disconnect on unmount).

### YP-VISUALIZATION-FINANCE-001: Financial Data Visualization

**Core thesis:** uPlot provides the best balance of size (48KB), performance (60fps at 10K points), and features (no watermark) for financial charts.

**Key metrics:**
- uPlot: 48KB gzipped
- D3.js: 230KB (lazy-loaded for correlation network only)
- Rough.js: 40KB (lazy-loaded for organic rendering)
- Canvas2D: Native (scatter plots, allocation charts)

**Performance budget:** 16.67ms per frame. Canvas2D scatter plots: ~5ms for 10K points. Well within budget.

### YP-INFRA-CF-WORKERS-001: Edge Computing with CF Workers

**Core thesis:** CF Workers provide zero cold-start (<5ms), edge-global execution, and KV storage for API proxying. Rate limiting via fixed window algorithm is sufficient for personal site traffic.

**Key metrics:**
- CPU time: 10ms (free), 30s (paid)
- KV eventual consistency: 10-60s propagation
- Cache TTLs: 10s (crypto) to 6h (LLM benchmarks)
- Security headers: 8 headers injected at Worker level

**Cost estimate:** $0.01-$0.05/month for KV operations.

---

## Test Vectors

| Category | Count | Pass Criteria |
|----------|-------|---------------|
| LCP scenarios | 4 | LCP < 1500ms on 4G |
| Bundle sizes | 6 | Total < 400KB, per-WASM < 130KB |
| API response times | 5 | < 100ms (cached), < 3s (miss) |
| WASM load times | 5 | Load + render < 150-350ms |
| Layout shift | 3 | CLS < 0.01 |
| Input latency | 3 | FID < 50ms, INP < 200ms |

---

## Domain Constraints

| Constraint | Value | Source |
|-----------|-------|--------|
| LCP | < 1.5s | Google Core Web Vitals |
| CLS | < 0.01 | Google Core Web Vitals |
| Initial load | < 400KB | Project requirement |
| CSS | < 80KB | Tailwind 4 purging |
| WASM per widget | < 130KB | Bundle budget |
| API cache | 10s–6h | Data freshness analysis |
| CF Worker CPU | 10ms (free) | Platform limit |
| WASM heap | < 50MB | Browser memory budget |

---

## Decisions Locked

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-001 | Astro + SolidJS over Leptos | No DOM conflicts, smaller bundle, better DX |
| ADR-002 | uPlot over Lightweight Charts | No watermark, fastest rendering |
| ADR-003 | Standalone WASM over Leptos widgets | 55-70% smaller bundles |
| ADR-004 | CF Pages + Workers | Zero cold start, edge-global |
| ADR-005 | Tailwind CSS 4 | Same design, smaller output |
| ADR-006 | Astro Content Collections | Type-safe, markdown-driven content |
| ADR-007 | SolidJS signals | Familiar Leptos-like reactivity |
| ADR-008 | CustomEvent bridge | Decoupled layer communication |
| ADR-009 | IntersectionObserver WASM loading | No wasted bandwidth |
| ADR-010 | Turborepo monorepo | Parallel builds, shared deps |

---

## Next Steps (Phase 2: Design)

1. Detailed component specifications for all 13 WASM widgets
2. API proxy route handler specifications
3. SolidJS island component interfaces
4. Content Collection schema definitions
5. Security header CSP directive specification
6. E2E test scenario specifications

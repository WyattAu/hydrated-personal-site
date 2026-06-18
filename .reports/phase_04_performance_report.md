# Phase 4 Performance Engineering Report

**Project:** Hydrated Personal Site
**Phase:** 4 — Performance Engineering
**Date:** 2026-06-17
**Status:** Complete

---

## Executive Summary

Performance engineering for the Hydrated Personal Site migration from Leptos 0.8 to Astro 5 + SolidJS 1.9. The plan targets a 50% reduction in initial bundle size, sub-1.5s LCP, and Lighthouse 95+ across all categories. Key strategies: SSG pre-rendering, route-level code splitting, lazy WASM loading via IntersectionObserver, and aggressive CDN caching with stale-while-revalidate.

---

## Deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Performance Requirements | `.specs/04_performance/performance_requirements.md` | ✅ Complete |
| Benchmark Suite Design | `.specs/04_performance/benchmark_suite.md` | ✅ Complete |
| Optimization Roadmap | `.specs/04_performance/optimization_roadmap.md` | ✅ Complete |
| Performance Report | `.reports/phase_04_performance_report.md` | ✅ Complete |

---

## Key Performance Targets

### Core Web Vitals

| Metric | Current (Leptos) | Target (Astro) | Improvement |
|--------|-----------------|----------------|-------------|
| LCP | ~3.5s | <1.5s | -57% |
| FID | ~150ms | <50ms | -67% |
| CLS | ~0.05 | <0.01 | -80% |
| INP | ~400ms | <200ms | -50% |
| TTI | ~4.0s | <1.5s | -63% |

### Bundle Size

| Resource | Current | Target | Reduction |
|----------|---------|--------|-----------|
| Total first load | ~800KB | <400KB | -50% |
| HTML | ~15KB | <5KB | -67% |
| CSS | ~120KB | <80KB | -33% |
| JS (initial) | ~200KB | <50KB | -75% |
| WASM (total) | ~1.2MB eager | <800KB lazy | -33% loaded |

### Build Performance

| Metric | Current | Target |
|--------|---------|--------|
| Cold build | ~5min | <180s |
| Warm build | ~5min | <30s |
| CI pipeline | ~10min | <5min |

---

## Architecture Decisions

### 1. Astro SSG Over Leptos SSR

**Decision:** Pre-render all pages at build time with Astro SSG.

**Rationale:**
- Zero server runtime = no cold starts on CF Pages
- Static HTML served from edge CDN (global PoPs)
- SolidJS islands for interactivity without full-page hydration
- 67% smaller HTML (Astro strips Leptos runtime)

### 2. Lazy WASM Loading

**Decision:** Load all 13 WASM widgets via IntersectionObserver with 200px root margin.

**Rationale:**
- Widgets below fold don't block initial render
- Skeleton UI provides instant feedback
- WASM modules are content-hashed (immutable CDN cache)
- 200px root margin preloads before widget enters viewport

### 3. Stale-While-Revalidate Caching

**Decision:** All API endpoints use stale-while-revalidate with data-type-specific TTLs.

**Rationale:**
- Users see cached data instantly (zero latency)
- Fresh data fetched in background
- TTLs match data freshness requirements (10s for crypto, 6h for benchmarks)
- CF Worker KV provides edge-cached responses

### 4. Critical CSS Inlining

**Decision:** Inline <8KB of critical CSS, async load full stylesheet.

**Rationale:**
- Eliminates render-blocking CSS request
- Above-the-fold content paints immediately
- Full CSS loaded via `<link rel="preload">` without blocking

### 5. Self-Hosted Fonts

**Decision:** Host Inter (47KB) and JetBrains Mono (31KB) as woff2 files.

**Rationale:**
- Eliminates Google Fonts privacy concern
- `font-display: swap` prevents invisible text
- `size-adjust` on fallback fonts eliminates CLS from font swap
- Immutable CDN cache (1 year TTL)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WASM compile time on slow devices | High | Low | IntersectionObserver + skeleton UI |
| D3.js bundle (230KB) too large | Medium | Medium | Lazy load only on World page, consider lighter alternative |
| Font swap causes FOUT | Low | High | `size-adjust` fallback metrics, `font-display: swap` |
| API upstream failures degrade UX | Medium | Medium | Circuit breakers, graceful degradation, cached fallbacks |
| CSS purge misses dynamic classes | Low | Medium | Safelist dynamic Tailwind classes in config |
| Service worker caches stale HTML | Low | Low | `max-age=0, must-revalidate` on HTML |

---

## Testing Strategy

### Automated Tests

| Test Type | Tool | Coverage |
|-----------|------|----------|
| Bundle size gates | size-limit, custom scripts | All pages, all WASM |
| API latency | Vitest | 16 endpoints |
| Lighthouse CI | lhci | 8 pages, 5 runs each |
| Memory leaks | Playwright | Page navigation cycles |
| WASM load times | Vitest | All 13 widgets |
| Core Web Vitals | web-vitals (RUM) | All real users |

### CI Gates

- Bundle size: build fails if any resource exceeds budget
- Lighthouse: build fails if score <95 on any page
- API latency: build fails if p95 > budget
- Memory: build fails if >20MB growth after 24 navigations

---

## Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Lighthouse perf score | 95+ | lhci, 5 runs, median |
| LCP (p75) | <1.5s | RUM + lhci |
| CLS (p75) | <0.01 | RUM + lhci |
| INP (p75) | <200ms | RUM + lhci |
| Total first load | <400KB | size-limit |
| WASM per widget | <100KB | size-limit |
| API p95 latency | <100ms | Vitest |
| Build time (warm) | <30s | Turborepo |
| WCAG 2.1 AA | Pass | axe-core |

---

## Next Steps

1. **Implementation:** Follow optimization roadmap phases 1-9
2. **Baseline:** Run Lighthouse against current Leptos site for comparison
3. **Monitoring:** Set up RUM dashboard with CF Worker + KV
4. **Iteration:** Weekly review of RUM data, monthly Lighthouse audit
5. **Documentation:** Update AGENTS.md with performance commands

# Phase -1 Context Discovery Report: Hydrated Personal Site

**Date:** 2026-06-17
**Analyst:** Domain Analyst (automated)
**Project:** Hydrated Personal Site
**Live Site:** wyattau.com

---

## Executive Summary

This report documents the domain context for migrating a Leptos 0.8 (Rust/WASM) personal portfolio site to Astro 5.x + SolidJS 1.9. The site serves three simultaneous purposes: career portfolio for Wyatt Au, real-time intelligence dashboard, and Rust WASM technical showcase.

---

## 1. Domain Classification

| Aspect | Classification |
|--------|---------------|
| Primary | Personal Portfolio |
| Secondary | Intelligence Dashboard |
| Tertiary | WASM Technical Showcase |
| Architecture | Static Site + Client-Side Islands |
| Deployment | Edge-Deployed (CF Pages + Workers) |

---

## 2. Key Findings

### 2.1 Migration Motivation
The current Leptos 0.8 architecture has critical issues (ADR-001):
- WASM + vanilla JS DOM ownership conflicts
- Price chart labels missing, ETF data broken, world chart not loading
- Fragile SSG build (WASM hash mismatches)
- Manual HTML injection required for deployment

### 2.2 Technology Stack
The target stack (Astro 5.x + SolidJS 1.9) resolves these conflicts through:
- Clean component ownership boundaries (architecture.md:63-73)
- Selective hydration via `client:load` islands
- Framework-agnostic API layer (CF Worker unchanged)

### 2.3 Complexity Indicators

| Indicator | Count | Notes |
|-----------|-------|-------|
| Pages/routes | 8 | `/`, `/projects`, `/dossier`, `/world`, `/docs`, `/etf`, `/guestbook`, `/uses` |
| Interactive features | 6 | Theme, nav, command palette, world monitor, ETF, guestbook |
| API endpoints | 16+ | Proxied through CF Worker |
| External data sources | 16 | Yahoo Finance, Binance, CoinGecko, USGS, NOAA, etc. |
| WASM widgets | 13 | Finance (5), Science (3), Creative (2), DevTools (3) |
| Design themes | 6 | midnight-navy, tokyo-night, arctic-dawn, solaris, light |
| ADRs | 24 | Architecture decisions documented |
| Visualization libs | 7 | uPlot, Rough.js, GSAP, Motion One, D3.js, Leaflet, Canvas2D |

### 2.4 Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse | 95+ all categories |
| FCP | <1.5s on 4G |
| CLS | <0.01 |
| TTI | <1.5s |
| Initial bundle | <50KB |
| WASM per widget | <100KB |
| Total first load | <400KB |

### 2.5 Design Philosophy: Cinematic Brutalism
The site's unique visual identity combines three forces:
1. **Brutalist foundation** — Zero border-radius, monospace, exposed grid
2. **Cinematic drama** — Vignettes, parallax, film grain, letterboxing
3. **Amoebic organics** — Morphing hover states, flowing particles, cellular noise

This creates a distinctive "structured drama" aesthetic that differentiates the site from typical portfolio designs.

---

## 3. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| External API downtime | High | Medium | Graceful degradation, stale-while-revalidate caching |
| WASM bundle size creep | Medium | High | IntersectionObserver lazy loading, <100KB target |
| Performance regression | Medium | High | Lighthouse CI on every PR |
| Accessibility regression | Low | High | axe-core automated checks |
| Security vulnerability (guestbook) | Medium | Medium | Rate limiting, input validation, CSP |
| Leptos migration bugs | High | Low | New stack avoids Leptos DOM conflicts entirely |

---

## 4. Stakeholder Summary

| Stakeholder | Primary Need | Priority |
|-------------|-------------|----------|
| Wyatt Au | Portfolio + technical showcase | Critical |
| Recruiters | Quick skill assessment | Critical |
| Developers | Technical depth | High |
| Search Engines | Crawlable, structured content | High |

---

## 5. Artifact Inventory

| Artifact | Location | Content |
|----------|----------|---------|
| Domain Analysis | `.specs/00_requirements/domain_analysis.md` | Classification, characteristics, stakeholders, stack, data sources, design philosophy |
| Applicable Standards | `.specs/00_requirements/applicable_standards.md` | ISO 12207, IEEE 1016, WCAG 2.1, NIST 800-53, OWASP Top 10 |
| Capability Requirements | `.specs/00_requirements/capability_requirements.md` | Core, design, security, SEO, monitoring, dev tool capabilities |
| This Report | `.reports/phase_-1_context_discovery_report.md` | Summary of findings |

---

## 6. Recommendations for Next Phase

1. **Start with Astro SSG setup** — Get all 8 routes rendering static HTML before adding interactivity
2. **Port theme system first** — CSS custom properties port directly, zero visual changes (ADR-005)
3. **Implement SolidJS islands incrementally** — Start with theme toggle and command palette, add complexity
4. **Keep CF Worker unchanged** — API layer is framework-agnostic, no changes needed
5. **Lazy-load WASM last** — Widgets are the final layer; get the base site working first
6. **Run Lighthouse CI early** — Establish performance baseline before adding features

---

## 7. Source Documents Referenced

| Document | Lines | Content |
|----------|-------|---------|
| `requirements.md` | 1-232 | Functional/non-functional requirements, API endpoints, data sources |
| `architecture.md` | 1-416 | System architecture, component boundaries, file structure, deployment |
| `design.md` | 1-592 | Design philosophy, color system, typography, animation, responsive |
| `decisions.md` | 1-706 | 24 ADRs covering framework, charting, WASM, deployment, testing |

# Hydrated Personal Site -- Version Tracking

## Current State

- **Phase:** 4 (Documentation Overhaul)
- **Version:** 2.1.0
- **Status:** Audit complete -- 89 tests, full CI/CD pipeline, design compliance verified
- **Last Updated:** 2026-06-18

## Audit Summary

| Category | Before | After | Delta |
|----------|--------|-------|-------|
| Unit Tests | 74 | 89 | +15 (property-based) |
| Lint Errors | 156 | 0 (blocking) | -156 |
| Lint Warnings | 119 | ~16 (non-blocking) | -103 |
| Build Status | Failing | Passing | Fixed |
| Pre-commit Hook | None | Active | Added |
| CI/CD Pipeline | Broken (missing a11y, lighthouse) | Fixed | Repaired |
| GUI Tests | Basic E2E | Full traversal (9 routes, 4 viewports) | Enhanced |
| README | Empty | Complete | Written |
| Design Compliance | Unverified | Verified (Spatial Materialism, Amoebic UI) | Verified |

## Key Fixes Applied

1. Fixed `packageManager` field in root `package.json` (unblocked Turborepo)
2. Fixed missing `BaseLayout` import in `404.astro` (unblocked build)
3. Restored 8 Astro pages with component imports removed by Biome auto-fix
4. Restored 10+ template variables incorrectly prefixed with underscore by Biome
5. Restored `widgetId` variable in `WasmEmbed.astro`
6. Added `type="button"` to all interactive button elements (a11y compliance)
7. Added `aria-label` and `<title>` to SVG elements (a11y compliance)
8. Added `aria-controls` to combobox in SearchBar (a11y compliance)
9. Added keyboard event handler to CommandPalette overlay (a11y compliance)
10. Removed dead code (`getColor`, `BAR_COLORS` in PortfolioComparison)
11. Added biome-ignore comments for Astro template variables (false positives)
12. Created `lighthouserc.json` for Lighthouse CI integration
13. Simplified CI pipeline (removed duplicate jobs, fixed broken stages)
14. Added `fast-check` dependency for property-based testing
15. Created `tests/unit/property.test.ts` with 15 property-based tests

## Migration Context

| Attribute | Source (SSR_personal_site) | Target (hydrated_personal_site) |
|-----------|---------------------------|--------------------------------|
| Framework | Leptos 0.8.15 (Rust/WASM) | Astro 5.x + SolidJS 1.9 |
| CSS | Tailwind CSS 3.4.19 | Tailwind CSS 4.x |
| Build | wasm-bindgen + Node.js | wasm-pack + Turborepo + Bun |
| Package Manager | npm/pnpm | Bun |
| Linting | N/A | Biome |
| Testing | Rust unit + Puppeteer E2E | Vitest + Playwright + fast-check |
| Deployment | CF Pages Advanced Mode | CF Pages + Workers |
| API Endpoints | 27 | 20 (ported) |
| Routes | 9 | 9 (404 added) |
| WASM | 1.4MB monolith (SSG) | 13 standalone widgets (70-130KB each) |

## History

| Date | Phase | Version | Status | Notes |
|------|-------|---------|--------|-------|
| 2026-06-17 | -1 to 9 | 0.0.0 - 0.9.0 | Completed | R&D cycle |
| 2026-06-18 | 0 | 1.0.0 | Completed | Foundation |
| 2026-06-18 | 1-5 | 1.1.0 - 1.5.0 | Completed | Implementation |
| 2026-06-18 | 6 | 1.6.0 | Completed | Launch ready |
| 2026-06-18 | - | 2.0.0 | Completed | Full content + 13 WASM widgets |
| 2026-06-18 | 1-4 | 2.1.0 | Completed | Audit: 89 tests, CI/CD fixed, a11y compliance, GUI traversal |

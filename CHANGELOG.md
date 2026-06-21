# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] — 2026-06-21

### Added

- Version-controlled pre-commit hook (`scripts/pre-commit`) installed via the `prepare` package script. Gates commits on Biome format+lint, TypeScript typecheck (apps/site and worker), Vitest unit tests, and `cargo check` for Rust changes.
- Snapshot review script (`scripts/review-gui-snapshots.sh`) for diffing DOM JSON baselines produced by the GUI traversal E2E suite.
- `--z-bg`, `--z-content`, `--z-card`, `--z-overlay`, `--z-nav`, `--z-modal` token-chain assertions in the GUI traversal suite.
- Shadow light-source assertion (top-left, downward y-offset) in the GUI traversal suite.
- Cubic-bezier easing token assertions for `--ease-brutal`, `--ease-amoeba`, `--ease-cinematic`, `--ease-spring`.
- `prefers-reduced-motion` assertion: no infinite-duration animations may run when the user requests reduced motion.
- Per-viewport screenshots (mobile, tablet, desktop, ultrawide) captured for all 9 routes into `.tmp/gui-review/`.

### Changed

- **Biome:** Ignore list now correctly covers `.turbo/`, `.wrangler/`, `bun.lock`, `apps/site/public/wasm/`, and `apps/site/public/wasm-anim.js`. Added `overrides` to disable `noUnusedVariables`/`noUnusedImports` for `.astro` (biome 1.x cannot see Astro template usage) and to relax `noNonNullAssertion`/`noForEach` for test files.
- **Vitest:** Switched from the default `threads` pool to `forks` to eliminate esbuild service-terminated panics under high parallelism on Node.js >= 23.
- **Package layout:** All app-level dependencies moved from root `package.json` into `apps/site/package.json`. Root now contains only workspace-wide dev tooling (biome, turbo, vitest, fast-check, happy-dom, valibot, @vitest/coverage-v8).
- **Worker tsconfig:** Added `"lib": ["ES2022"]` to exclude DOM globals that conflicted with `@cloudflare/workers-types`.
- **Worker package.json:** Added missing `@cloudflare/workers-types` dev dependency and a `build` script stub (wrangler bundles at deploy time).
- **Site package.json:** Declared previously-implicit dependencies: `@astrojs/rss`, `@astrojs/sitemap`, `@formkit/auto-animate`, `astro-seo`, `solid-sonner`. Pinned Playwright to 1.61 to match CI.
- **Forgejo CI workflow:** Stage-1 jobs now install worker dev deps before typecheck. `bunx biome check .` runs against the whole tree. Vitest runs with `--pool=forks` and emits both coverage and JUnit reports.
- **Forgejo Deploy workflow:** Removed GitHub Pages OIDC permissions (we deploy to Cloudflare). Replaced `turbo build --filter=worker` (which had no script to invoke) with a dedicated worker typecheck step. Wired WASM dist into the Pages deploy via build artifact. Replaced `npx wrangler` with `bunx wrangler@3`. Worker deploy runs from `worker/` directory. Pages deploy uses `wrangler pages deploy` (not the non-existent `deploy-pages` subcommand).
- **Forgejo Uptime workflow:** Fixed the weather probe (`lng` -> `lon`). Sitemap URL is now `sitemap-index.xml` (the file Astro actually generates). Added `fail-fast: false` so one failing probe does not mask the others.
- **GUI traversal suite:** Snapshot output moved from `test-results/gui-snapshots/` to `.tmp/gui-review/` so baselines survive test-result cleanups. Link status assertions changed from `=== 200` to `< 400` to permit 3xx redirects.

### Fixed

- **Astro build:** `BaseLayout is not defined` — restored missing `import BaseLayout from '../layouts/BaseLayout.astro'` in all 9 page files (a prior refactor had removed them assuming auto-imports that were never configured).
- **Astro build:** `SEO is not defined` — added `import { SEO } from 'astro-seo'` to `BaseLayout.astro`.
- **Astro build:** `renderedDocs is not defined` in `docs.astro` — renamed the underscore-prefixed `_renderedDocs` const to match its template references.
- **WASM components:** `_widgetId` was declared but `widgetId` was used in the template and `define:vars`. The bug was masked during development because the template reference resolved at runtime via hoisting. All four WASM astro components fixed.
- **`@solid-primitives/i18n`:** Removed `createContext` import — the API does not exist in v2.x and the exported `I18nProvider`/`useI18n` were never consumed by any component.
- **RSS feed:** `context.site` is `URL | undefined`; passing it directly to `@astrojs/rss` failed the type. Now falls back to `context.url.origin`.
- **Worker:** Yahoo Finance chart response typed as `unknown` caused `data?.chart?.result?.[0]?.meta` to fail. Now explicitly typed via an inline cast.
- **LLMBenchmarkModel:** Optional `price_per_m_token` and `tokens_per_sec` fields were accessed via `as any` casts in `ScatterPlots.tsx`. Now declared on the interface and accessed safely with `?? 0` fallbacks.
- **Cross-flow null assertions:** `EtfApp`, `PortfolioComparison`, `PriceChart`, `WorldMap`, and both API catch-alls replaced `!` non-null assertions with `keyed` `<Show>` patterns (SolidJS), explicit guards, or `?? fallback`.
- **forEach -> for-of conversions:** `WorldMap`, `PriceChart`, `MetricCards`, `DataPanels`, `ScatterPlots` converted to `for...of` on hot paths (canvas drawing, data normalization, marker iteration). Removes biome warnings and avoids the per-iteration closure allocation overhead.
- **SolidJS CSS prop casing:** `fontSize`, `fontFamily`, `letterSpacing` in `PerformanceMetrics.tsx`, `ToasterWrapper.tsx`, `PortfolioComparison.tsx` converted to kebab-case (`'font-size'`, etc.) which is what SolidJS's `CSSProperties` type actually accepts.
- **Possibly-undefined access:** 28 strict-null-check errors across `MetricCards`, `PerformanceMetrics`, `ScatterPlots`, `WorldMap`, `CorrelationMatrix`, `DataPanels` resolved with `?.` and `?? fallback` patterns.
- **Rust dead code:** `canvas_id`/`width`/`height` fields on `AudioVisualizer` and `NBodySimulation` structs marked `#[allow(dead_code)]` (retained for API stability, currently unused by update paths). Unused `total_fee` binding prefixed with `_`. Unnecessary `mut` on `max_y` in `regex.rs` removed.
- **Pre-commit script:** Fixed `unbound variable` error from `${#array[@]}` under `set -u` by computing the file count via `grep -c` instead.
- **Health-check script:** Replaced `PASS`/`FAIL` glyphs with ASCII `PASS`/`FAIL` tokens per the no-emoji policy.
- **`WorldMap.tsx`:** `leafletMap: any` parameter replaced with proper `import('leaflet').Map` type. The `addEarthquakeMarkers` function signature is now type-safe.
- **Uptime workflow:** Weather probe now uses `lon=` (correct Open-Meteo parameter name); the prior `lng=` caused the worker to return 400 instead of probing weather data.

### Removed

- 6 emoji/glyph occurrences from source (`scripts/health-check.sh`, `apps/site/src/pages/docs.astro`, `WorldMap.tsx`, `DataPanels.tsx`, `DynamicRepos.tsx`). The Mac Command-key glyph in the docs search affordance is now `Cmd-K`; the GitHub stars display uses the word `Stars:` instead of the star glyph.
- 56 emoji occurrences from `.reports/`, `.specs/`, `.adrs/`, `.docs/`. Replaced with text equivalents (`PASS`/`FAIL`/`Y`/`N`/`*`) or removed outright where decorative.
- Dead code: unused `cached()` helper in both API catch-alls; unused `parseParams()` in `ScatterPlots.tsx`; unused `ApiVersionResult` interface in `worker/src/index.ts`; unused `request` parameter in the `[...path].ts` GET handler.
- Redundant runtime dependencies from root `package.json`: `astro`, `@astrojs/cloudflare`, `@astrojs/solid-js`, `@formkit/auto-animate`, `@playwright/test`, `@solid-primitives/i18n`, `astro-seo`, `solid-sonner`. These are now declared only in the workspace package that actually uses them.
- 16 redundant `// biome-ignore lint/correctness/noUnusedVariables` comments from `.astro` files — the rule is now disabled at the config level for `.astro` extensions, making the inline suppressions noise.

## [2.1.0] — 2026-06-18

Audit pass: +15 property tests, lint cleanup, pre-commit hook, CI/CD repair, GUI test enhancements.

## [2.0.0] — 2026-06-17

Full implementation: all 9 pages enhanced, 13 WASM widgets (140 KB raw / 63 KB gzip), 74 unit + ~73 E2E tests, build ~7.5 s.

## [1.6.0] — 2026-06-17

Launch ready: 3 WASM widgets (Fourier, Cellular, Regex) at 41 KB, 5 themes, 15 SolidJS components, 16/16 tests pass, ~90 KB JS gzipped.

## [1.0.0] — 2026-06-17

Foundation: 9 pages, CF Worker 16 endpoints, Biome, Forgejo CI/CD.

## [0.9.0] — 2026-06-17

R&D cycle complete (Phases -1 through 9). 5 yellow papers, 4 blue papers, 22 ADRs, STRIDE threat model, Core Web Vitals targets, adversarial loop, CI/CD configs. 64 R&D artifacts total (28 specs, 10 reports, 22 ADRs, 4 docs).

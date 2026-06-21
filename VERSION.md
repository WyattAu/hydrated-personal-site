# Version

## Current

- **Phase:** 5 (Commit & Push; CI Debug Loop)
- **Version:** 3.0.0
- **Status:** In Progress — full audit pass complete, ready for commit and remote CI verification
- **Last updated:** 2026-06-21

## v3.0.0 — Audit and Refactor Pass

Goals: zero lint errors, zero TypeScript errors, zero Rust warnings, zero emojis in source/docs, deterministic pre-commit gate, CI/CD pipeline repaired, dependency conflicts resolved, documentation rewritten to match reality.

### Deltas from v2.1.0

- **Lint:** 102 errors / 185 warnings to **0 / 0**. Biome config tightened with `.astro` and test overrides.
- **TypeScript:** 28 site errors and 65 worker errors to **0 / 0**. Root cause: missing Astro component imports, broken `createContext` import, conflicting DOM vs workers-types globals, kebab-case CSS props.
- **Rust:** 109 warnings (mostly deprecated web-sys setters, plus dead-code) to **0**. Crate-level `#![allow(deprecated)]` documented with rationale.
- **Build:** Astro site previously failed at prerender (`BaseLayout is not defined`, `SEO is not defined`, `renderedDocs is not defined`). All fixed; build now produces all 9 pages + RSS + sitemap.
- **Pre-commit hook:** Version-controlled at `scripts/pre-commit`, installed via `bun run prepare`. Gates on Biome, TypeScript, Vitest, and Cargo (Rust-only).
- **Dependency conflicts resolved:** Astro 5/6, Vitest 1/4, Playwright 1.40/1.61, Cloudflare adapter 12/13 all consolidated. App deps moved into `apps/site/package.json`; root now holds only workspace-wide dev tools. `@astrojs/sitemap` and `@astrojs/rss` now declared.
- **Worker types:** `lib: ["ES2022"]` excludes DOM globals that conflicted with `@cloudflare/workers-types`. `@cloudflare/workers-types` declared in `worker/package.json`.
- **CI/CD workflows:** All three (`ci.yml`, `deploy.yml`, `uptime.yml`) rewritten.
  - Removed GitHub Pages OIDC permissions (we deploy to Cloudflare).
  - Replaced non-existent `turbo build --filter=worker` step with `tsc --noEmit` verification.
  - Wired WASM dist into Pages deploy via build artifact.
  - Replaced `npx` with `bunx`; removed `bun add -d` (which mutated lockfile in CI).
  - Switched npm-audit to `bun audit`.
  - Fixed uptime weather probe (`lng` -> `lon`).
  - Pinned Bun to 1.3.11 to match local.
- **Emoji audit:** 6 source occurrences and 56 docs occurrences purged. GUI traversal E2E enforces no-emoji invariant on every route.
- **GUI traversal:** Enhanced to capture per-viewport screenshots (4 viewports x 9 routes), added Spatial Materialism z-index token chain assertions, shadow light-source assertions, cubic-bezier easing assertions, `prefers-reduced-motion` respect check.
- **Documentation:** README rewritten to reflect actual widget count (16, not 13), endpoint count (24, not 20), test count (195 unit, not 89), correct page list.
- **Test pool:** Vitest switched to `forks` pool to avoid esbuild service-terminated panics seen with the default `threads` pool on Node.js >= 23 under load.

### Verified state at release

```
Biome check . ............... 0 errors, 0 warnings
tsc --noEmit (apps/site) .... 0 errors
tsc --noEmit (worker) ....... 0 errors
cargo check (wasm32) ........ 0 warnings
vitest run .................. 195 / 195 passing
astro build ................. complete (9 pages + rss + sitemap)
```

## History

| Version   | Date       | Summary                                                                                |
| --------- | ---------- | -------------------------------------------------------------------------------------- |
| 0.0.0-0.9 | 2026-06-17 | R&D lifecycle (Phases -1 through 9). Yellow/blue papers, ADRs, threat model, CI config. |
| 1.0.0     | 2026-06-17 | Foundation: 9 pages, CF Worker (16 endpoints), Biome, Forgejo CI/CD.                    |
| 1.1.0-1.5 | 2026-06-17 | Implementation: SolidJS components, themes, WASM widgets, tests.                        |
| 1.6.0     | 2026-06-17 | Launch ready: 3 WASM widgets, 16/16 tests pass.                                         |
| 2.0.0     | 2026-06-17 | Full content + 13 WASM widgets, 74 unit + ~73 E2E tests, build ~7.5 s.                  |
| 2.1.0     | 2026-06-18 | Audit pass: +15 property tests, lint cleanup, pre-commit hook, CI/CD repair.           |
| 3.0.0     | 2026-06-21 | Full audit and refactor: zero lint/type/rust warnings, dependency cleanup, doc rewrite, CI fixes, emoji purge, GUI traversal hardening. |

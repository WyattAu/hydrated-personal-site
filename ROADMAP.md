# Roadmap

This document outlines the technical path from the current state (v3.0.0, post-audit) toward full production hardening, scaling, and future feature integration. Each phase has explicit scope, success criteria, and dependencies.

**Current state:** v3.0.0 — full audit complete. 195/195 unit tests pass, 0 Biome diagnostics, 0 TypeScript errors, 0 Rust warnings, build green, live site verified healthy, CI/CD workflows valid (Forgejo runner offline; infrastructure-side).

**Last updated:** 2026-06-21

---

## Phase A — CI Runner Restoration (COMPLETE)

- [x] Registered a dedicated forgejo-runner Docker container for the repo (hydrated-runner-3, labels: ubuntu-latest, ubuntu-22.04, ubuntu-24.04).
- [x] Smoke workflow (`.forgejo/workflows/smoke.yml`) passes consistently (3-5s).
- [x] Uptime workflow passes consistently (32-52s) with redirect-following curl probes.
- [x] CI typecheck fixed: invoke `node node_modules/typescript/lib/tsc.js` and `node node_modules/astro/astro.js sync` directly instead of bunx/npx to avoid TypeScript version mismatch (CI's bunx resolves TS 6.x; workspace pins 5.9.3).
- [x] CI pipeline confirmed reaching deep stages: format + typecheck + unit tests + WASM build + site build all pass (957s run). E2E/lighthouse remain as secondary quality gates.
- [ ] Deploy jobs need Cloudflare secrets (CF_API_TOKEN, CF_ACCOUNT_ID) configured by user in repo settings.

---

## Phase B — Stabilisation (Weeks 1-2)

### B.1 Domain canonicalisation (COMPLETE)

- [x] Canonical domain is `wyattau.com` (`wyatt.au` does not resolve). Updated `astro.config.mjs`, `BaseLayout.astro`, and Plausible `data-domain` to `https://wyattau.com`.

### B.2 Test coverage uplift (PARTIAL)

Current: 195 unit tests across 8 files, 80% coverage thresholds. Progress:

- [x] Reconciled type drift between `api.ts` and `types.ts`. All types now import from `types.ts`.
- [x] Wired `schemas.ts` (valibot) into the Astro SSR API response path via `validateOrPass()`. Applied to 9 endpoints. Schemas are no longer test-only.
- [ ] SolidJS component tests. No `.test.tsx` files exist. (TD-006)
- [ ] Wire `api.ts` into production components so the test-backed fetch wrappers have production coverage. (TD-001)

### B.3 Crypto-ticker resilience (COMPLETE)

- [x] Added CoinGecko `/coins/markets` as fallback in both Worker (`handleCryptoTicker`) and Astro SSR API when Binance geo-blocks the Cloudflare egress IP. Response normalised to Binance-like shape so clients need no separate code path. Stale cache served if both upstreams fail.

---

## Phase C — Performance (Weeks 3-4)

### C.1 Bundle audit

- [ ] Run `bunx astro build` and capture per-route JS sizes. Current biggest chunks: `leaflet-src.js` (150 KB raw / 44 KB gzip on `/world`), `EtfApp.js` (37 KB / 11 KB gzip on `/etf`), `index.js` (38 KB / 11 KB gzip on `/`).
- [ ] Lazy-load Leaflet via dynamic `import('leaflet')` (already done in `WorldMap.tsx`) and verify it is excluded from the initial bundle of `/world` via a network-waterfall check in the GUI traversal E2E.
- [ ] Audit SolidJS islands: every `client:load` directive should be `client:visible` or `client:idle` unless it is above the fold.

### C.2 WASM payload

Current: 256 KB total in `apps/site/public/wasm/` (one shared `hydrated_widgets_bg.wasm`). Per-widget code-splitting would require restructuring `lib.rs` into per-widget crates or using `wasm-split`. Trade-off: 16 small fetches vs 1 large. Keep the monolith unless Lighthouse flags it.

- [ ] Add a Lighthouse budget (`lighthouserc.json` `resourceCounts` and `resourceSizes`) that fails CI if WASM exceeds 300 KB.
- [ ] Verify the WASM is served with `content-encoding: br` or `gz` from Cloudflare.

### C.3 Image strategy

- [ ] `apps/site/public/images/` ships both AVIF and WebP for each image but pages reference them via static `<img>`. Convert to `<picture>` with `source` elements so the browser picks AVIF when supported. Astro's `<Image>` component from `astro:assets` would handle this automatically — migrate.

### C.4 Cloudflare cache (COMPLETE)

- [x] `apps/site/public/_headers` sets `Cache-Control: public, max-age=31536000, immutable` on `/wasm/*` and `/_astro/*` for optimal edge caching.
- [ ] Configure Cloudflare Cache Reserve for extended edge TTL (dashboard-level, not code).

---

## Phase D — Feature Expansion (Weeks 5-8)

### D.1 Documentation site

The `/docs` page currently renders three stub markdown files (`api-reference`, `architecture`, `getting-started`). Either:

- [ ] Migrate to Astro Starlight for a proper docs site at `/docs/` with sidebar, search, versioning. This addresses the user's preference for `solidJS+astro+starlight`.
- [ ] Or remove `/docs` entirely and link to WyattsNotes external site.

### D.2 Landing page

The current landing page is hand-rolled. If a separate marketing landing page is desired:

- [ ] Stand up an Astro + Starlight (or Astro + SolidJS) landing at the apex domain.
- [ ] Move the personal-site content to a sub-path or sub-domain.

### D.3 Guestbook hardening

- [ ] Wire Cloudflare KV for the guestbook (currently returns hardcoded sample entries from the same-origin API). The standalone Worker has the KV plumbing; the Astro SSR catch-all does not.
- [ ] Add markdown rendering for guestbook messages (with sanitisation).
- [ ] Add an admin moderation endpoint behind `ADMIN_TOKEN`.

### D.4 World monitor history

- [ ] Persist metric snapshots to Cloudflare D1 or KV so the world page can show historical trends.
- [ ] Add WebSocket or SSE for real-time price updates (currently polls every 10-15s).

### D.5 ETF intelligence

- [ ] The ETF database is a 97 KB JSON blob loaded client-side. Move to a build-time data fetch and prerender comparison/correlation pages for popular ETF pairs.

---

## Phase E — Security Hardening (Weeks 9-10)

### E.1 CSP tightening (COMPLETE)

- [x] Added `apps/site/public/_headers` with full Content-Security-Policy on all routes. `script-src 'self'` (no unsafe-inline for JS). Style-src retains unsafe-inline (Astro inlines component-scoped styles at build time). Added `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. HSTS preload. X-Frame-Options DENY. Referrer-Policy. Permissions-Policy disabling all dangerous features.
- [ ] Replace `'unsafe-inline'` for styles with nonce-based CSP (requires Astro middleware per-request nonces; deferred to a future sprint).

### E.2 Input validation (PARTIAL)

- [x] Applied valibot schemas to 9 API endpoints via `validateOrPass()`. Non-blocking: logs warnings on schema mismatch, passes raw data through.
- [ ] Add body-size limits to the guestbook POST (currently checks `name.length > 50` and `message.length > 500` but does not reject the request early on raw body size).

### E.3 Dependency hygiene

- [ ] Replace `curl | sh` for `wasm-pack` install in CI with a pinned download of the binary tarball.
- [ ] Pin all GitHub/Forgejo Actions to specific minor versions (currently SHAs; the SHAs need rotation policy).
- [ ] Add Dependabot/Renovate equivalent for Forgejo (the user runs a self-hosted instance; may need a scheduled workflow that runs `bunx npm-check-updates`).

### E.4 Authentication

- [ ] Add an admin route (`/admin`) protected by Cloudflare Access for guestbook moderation and metrics inspection.

---

## Phase F — Observability (Weeks 11-12)

### F.1 Structured logging

- [ ] The worker has a `log()` function that emits JSON. Wire it to Cloudflare Logpush for retention beyond the Workers runtime log buffer.
- [ ] Add a request-id header (`x-request-id`) propagated from edge to upstream.

### F.2 Error tracking

- [ ] Integrate Sentry (or Cloudflare Workers Analytics) for client-side errors. The `ErrorBoundary.tsx` component logs to `console.error` in dev; production needs an external sink.

### F.3 Performance monitoring

- [ ] Configure Cloudflare Web Analytics (privacy-preserving, no cookies) on the production domain. The `BaseLayout` already loads Plausible; either keep Plausible or migrate to Cloudflare WA.
- [ ] Add Real User Monitoring (RUM) for Core Web Vitals. Lighthouse CI runs synthetically; RUM captures the long tail.

### F.4 Alerting

- [ ] Wire the `uptime.yml` workflow failures to a notification channel (webhook to email/Discord/Slack).
- [ ] Add a `scripts/health-check.sh` cron on a non-Forgejo host (e.g. a separate VPS or UptimeRobot) so the alert fires even when Forgejo Actions is down.

---

## Phase G — Scale and Polish (Ongoing)

### G.1 Internationalisation

- [ ] The dead `i18n.ts` (removed in v3.0.0) had EN/ZH/JA dictionaries. If i18n is actually a goal, re-introduce using `@solid-primitives/i18n` (translator pattern, not the removed createContext pattern) and wire into the dead-but-to-be-resurrected `LanguageSwitcher.tsx`.
- [ ] Add RTL support if Arabic/Farsi is planned.

### G.2 PWA

- [ ] The service worker at `apps/site/public/sw.js` exists but is minimal. Add a proper cache strategy (NetworkFirst for HTML, CacheFirst for `_astro/*` and WASM) using Workbox or a hand-rolled SW.
- [ ] Add a web app manifest with `display: standalone` and an install prompt.

### G.3 API versioning

- [ ] The standalone worker supports `/api/v1/*` routing but the Astro SSR API does not. Decide whether versioning is needed (if the API is only consumed by this site, probably not).

### G.4 Mutation testing

- [ ] Add `cargo-mutants` for the Rust widgets and `stryker` (or equivalent) for the TS codebase. Mutation testing catches tests that pass for the wrong reasons.

---

## Tech Debt Register

Tracked items that should be addressed but are not blocking:

| ID | Item | Impact | Effort |
|----|------|--------|--------|
| TD-001 | `apps/site/src/lib/api.ts` is test-only; components bypass it | Type drift, no central cache | 4h |
| TD-002 | `apps/site/src/lib/schemas.ts` is test-only; no runtime validation | Unvalidated upstream responses | 4h |
| TD-003 | `CommandPalette.tsx` uses `role='dialog'` instead of native `<dialog>` | A11y, but requires showModal refactor | 6h |
| TD-004 | Worker and Astro SSR API have feature drift (worker has CSP/versioning/metrics; SSR does not) | Security and observability gap | 16h |
| TD-005 | JSON-LD `url` field uses `wyatt.au`; deploy targets `wyattau.com` | SEO canonical confusion | 1h |
| TD-006 | No SolidJS component tests (`.test.tsx`) | Refactor risk | 16h |
| TD-007 | Forgejo Actions SHAs need rotation policy | Supply-chain risk | 2h |
| TD-008 | Lighthouse CI thresholds are warn-level, not fail-level | Quality drift | 1h |
| TD-009 | WASM checked into git (`apps/site/public/wasm/`) | Repo bloat, drift risk | 2h (CI rebuilds anyway) |
| TD-010 | `design.md` ASCII art uses box-drawing chars; not emoji but worth verifying render across markdown viewers | Cosmetic | 1h |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Forgejo runner stays offline | High | Blocks all CI | Phase A is the first priority; have a fallback plan to migrate to GitHub Actions or self-hosted Gitea Actions if the CachyOS runner cannot be stabilised. |
| Cloudflare rate-limits the worker on traffic spikes | Medium | API unavailability | Implement KV-backed cache (Phase D.4) so stale data is served when upstream fails. |
| Binance geo-blocks more Cloudflare egress | Medium | Crypto-ticker 500s | Phase B.3: add CoinGecko fallback. |
| Astro 6 release removes/breaks Cloudflare adapter | Low | Build failure | Pin to `astro@^5.18` (already done). Test 6.x in a branch before upgrading. |
| Cloudflare Pages deploy quota exceeded | Low | Deploy failure | Monitor Pages usage; consider Workers Sites as alternative. |

---

## Milestones

| Milestone | Target | Phase |
|-----------|--------|-------|
| CI green on push to main | Week 1 | A |
| Canonical domain decided and configured | Week 2 | B.1 |
| Component test coverage >70% | Week 4 | B.2 |
| Lighthouse >0.9 across all routes (CI fails on regression) | Week 6 | C.1, C.2 |
| Starlight docs live at `/docs/` | Week 8 | D.1 |
| Guestbook backed by Cloudflare KV | Week 9 | D.3 |
| CSP nonce-based, no `unsafe-inline` | Week 10 | E.1 |
| Sentry + RUM integrated | Week 12 | F.2, F.3 |
| PWA installable | Week 16 | G.2 |

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Stick with Astro 5.18, not 6.x | 5.18 is the current tested and building version. Astro 6 upgrade deferred to a deliberate migration sprint. | 2026-06-21 |
| Keep the standalone Worker as fallback | The same-origin Astro SSR API is primary; the worker at `hydrated-worker.wyatt-au.workers.dev` is referenced by `llm-data.ts` as a fallback. Removing it would degrade resilience. | 2026-06-21 |
| Delete Pages Functions, keep Astro SSR API | Cloudflare Pages Functions were shadowed by the Astro-generated `_worker.js`. Two API surfaces in one Pages deployment was a footgun. | 2026-06-21 |
| Delete i18n.ts + LanguageSwitcher.tsx | Both were dead code with no live call sites. Re-introducing i18n is a Phase G task with proper `@solid-primitives/i18n` usage. | 2026-06-21 |
| Pre-commit hook via plain shell script, not Husky | Avoids a Node dependency for hook management; the `prepare` package script handles installation on `bun install`. | 2026-06-21 |
| Vitest forks pool, not threads | The default threads pool panics with esbuild service-terminated under high parallelism on Node.js >= 23. Forks pool is more robust at a small wall-clock cost. | 2026-06-21 |

---

## Review Cadence

This roadmap should be reviewed:

- At the start of each phase (confirm scope, blockers, dependencies).
- On any change to the canonical stack (Astro major version, Cloudflare adapter, Worker runtime).
- Quarterly for the long-term items in Phase G.

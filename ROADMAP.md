# ROADMAP.md -- Hydrated Personal Site

Technical roadmap from current state (v2.1.0) to full production.

---

## Current State (v2.1.0)

| Metric | Value |
|--------|-------|
| Pages | 9 (including 404) |
| SolidJS Components | 18 |
| WASM Widgets | 13 |
| API Endpoints | 20 |
| Unit Tests | 74 |
| Property-Based Tests | 15 |
| E2E Test Specs | 9 |
| CI/CD Pipelines | 3 (CI, Deploy, Uptime) |
| Themes | 5 |
| Deployment Target | Cloudflare Pages + Workers |

---

## Phase 1: Stabilization (Week 1-2)

### 1.1 Forgejo Actions Pipeline Validation
- [ ] Resolve Forgejo server resource exhaustion (pre-receive hook crashes)
- [ ] Push outstanding commits (refactor commit pending)
- [ ] Verify CI pipeline triggers on push/PR
- [ ] Validate E2E tests execute in CI environment
- [ ] Confirm Lighthouse CI integration with lighthouserc.json
- [ ] Test deploy pipeline end-to-end (CF Pages + Workers)

### 1.2 Test Coverage Expansion
- [ ] Add unit tests for SolidJS components (WorldMap, PriceChart, ScatterPlots)
- [ ] Add unit tests for WasmEmbed.astro widget loader
- [ ] Add integration tests for GuestbookForm/GuestbookList (mocked KV)
- [ ] Add integration tests for SearchBar with database filtering
- [ ] Achieve >90% branch coverage on critical paths (currently ~80%)
- [ ] Add property-based tests for worker rate limiter edge cases

### 1.3 Type Safety
- [ ] Resolve remaining TypeScript strict mode issues
- [ ] Add explicit return types to all exported functions
- [ ] Eliminate remaining `any` types (currently in SolidJS component props)
- [ ] Add Zod or Valibot validation schemas for API request/response types

---

## Phase 2: Performance (Week 3-4)

### 2.1 Frontend Performance
- [ ] Implement route-based code splitting for Astro pages
- [ ] Add `loading="lazy"` to non-critical images
- [ ] Optimize Leaflet map initialization (defer until viewport intersection)
- [ ] Implement virtual scrolling for large lists (DataPanels, ETF database)
- [ ] Add service worker for offline caching of static assets
- [ ] Measure and optimize Core Web Vitals (LCP, FID, CLS)

### 2.2 Worker Performance
- [ ] Replace in-memory cache with Cloudflare KV for cross-request persistence
- [ ] Implement request deduplication for concurrent identical upstream calls
- [ ] Add circuit breaker pattern for unreliable upstream APIs
- [ ] Optimize HackerNews handler to fetch top stories in parallel batches
- [ ] Implement stale-while-revalidate caching strategy

### 2.3 WASM Performance
- [ ] Profile WASM widget initialization time
- [ ] Implement shared WebAssembly.Module caching across widgets
- [ ] Add Web Worker offloading for compute-heavy widgets (Fourier, Climate)
- [ ] Optimize WASM binary size (currently ~140KB total, target <100KB)

---

## Phase 3: Feature Expansion (Week 5-8)

### 3.1 Docs Page Enhancement
- [ ] Integrate WyattsNotes content via MDX or Astro content collections
- [ ] Add search functionality to docs page
- [ ] Implement table of contents navigation
- [ ] Add code syntax highlighting for technical documentation

### 3.2 Guestbook Improvements
- [ ] Enable Cloudflare KV binding for persistent guestbook storage
- [ ] Add markdown support for guestbook messages
- [ ] Implement pagination for guestbook entries
- [ ] Add admin dashboard for entry moderation (token-based)

### 3.3 World Monitor Enhancements
- [ ] Add historical data persistence (localStorage or KV) for metric trends
- [ ] Implement WebSocket connections for real-time price updates
- [ ] Add configurable dashboard layouts (drag-and-drop grid)
- [ ] Integrate additional data sources (social sentiment, on-chain analytics)

### 3.4 ETF Intelligence Enhancements
- [ ] Add portfolio optimization calculator (mean-variance, risk parity)
- [ ] Implement backtesting engine integration with WASM backtest widget
- [ ] Add real-time ETF price tracking via Yahoo Finance API
- [ ] Implement ETF comparison export (PDF/CSV report generation)

### 3.5 New WASM Widgets
- [ ] FFT-based audio visualizer (Web Audio API + WASM)
- [ ] N-body gravitational simulation
- [ ] Procedural terrain generator (Perlin noise)
- [ ] Mini SQL query engine (SQLite WASM)

---

## Phase 4: Security Hardening (Week 9-10)

### 4.1 Content Security Policy
- [ ] Audit and tighten CSP headers (remove `unsafe-inline` for scripts)
- [ ] Implement nonce-based script loading for inline scripts
- [ ] Add report-uri directive for CSP violation monitoring

### 4.2 API Security
- [ ] Implement API key authentication for sensitive endpoints
- [ ] Add request body size limits (currently unlimited for POST)
- [ ] Implement CORS headers on worker responses
- [ ] Add input sanitization for guestbook messages (XSS prevention)
- [ ] Rate limit all endpoints (currently only guestbook is rate-limited)

### 4.3 Dependency Security
- [ ] Enable automated dependency scanning (Renovate/Dependabot equivalent)
- [ ] Pin all GitHub Actions to SHA (currently using version tags)
- [ ] Audit Rust crate dependencies for known vulnerabilities
- [ ] Generate and verify SBOM for WASM components

---

## Phase 5: Observability (Week 11-12)

### 5.1 Monitoring
- [ ] Add structured logging to Cloudflare Worker (JSON format)
- [ ] Implement error tracking (Sentry or similar)
- [ ] Add performance monitoring for API response times
- [ ] Create Grafana dashboard for worker metrics (request count, latency, errors)

### 5.2 Alerting
- [ ] Configure uptime monitoring alerts (beyond current HTTP probes)
- [ ] Add API health check degradation alerts
- [ ] Implement error rate threshold alerts
- [ ] Add certificate expiry monitoring

### 5.3 Analytics
- [ ] Implement privacy-respecting analytics (Plausible or Umami)
- [ ] Add page view tracking for route popularity
- [ ] Track WASM widget usage and performance metrics
- [ ] Monitor Core Web Vitals over time

---

## Phase 6: Scale & Polish (Ongoing)

### 6.1 Internationalization
- [ ] Add i18n framework (Astro i18n integration)
- [ ] Translate pages to at least EN, ZH, JA
- [ ] Implement RTL support for AR/FA languages
- [ ] Add language switcher to navigation

### 6.2 PWA Capabilities
- [ ] Generate Web App Manifest with proper icons
- [ ] Implement service worker with Workbox
- [ ] Add offline support for critical pages
- [ ] Implement push notifications for guestbook replies

### 6.3 Advanced Features
- [ ] Implement server-side rendering for SEO-critical pages
- [ ] Add API versioning (v1/v2) for backward compatibility
- [ ] Implement webhook system for real-time data updates
- [ ] Add collaborative editing for guestbook (OT/CRDT)

### 6.4 Code Quality
- [ ] Achieve 100% branch coverage on critical paths
- [ ] Implement mutation testing (Stryker or cargo-mutants for Rust)
- [ ] Add property-based tests for all data transformation functions
- [ ] Implement contract testing between frontend and worker

---

## Milestones

| Milestone | Target | Dependencies |
|-----------|--------|-------------|
| Pipeline Green | Week 2 | Forgejo server stability |
| 90% Test Coverage | Week 4 | Phase 1.2 complete |
| Core Web Vitals Pass | Week 4 | Phase 2.1 complete |
| Docs Integration | Week 6 | Phase 3.1 complete |
| Guestbook Persistent | Week 6 | Cloudflare KV configured |
| Security Audit Pass | Week 10 | Phase 4 complete |
| Monitoring Active | Week 12 | Phase 5 complete |
| i18n Launch | Week 16 | Phase 6.1 complete |
| PWA Launch | Week 18 | Phase 6.2 complete |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Forgejo server instability | High | High | Implement retry logic, monitor server health |
| Cloudflare KV cold start | Medium | Medium | Use in-memory cache as fallback, warm KV on deploy |
| Upstream API rate limiting | High | Medium | Implement circuit breakers, add fallback data sources |
| WASM browser compatibility | Low | Medium | Progressive enhancement, fallback to JS implementations |
| CSP policy conflicts | Medium | High | Test CSP in staging before production deployment |

---

## Technical Debt Inventory

| Item | Severity | Effort | Phase |
|------|----------|--------|-------|
| Duplicate `formatPrice` in PriceChart/TickerBar | Low | 1h | Phase 7 (done) |
| LLM benchmarks fetched in both DataPanels and ScatterPlots | Low | 2h | Phase 2 |
| In-memory cache loses state on worker restart | Medium | 4h | Phase 2.2 |
| No error boundaries in SolidJS components | Medium | 4h | Phase 1.2 |
| CSP uses `unsafe-inline` for scripts | High | 8h | Phase 4.1 |
| No API authentication on sensitive endpoints | High | 4h | Phase 4.2 |

# Performance Requirements

## 1. Core Web Vitals Targets

| Metric | Target | Measurement | Fail Threshold |
|--------|--------|-------------|----------------|
| LCP | <1.5s (p75) | Largest Contentful Paint | >2.5s |
| FID | <50ms (p75) | First Input Delay | >100ms |
| CLS | <0.01 (p75) | Cumulative Layout Shift | >0.05 |
| INP | <200ms (p75) | Interaction to Next Paint | >500ms |
| TTFB | <200ms (p75) | Time to First Byte | >800ms |
| FCP | <1.0s (p75) | First Contentful Paint | >1.8s |
| TTI | <1.5s (p75) | Time to Interactive | >3.0s |

**Measurement context:** 4G connection (30 Mbps, 50ms RTT), mobile device (Moto G Power or equivalent), tested on Cloudflare Pages edge (closest PoP).

## 2. Bundle Size Budgets

### 2.1 Initial Page Load (Home `/`)

| Resource | Budget | Gzipped | Notes |
|----------|--------|---------|-------|
| HTML | <5KB | <2KB | Astro pre-rendered static |
| Critical CSS (inline) | <8KB | <3KB | Above-the-fold only |
| Full CSS | <80KB | <25KB | Tailwind 4 purged, all themes |
| SolidJS runtime | <4KB | <2KB | islands hydration |
| Alpine.js (if used) | <16KB | <5KB | lightweight interactivity |
| GSAP | <28KB | <9KB | animation runtime |
| JS total (initial) | <50KB | <18KB | excludes lazy-loaded libs |
| Fonts (Inter + JetBrains Mono) | <80KB | — | woff2, self-hosted |
| **Total first load** | **<400KB** | **<120KB** | all resources combined |

### 2.2 Per-Page Budgets

| Page | Initial JS | Lazy JS | WASM | Total |
|------|-----------|---------|------|-------|
| `/` (Home) | <30KB | <50KB (GSAP, Rough.js) | 0KB | <400KB |
| `/world` | <20KB | <120KB (uPlot, Leaflet, D3) | 0KB | <300KB |
| `/etf` | <20KB | <50KB (uPlot) | 0KB | <250KB |
| `/projects` | <20KB | 0KB | 0KB | <150KB |
| `/dossier` | <15KB | <28KB (GSAP) | 0KB | <200KB |
| `/docs` | <15KB | 0KB | 0KB | <100KB |
| `/guestbook` | <15KB | 0KB | 0KB | <100KB |
| `/uses` | <10KB | 0KB | 0KB | <80KB |

### 2.3 WASM Widget Budgets

| Widget | Target Size (wasm-pack) | Gzipped | Load Trigger |
|--------|------------------------|---------|--------------|
| A1: Order Book | <100KB | <60KB | IntersectionObserver |
| A2: Correlation Network | <130KB | <80KB | IntersectionObserver |
| A3: Strategy Backtester | <140KB | <85KB | IntersectionObserver |
| A4: Market Treemap | <100KB | <60KB | IntersectionObserver |
| A5: BTC Health Dashboard | <110KB | <70KB | IntersectionObserver |
| B1: Fourier Transform | <75KB | <45KB | IntersectionObserver |
| B2: Climate Data Explorer | <120KB | <75KB | IntersectionObserver |
| B3: Cellular Automata | <65KB | <40KB | IntersectionObserver |
| B4: Physics Sandbox | <85KB | <55KB | IntersectionObserver |
| C1: Generative Art Studio | <95KB | <60KB | IntersectionObserver |
| C2: Color Blindness Simulator | <55KB | <35KB | IntersectionObserver |
| D1: Regex Playground | <45KB | <30KB | IntersectionObserver |
| D2: Network Topology Mapper | <75KB | <50KB | IntersectionObserver |

### 2.4 Third-Party Library Budgets

| Library | Size (gzipped) | Load Strategy | Pages Used |
|---------|---------------|---------------|------------|
| uPlot | 48KB | IntersectionObserver | World, ETF |
| D3.js | 230KB | IntersectionObserver | World (correlation) |
| Leaflet.js | 40KB | IntersectionObserver | World |
| Rough.js | 40KB | IntersectionObserver | Home, Projects |
| GSAP | 28KB | `<script defer>` | Home, Dossier |
| Motion One | 5KB | Import on demand | All (micro-interactions) |

## 3. API Response Time Targets

### 3.1 CF Worker Response Times (p75)

| Endpoint | Target | Cache TTL | Strategy |
|----------|--------|-----------|----------|
| `/api/health` | <10ms | None | Always fresh |
| `/api/crypto-ticker` | <50ms | 10s | Stale-while-revalidate |
| `/api/mempool` | <50ms | 1min | Stale-while-revalidate |
| `/api/stock-chart` | <100ms | 2min-2h | Range-dependent TTL |
| `/api/weather` | <80ms | 5min | Stale-while-revalidate |
| `/api/earthquakes` | <80ms | 5min | Stale-while-revalidate |
| `/api/coingecko-global` | <80ms | 5min | Stale-while-revalidate |
| `/api/fear-greed` | <80ms | 5min | Stale-while-revalidate |
| `/api/hacker-news` | <80ms | 5min | Stale-while-revalidate |
| `/api/kp-index` | <80ms | 10min | Stale-while-revalidate |
| `/api/binance-klines` | <80ms | 5min | Stale-while-revalidate |
| `/api/exchange-rates` | <100ms | 1h | Stale-while-revalidate |
| `/api/fred` | <100ms | 1h | Stale-while-revalidate |
| `/api/github-trending` | <120ms | 30min | Stale-while-revalidate |
| `/api/llm-benchmarks` | <120ms | 6h | Stale-while-revalidate |
| `/api/guestbook` | <50ms | None | KV read-through |

### 3.2 Upstream API Latency Budgets

| Provider | Timeout | Retry | Circuit Breaker |
|----------|---------|-------|-----------------|
| Yahoo Finance | 5s | 2 | 3 failures → 60s open |
| CoinGecko | 5s | 2 | 3 failures → 120s open |
| Binance | 3s | 1 | 5 failures → 30s open |
| USGS | 5s | 2 | 3 failures → 300s open |
| NOAA | 5s | 2 | 3 failures → 600s open |
| Open-Meteo | 3s | 2 | 3 failures → 120s open |
| HN Firebase | 5s | 1 | 3 failures → 120s open |
| GitHub API | 5s | 2 | 3 failures → 300s open |
| mempool.space | 3s | 1 | 5 failures → 60s open |
| blockchain.info | 5s | 1 | 3 failures → 120s open |

## 4. Cache TTLs by Data Type

| Data Category | TTL | Stale-While-Revalidate | Notes |
|---------------|-----|------------------------|-------|
| Real-time prices (crypto) | 10s | 30s | Binance WebSocket preferred |
| Real-time prices (stocks) | 2min | 5min | Yahoo Finance REST |
| Market data (fear/greed, Kp) | 5min | 15min | Slow-changing indicators |
| Network data (mempool) | 1min | 3min | BTC mempool fees |
| Weather | 5min | 15min | Open-Meteo |
| Geospatial (earthquakes) | 5min | 15min | USGS |
| Social (HN, GitHub trending) | 5min-30min | 2x TTL | HN 5min, GH 30min |
| Reference (LLM benchmarks) | 6h | 24h | Rarely changes |
| Financial (exchange rates, FRED) | 1h | 4h | Economic data |
| Static data (ETF database) | 24h | 7d | Bundled JSON |
| User content (guestbook) | None | None | KV read-through |

## 5. Build Time Targets

| Stage | Target | Notes |
|-------|--------|-------|
| `pnpm install` | <15s | Content-addressable store |
| WASM compilation (all 13) | <120s | wasm-pack, parallel |
| Tailwind CSS processing | <5s | Purge + compile |
| Astro SSG build | <30s | All 8 pages pre-rendered |
| Total build (cold) | <180s | No cache |
| Total build (warm) | <30s | Turborepo cache hit |
| CI pipeline (test + build + deploy) | <5min | GitHub Actions |

## 6. Comparison with Current Leptos Site

| Metric | Leptos 0.8 (Current) | Astro 5 + SolidJS (Target) | Improvement |
|--------|----------------------|---------------------------|-------------|
| Initial bundle | ~800KB (WASM + Leptos) | <400KB | -50% |
| First paint (4G) | ~3.5s | <1.5s | -57% |
| Lighthouse perf | 72 | 95+ | +32% |
| WASM load (all 13) | ~1.2MB eager | <800KB lazy | -33% (loaded) |
| CSS size | ~120KB | <80KB | -33% |
| HTML size | ~15KB (Leptos SSR) | <5KB (Astro SSG) | -67% |
| FCP | ~2.8s | <1.0s | -64% |
| TTI | ~4.0s | <1.5s | -63% |
| Build time | ~5min | <30s (warm) | -90% |
| API response (cached) | ~80ms | <50ms | -38% |
| CLS | ~0.05 | <0.01 | -80% |

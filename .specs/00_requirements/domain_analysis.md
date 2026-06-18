# Domain Analysis: Hydrated Personal Site

## 1. Domain Classification

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Primary Domain | Personal Portfolio | Career showcase, project gallery, contact |
| Secondary Domain | Intelligence Dashboard | Real-time world data, financial monitoring, LLM benchmarks |
| Tertiary Domain | WASM Technical Showcase | 13 Rust + web-sys widgets demonstrating compute capabilities |
| Architecture Pattern | Static Site + Client-Side Islands | Astro SSG with SolidJS hydration on interactive elements |
| Deployment Model | Edge-Deployed Static + Worker | Cloudflare Pages (static) + CF Workers (API proxy, KV) |

The site simultaneously serves three audiences: recruiters evaluating Wyatt, developers exploring technical depth, and the broader public accessing the world intelligence dashboard and ETF analysis tools.

---

## 2. Domain Characteristics

| Characteristic | Level | Evidence | Impact |
|----------------|-------|----------|--------|
| Safety-Criticality | None | Portfolio site; no user funds, health, or life-safety data | Low risk tolerance for errors; no regulatory compliance required |
| Real-Time | Moderate | `/world` page: 10s crypto updates, live earthquake markers, mempool fees | Requires polling architecture; stale-while-revalidate caching |
| Performance | High | Lighthouse 95+ target; FCP <1.5s; TTI <1.5s; <400KB first load | Drives lazy-loading, code-splitting, Astro SSG |
| Availability | Moderate | CF Pages (99.99% SLA); API proxies have graceful degradation | External API failures must not break the site |
| Security | Moderate | CSP headers, HSTS, rate limiting, bearer tokens for admin | Guestbook has user-submitted content; API keys in Worker secrets |
| Accessibility | High | WCAG 2.1 AA target; keyboard nav, ARIA, reduced-motion | Affects animation system, component design, content structure |
| SEO | High | JSON-LD, OG tags, sitemap, RSS, semantic HTML | Drives Astro SSG (pre-rendered HTML) |

---

## 3. Applicable Standards

### 3.1 ISO/IEC 12207 — Software Life Cycle Processes
| Process | Application |
|---------|-------------|
| Stakeholder Needs Definition | `requirements.md:9-14` stakeholder table |
| System Requirement Analysis | `requirements.md:27-207` functional/non-functional requirements |
| Software Architecture Design | `architecture.md:1-416` full system architecture |
| Software Integration | Monorepo (Turborepo) with Astro + SolidJS + WASM + CF Worker |
| Software Verification | ADR-011: Vitest + Playwright + axe-core + Lighthouse CI |

### 3.2 IEEE 1016 — Software Design Description
| Design View | Documentation |
|-------------|---------------|
| Context | `architecture.md:1-60` system overview, component boundaries |
| Composition | `architecture.md:197-325` file structure, package layout |
| Logical | `architecture.md:63-73` component ownership boundaries |
| Interface | `architecture.md:92-100` communication patterns (CustomEvent bridge) |
| Performance | `requirements.md:124-134` timing, bundle, cache targets |
| Physical | `architecture.md:329-362` CF Pages + Worker deployment |

### 3.3 WCAG 2.1 — Web Content Accessibility Guidelines
| Principle | Implementation |
|-----------|----------------|
| Perceivable | Semantic HTML, ARIA labels, `prefers-reduced-motion`, alt text |
| Operable | Keyboard navigation, skip-to-content, focus management for modals |
| Understandable | Consistent navigation, clear link text, form labels |
| Robust | Valid HTML, no ARIA misuse, test with axe-core |

### 3.4 NIST SP 800-53 — Security and Privacy Controls
| Control Family | Application |
|----------------|-------------|
| Access Control (AC) | Bearer token for guestbook admin; CORS same-origin |
| Audit & Accountability (AU) | RUM via CF Worker, API error logging |
| Configuration Management (CM) | CI secrets for API keys, CF tokens |
| System & Communications Protection (SC) | CSP headers, HSTS, X-Frame-Options DENY |

### 3.5 OWASP Top 10
| Risk | Mitigation |
|------|------------|
| A01: Broken Access Control | Rate limiting (5 posts/IP/10min), bearer token admin |
| A02: Cryptographic Failures | HSTS, secure cookie flags (if any) |
| A03: Injection | Input validation on guestbook, no raw SQL |
| A04: Insecure Design | API keys in CF Worker secrets, not client-side |
| A05: Security Misconfiguration | CSP, X-Content-Type-Options, Permissions-Policy |
| A07: XSS | CSP `script-src`, no `eval()`, sanitize guestbook output |

---

## 4. Stakeholder Analysis

### 4.1 Wyatt Au (Owner/Developer)
| Need | Requirement | Priority |
|------|-------------|----------|
| Portfolio showcase | `/` hero, featured projects, expertise grid | Critical |
| Technical demonstration | 13 WASM widgets, real-time dashboards | Critical |
| Easy content updates | Astro content collections, git-based workflow | High |
| SEO/visibility | Structured data, OG tags, sitemap | High |
| Performance pride | Lighthouse 95+, <1.5s FCP | High |

### 4.2 Recruiters
| Need | Requirement | Priority |
|------|-------------|----------|
| Quick skill assessment | `/` hero + expertise grid | Critical |
| Project quality | `/projects` with language badges, descriptions | Critical |
| Contact ease | Contact form, email link | High |
| Mobile friendly | Responsive 320px-2560px | High |
| Fast load | <1.5s on 4G | High |

### 4.3 Developers
| Need | Requirement | Priority |
|------|-------------|----------|
| Technical depth | `/dossier` with employment, education | High |
| Source code access | GitHub/Forgejo links on projects | High |
| Open source contributions | Projects page with repo links | Medium |
| Blog/docs | `/docs` with RSS, search | Medium |

### 4.4 Search Engines
| Need | Requirement | Priority |
|------|-------------|----------|
| Crawlable content | Astro SSG pre-rendered HTML | Critical |
| Structured data | JSON-LD for WebSite + Person | Critical |
| Freshness signals | Sitemap, RSS feed | Medium |
| Performance | Core Web Vitals (LCP, CLS, INP) | High |

---

## 5. Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **SSG** | Astro | 5.x | Static HTML, file-based routing, content collections |
| **UI Framework** | SolidJS | 1.9 | Reactive islands (client-side interactivity) |
| **Charting** | uPlot | — | Financial charts (48KB gzipped, no watermark) |
| **Organic Graphics** | Rough.js | — | Hand-drawn borders, sketchy fills (40KB) |
| **Animations** | GSAP + Motion One | — | Cinematic sequences + lightweight transitions |
| **Data Visualization** | D3.js | — | Force-directed graphs, network topology |
| **Interactive Map** | Leaflet.js | — | World map, earthquake markers, country panels |
| **Compute** | Rust + wasm-pack | — | 13 WASM widgets (70-100KB each) |
| **Styling** | Tailwind CSS 4 | — | Utility-first CSS with custom properties |
| **UI Components** | Kobalte | — | Accessible headless UI for SolidJS |
| **Data Fetching** | TanStack Solid Query | — | Caching, dedup, background refetch |
| **Validation** | Valibot | — | Schema validation (1.4KB vs Zod's 14KB) |
| **Language** | TypeScript | 5.x | Type safety across all JS/TS code |
| **Package Manager** | Bun | 1.0+ | 10x faster installs, built-in bundler |
| **Monorepo** | Turborepo | — | Build caching, parallel execution |
| **Linting** | Biome | — | Rust-powered lint + format (replaces ESLint + Prettier) |
| **Testing** | Vitest + Playwright | — | Unit tests + E2E + visual regression |
| **Hosting** | Cloudflare Pages | — | Static hosting, edge CDN |
| **Compute** | Cloudflare Workers | — | API proxy, KV storage, security headers |
| **Storage** | Cloudflare KV | — | Guestbook, rate limiting, RUM |

---

## 6. External Data Sources Inventory

### 6.1 API Endpoints (via CF Worker Proxy)

| # | Endpoint | External Source | Data | Cache TTL | Fallback |
|---|----------|----------------|------|-----------|----------|
| 1 | `/api/health` | — | Health check | None | — |
| 2 | `/api/weather` | Open-Meteo | Weather forecast | 5min | Static default |
| 3 | `/api/stock-chart` | Yahoo Finance | Price history | 2min-2h | Cached data |
| 4 | `/api/crypto-ticker` | Binance | BTC/ETH/SOL prices | 10s | Last known |
| 5 | `/api/coingecko-global` | CoinGecko | Market cap, dominance | 5min | Static default |
| 6 | `/api/earthquakes` | USGS | M2.5+ earthquakes | 5min | Cached data |
| 7 | `/api/fear-greed` | Alternative.me | Crypto sentiment | 5min | Static default |
| 8 | `/api/kp-index` | NOAA | Geomagnetic activity | 10min | Static default |
| 9 | `/api/mempool` | mempool.space | BTC mempool fees | 1min | Last known |
| 10 | `/api/binance-klines` | Yahoo Finance | Price candles | 5min | Cached data |
| 11 | `/api/hacker-news` | HN Firebase | Top stories | 5min | Cached data |
| 12 | `/api/github-trending` | GitHub API | Trending repos | 30min | Cached data |
| 13 | `/api/llm-benchmarks` | Artificial Analysis | LLM comparisons | 6h | Static JSON |
| 14 | `/api/guestbook` | Cloudflare KV | User messages | No cache | — |
| 15 | `/api/exchange-rates` | ExchangeRate API | Currency rates | 1h | Static default |
| 16 | `/api/fred` | Federal Reserve | Economic indicators | 1h | Static default |

### 6.2 Direct Client-Side Data Sources

| Source | Used By | Protocol |
|--------|---------|----------|
| Binance WebSocket | A1: Order Book WASM | WebSocket |
| mempool.space | A5: BTC Health WASM | REST |
| blockchain.info | A5: BTC Health WASM | REST |
| NASA GISS | B2: Climate Data WASM | CSV download |
| World Bank API | Country Intelligence Panel | REST |
| REST Countries | Country Intelligence Panel | REST |

---

## 7. Design Philosophy

### 7.1 Cinematic Brutalism

> "This is not minimalism. This is not decoration. This is **structured drama**."

**Brutalist Foundation:**
- Zero border-radius (`border-radius: 0 !important`)
- Monospace typography for data and navigation
- Exposed grid structure — skeleton is visible
- High contrast: deep blacks against electric accents
- No soft shadows, no rounded corners, no friendly shapes

**Cinematic Layer:**
- Dramatic lighting: vignette overlays, god-ray gradients, film-grain texture
- Slow, deliberate animations (800ms ease-in-out, spring physics)
- Color grading: teal/orange split-tone on hero
- Parallax depth with 3-5 layers
- Letterboxing on ultra-wide screens (>1800px)

### 7.2 Spatial Materialism

Physical depth through:
- Layered shadows (suggest stacking, not decoration)
- Material textures: concrete grain, brushed metal, frosted glass
- Z-axis layering: cards float above background, modals float above cards
- Single light source: all shadows fall down-right
- Perspective transforms on scroll

### 7.3 Amoebic UI

Organic shapes that **break** the brutalist grid at interaction points:
- Amoeba-like hover states: elements morph and breathe
- Biological patterns: cellular noise backgrounds
- Flowing animations: particles follow cursor
- Asymmetric layouts within rigid grid constraints
- Natural easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for bouncy interactions

### 7.4 The Core Tension

```
RIGID GRID (brutalist) + ORGANIC FLOW (amoebic) + CINEMATIC DRAMA = Hydrated Personal Site
```

The visual language creates tension between:
1. **Brutalist rigidity** — Zero border-radius, monospace, exposed grid
2. **Amoebic organics** — Morphing shapes, flowing particles, cellular noise
3. **Cinematic depth** — Vignettes, parallax, film grain, letterboxing

---

## 8. Migration Context

| Aspect | Current (Leptos 0.8) | Target (Astro 5.x + SolidJS) |
|--------|----------------------|------------------------------|
| Framework | Leptos 0.8 (Rust WASM) | Astro 5.x + SolidJS 1.9 |
| Hydration | 1.1MB WASM on every page | Selective islands (~4KB JS) |
| DOM Ownership | WASM + vanilla JS fight | Clean boundaries (ADR-001) |
| Charts | Custom Canvas2D (broken) | uPlot (48KB, no watermark) |
| WASM | Leptos framework widgets | Standalone web-sys (70-100KB each) |
| Build | Fragile SSG with hash mismatches | Astro SSG (reliable) |
| DX | Rust debugging, manual HTML injection | TypeScript, instant HMR |

### Known Leptos Pain Points (from ADR-001)
- Price time scale labels missing
- ETF allocations/holdings broken
- World chart not loading
- SSG build fragile (WASM hash mismatches)
- Deployment requires manual HTML injection

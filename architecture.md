# Architecture Document: Hydrated Personal Site

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Astro 5.x (SSG / Routing / MDX)                       │    │
│  │  • Static HTML pre-rendered at build time               │    │
│  │  • File-based routing (8 pages)                         │    │
│  │  • Content collections for dynamic data                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SolidJS 1.9 (Client-side Interactivity)                │    │
│  │  • Hydrated on specific elements (islands)              │    │
│  │  • Reactive UI: search, filters, forms                  │    │
│  │  • No hydration overhead on static content              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  uPlot (Financial Visualizations)                       │    │
│  │  • Candlestick/line charts with crosshair              │    │
│  │  • Multi-series comparison                              │    │
│  │  • Timeframe selection                                  │    │
│  │  • No watermark, 48KB gzipped                          │    │
│  │  • Loaded on-demand via IntersectionObserver            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Leaflet.js (Interactive Map)                           │    │
│  │  • World map with earthquake markers                    │    │
│  │  • Country boundaries and capital markers               │    │
│  │  • Click-to-intelligence panel                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Rust WASM Showcase Widgets (13 widgets)                │    │
│  │  Finance:  Order Book, Correlation, Backtester,         │    │
│  │            Treemap, BTC Health                          │    │
│  │  Science:  Fourier, Climate, Physics                    │    │
│  │  Creative: Generative Art, Color Blindness              │    │
│  │  DevTools: Regex, Network Mapper, Cellular Automata    │    │
│  │  • Each widget owns its <div> subtree                   │    │
│  │  • Loaded on-demand via IntersectionObserver            │    │
│  │  • 70-100KB WASM per widget (plain web-sys, no framework)│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CF Worker (API Layer)                                  │    │
│  │  • 20+ API proxies with aggressive caching              │    │
│  │  • KV: guestbook, rate limiting, RUM                    │    │
│  │  • Security headers, CSP                                │    │
│  │  • Framework-agnostic (no Leptos/Solid dependency)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Boundaries

| Component | Owns | Does NOT Own |
|-----------|------|-------------|
| Astro | HTML structure, routing, SSG, content | Client-side interactivity |
| SolidJS | Interactive UI, forms, search, filters | Chart rendering, map rendering |
| uPlot | Financial chart rendering | UI controls, data fetching |
| Leaflet.js | Map rendering, markers, popups | Data fetching, panel content |
| Rust WASM | Math computation, Canvas2D rendering | DOM manipulation outside `<div>` |
| CF Worker | API proxying, KV storage, headers | Static asset serving (handled by CF Pages) |

### 1.3 WASM Widget Inventory (13 Widgets)

| Category | Widget | Data Source | WASM Size | Page |
|----------|--------|-------------|-----------|------|
| Finance | A1: Order Book | Binance WebSocket | ~80KB | World |
| Finance | A2: Correlation Network | Yahoo Finance | ~120KB | ETF |
| Finance | A3: Strategy Backtester | Yahoo Finance | ~130KB | ETF |
| Finance | A4: Market Treemap | CoinGecko | ~90KB | World |
| Finance | A5: BTC Health Dashboard | mempool.space + blockchain.info | ~100KB | World |
| Science | B1: Fourier Transform | None (pure computation) | ~70KB | Home |
| Science | B2: Climate Data Explorer | NASA GISS (free CSV) | ~110KB | Dossier |
| Science | B3: Cellular Automata | None (pure computation) | ~60KB | Dossier |
| Science | B4: Physics Sandbox | None (pure computation) | ~80KB | Dossier |
| Creative | C1: Generative Art Studio | None (pure computation) | ~90KB | Home |
| Creative | C2: Color Blindness Simulator | User image | ~50KB | Dossier |
| DevTools | D1: Regex Playground | None (Rust regex crate) | ~40KB | Home |
| DevTools | D2: Network Topology Mapper | User input | ~70KB | Projects |

### 1.3 Communication Patterns

```
SolidJS ←→ Lightweight Charts: CustomEvent on document
SolidJS ←→ Leaflet.js: Direct DOM manipulation
SolidJS ←→ CF Worker: fetch() API calls
SolidJS ←→ Rust WASM: CustomEvent on document
Vanilla JS ←→ CF Worker: fetch() API calls
```

---

## 2. Technology Stack

### 2.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Astro | 5.x | SSG, routing, content collections, islands |
| SolidJS | 1.9 | Client-side interactivity, reactive UI |
| TypeScript | 5.x | Type safety, IDE support |

### 2.2 Charting & Visualization

| Technology | Purpose | Size |
|------------|---------|------|
| uPlot | Financial charts (candlestick, line, area) | 48KB gzipped |
| Rough.js | Hand-drawn/sketchy graphics, organic borders | 40KB gzipped |
| GSAP | Professional animations, scroll triggers | 28KB gzipped |
| Motion One | Lightweight transitions (Solid-native) | 5KB gzipped |
| D3.js | Network graphs, force-directed layouts | 230KB gzipped |
| Leaflet.js | Interactive world map | ~40KB gzipped |
| Canvas2D | Scatter plots, allocation charts, WASM widgets | Native API |

### 2.3 Compute

| Technology | Purpose | Size |
|------------|---------|------|
| Rust + wasm-pack | Correlation, FFT, optimization | 70-100KB per widget |

### 2.4 Infrastructure

| Technology | Purpose |
|------------|---------|
| Cloudflare Pages | Static hosting, edge CDN |
| Cloudflare Workers | API proxying, KV storage |
| Cloudflare KV | Guestbook persistence, rate limiting |
| pnpm | Package management (content-addressable store) |
| Turborepo | Monorepo orchestration with build caching |

### 2.5 Development Tools

| Tool | Purpose | Why This Choice |
|------|---------|-----------------|
| Bun | Runtime + package manager | 10x faster installs, built-in bundler |
| Biome | Linting + formatting | Rust-powered, replaces ESLint + Prettier |
| Vitest | Unit testing | Vite-native, fast HMR-compatible tests |
| Playwright | E2E testing | Cross-browser, visual regression |
| Solid Query | Data fetching + caching | Declarative async state management |
| Kobalte | Headless UI components | Accessible, unstyled, Solid-native |
| Valibot | Schema validation | 10x smaller than Zod, tree-shakeable |
| wrangler | CF deployment | Official CF CLI |

---

## 3. Data Flow Architecture

### 3.1 Static Data Flow

```
Build Time:
  Astro SSG → Pre-render HTML → CF Pages (static assets)

Runtime:
  Browser ← CF Pages (static HTML, CSS, JS, WASM)
```

### 3.2 Dynamic Data Flow

```
Browser → SolidJS Component → fetch(/api/*) → CF Worker → External API
                                                            ↓
Browser ← SolidJS Component ← JSON response ← CF Worker ← Rate-limited cache
```

### 3.3 WASM Data Flow

```
Browser → IntersectionObserver → load WASM → Initialize widget
                                                    ↓
WASM Widget ← fetch(/api/*) ← CF Worker ← External API
     ↓
Canvas2D ← Render visualization
```

### 3.4 Chart Data Flow

```
Browser → SolidJS → Lightweight Charts API → Fetch data → Render chart
                ↓
        CustomEvent → SolidJS (update state)
```

---

## 4. File Structure

```
hydrated_personal_site/
├── apps/
│   └── site/                          # Main Astro application
│       ├── astro.config.mjs           # Astro configuration
│       ├── tailwind.config.ts         # Tailwind CSS config
│       ├── tsconfig.json              # TypeScript config
│       ├── package.json               # Dependencies
│       │
│       ├── src/
│       │   ├── layouts/
│       │   │   └── BaseLayout.astro   # HTML shell, fonts, critical CSS
│       │   │
│       │   ├── components/
│       │   │   ├── solid/             # SolidJS interactive components
│       │   │   │   ├── ThemeToggle.tsx
│       │   │   │   ├── CommandPalette.tsx
│       │   │   │   ├── TickerBar.tsx
│       │   │   │   ├── ContactForm.tsx
│       │   │   │   ├── GuestbookForm.tsx
│       │   │   │   ├── MetricCards.tsx
│       │   │   │   ├── SearchBar.tsx
│       │   │   │   ├── PortfolioComparison.tsx
│       │   │   │   ├── DocsList.tsx
│       │   │   │   └── ProjectsList.tsx
│       │   │   │
│       │   │   ├── wasm/              # WASM embed wrappers
│       │   │   │   ├── Fourier.astro
│       │   │   │   ├── Correlation.astro
│       │   │   │   └── Backtest.astro
│       │   │   │
│       │   │   ├── astro/             # Static Astro components
│       │   │   │   ├── Hero.astro
│       │   │   │   ├── Nav.astro
│       │   │   │   ├── Footer.astro
│       │   │   │   ├── ExpertiseGrid.astro
│       │   │   │   └── Timeline.astro
│       │   │   │
│       │   │   └── ui/                # Shared UI primitives
│       │   │       ├── Card.astro
│       │   │       ├── Badge.astro
│       │   │       └── Button.astro
│       │   │
│       │   ├── pages/                 # Astro file-based routing
│       │   │   ├── index.astro        # Home
│       │   │   ├── projects.astro
│       │   │   ├── dossier.astro
│       │   │   ├── world.astro
│       │   │   ├── docs.astro
│       │   │   ├── etf.astro
│       │   │   ├── guestbook.astro
│       │   │   ├── uses.astro
│       │   │   └── 404.astro
│       │   │
│       │   ├── content/               # Astro content collections
│       │   │   ├── projects/
│       │   │   ├── expertise/
│       │   │   └── timeline/
│       │   │
│       │   ├── styles/
│       │   │   ├── themes.css         # 6 theme variable sets
│       │   │   ├── base.css           # Reset, typography
│       │   │   ├── animations.css     # Keyframes
│       │   │   └── components.css     # Component styles
│       │   │
│       │   └── lib/
│       │       ├── api.ts             # CF Worker API client
│       │       ├── types.ts           # TypeScript types
│       │       └── utils.ts           # Shared utilities
│       │
│       └── public/
│           ├── fonts/                 # Inter + JetBrains Mono
│           ├── og-images/             # 9 OG images (1200x630)
│           ├── data/                  # Static JSON data
│           │   ├── world.json
│           │   ├── etf.json
│           │   └── llm-benchmarks.json
│           ├── wasm/                  # WASM build output (gitignored)
│           ├── sw.js                  # Service worker
│           ├── manifest.json
│           └── favicon.*
│
├── packages/
│   └── widgets/                       # Rust WASM showcase widgets (13 total)
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs                 # Exports all widget functions
│       │   │
│       │   ├── finance/               # Finance widgets
│       │   │   ├── mod.rs
│       │   │   ├── order_book.rs      # Binance order book depth
│       │   │   ├── correlation.rs     # Asset correlation network
│       │   │   ├── backtest.rs        # Strategy backtesting
│       │   │   ├── treemap.rs         # Crypto market treemap
│       │   │   └── btc_health.rs      # BTC network health gauges
│       │   │
│       │   ├── science/               # Science widgets
│       │   │   ├── mod.rs
│       │   │   ├── fourier.rs         # FFT visualization
│       │   │   ├── climate.rs         # Temperature anomaly chart
│       │   │   └── physics.rs         # 2D particle simulation
│       │   │
│       │   ├── creative/              # Creative widgets
│       │   │   ├── mod.rs
│       │   │   ├── generative.rs      # Perlin noise + particles
│       │   │   └── colorblind.rs      # Color vision deficiency
│       │   │
│       │   └── devtools/              # Developer tool widgets
│       │       ├── mod.rs
│       │       ├── regex.rs           # Regex matching
│       │       ├── network.rs         # Force-directed graph
│       │       └── cellular.rs        # Game of Life
│       │
│       ├── pkg/                       # wasm-pack output (gitignored)
│       └── scripts/
│           └── build.sh
│
├── worker/                            # CF Worker API layer
│   ├── src/
│   │   └── index.ts                   # Worker entry point
│   ├── wrangler.toml
│   └── package.json
│
├── turbo.json                         # Turborepo pipeline config
├── pnpm-workspace.yaml                # Workspace definition
└── package.json                       # Root package.json
```

---

## 5. Deployment Architecture

### 5.1 Build Pipeline

```
Source Code
    ↓
pnpm install (dependencies)
    ↓
├── wasm-pack build (Rust WASM widgets) ──→ packages/widgets/pkg/
├── tailwindcss (CSS processing) ────────→ styles.css
├── Astro build (SSG) ──────────────────→ dist/client/ (static HTML)
└── wrangler deploy ────────────────────→ CF Pages + Worker
```

### 5.2 Deployment Flow

```
1. Build WASM widgets (wasm-pack)
2. Copy WASM to public/wasm/
3. Build Astro site (astro build)
4. Deploy to CF Pages (wrangler pages deploy)
5. Deploy Worker API (wrangler deploy)
```

### 5.3 Environment Configuration

| Variable | Purpose | Source |
|----------|---------|--------|
| CLOUDFLARE_ACCOUNT_ID | CF account | CI secret |
| CLOUDFLARE_API_TOKEN | CF API token | CI secret |
| AA_API_KEY | Artificial Analysis API | CI secret |
| FRED_API_KEY | Federal Reserve API | CI secret (optional) |

---

## 6. Security Architecture

### 6.1 Headers (CF Worker)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

### 6.2 API Security

- Rate limiting on guestbook (5 posts/IP/10min)
- Bearer token for admin operations
- CORS headers for same-origin only
- Input validation on all endpoints
- No sensitive data exposure in error messages

### 6.3 WASM Security

- WASM modules loaded from same origin
- No external WASM dependencies
- No eval() or Function() constructors
- Memory-safe Rust code (no unsafe blocks in widgets)

---

## 7. Monitoring & Observability

### 7.1 Performance Monitoring

- RUM (Real User Monitoring) via CF Worker
- Core Web Vitals: TTFB, LCP, CLS, INP
- Sent to `/api/vitals` endpoint
- Aggregated in KV for dashboard

### 7.2 Error Tracking

- WASM widget error boundaries
- API error logging in CF Worker
- Console error capture in browser

### 7.3 Uptime

- CF Pages health check endpoint
- External monitoring (Uptime Kuma)
- API endpoint health checks

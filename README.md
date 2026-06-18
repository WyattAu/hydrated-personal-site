# Hydrated Personal Site

High-performance personal site and intelligence dashboard. Astro 5 + SolidJS 1.9 + Tailwind CSS 4 + WASM widgets, deployed to Cloudflare Pages and Workers.

## Architecture

```
hydrated_personal_site/
  apps/site/          Astro static site with SolidJS islands
  packages/widgets/   Rust/WASM widgets (13 modules, ~140KB compiled)
  worker/             Cloudflare Worker (20 API endpoints, KV-backed guestbook)
  tests/              Vitest unit tests + Playwright E2E + property-based tests
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Astro 5 + SolidJS 1.9 | Static generation with reactive islands |
| Styling | Tailwind CSS 4 | Utility-first CSS with custom theme system |
| WASM | Rust + wasm-pack | 13 client-side computation widgets |
| API | Cloudflare Workers | 20 proxy/cache endpoints for external APIs |
| Storage | Cloudflare KV | Guestbook persistence |
| Build | Turborepo + Bun | Monorepo task orchestration |
| Lint | Biome | Formatting + linting |
| Test | Vitest + Playwright | Unit, property-based, and E2E testing |
| CI/CD | Forgejo Actions | Build, test, deploy pipeline |
| Deploy | Cloudflare Pages + Workers | Static + edge compute |

### WASM Widgets

13 standalone Rust/WASM modules for client-side computation:

- **Science**: Fourier Transform, Cellular Automata, Climate Data Explorer, Physics Sandbox
- **Finance**: Order Book, Market Treemap, BTC Health Dashboard, Correlation Network, Backtest
- **DevTools**: Regex Playground, Network Visualizer
- **Creative**: Generative Art, Color Blindness Simulator

### Design System

Two composited design philosophies:

**Spatial Materialism**: Physical depth through layered z-index system, consistent shadow source (top-left), material textures, and letterboxing on ultra-wide displays.

**Amoebic UI**: Organic interaction patterns. Buttons and cards morph from rigid rectangles to fluid blob-like shapes on hover using cubic-bezier easing. Breath animations and cinematic fade-in transitions.

### Theme System

5 themes with full CSS custom property coverage:

| Theme | Accent | Background | Character |
|-------|--------|-----------|-----------|
| midnight-navy | #00e5ff | #050505 | Default dark, cyberpunk |
| tokyo-night | #7aa2f7 | #1a1b26 | Editor-inspired |
| arctic-dawn | #0055ee | #f0f4f8 | Light professional |
| solaris | #f0883e | #0d1117 | Warm dark |
| light | #00838f | #f5f5f5 | Minimal light |

## Pages

| Route | Description | Key Components |
|-------|-------------|---------------|
| `/` | Landing page with hero, projects, WASM showcase, expertise, employment, contact | TickerBar, ContactForm, WasmEmbed |
| `/projects` | Filterable project grid with sort | Client-side filtering and sorting |
| `/dossier` | Technical expertise, employment timeline, education, interactive demos | WasmEmbed (4 widgets) |
| `/world` | Real-time intelligence dashboard | WorldMap, MetricCards, PriceChart, DataPanels, ScatterPlots, StaleIndicator |
| `/docs` | Technical notes (placeholder) | Links to WyattsNotes |
| `/etf` | ETF database with 89 entries, search, comparison, correlation | EtfApp, SearchBar, EtfDetail, CorrelationMatrix, PortfolioComparison |
| `/guestbook` | Public guestbook with rate limiting | GuestbookForm, GuestbookList |
| `/uses` | Development tools and infrastructure | Static content |
| `/404` | Custom 404 page | Terminal-themed |

## API Endpoints

20 Cloudflare Worker endpoints with in-memory caching:

| Endpoint | Cache TTL | Upstream |
|----------|----------|----------|
| `GET /api/health` | none | local |
| `GET /api/weather?lat=&lon=` | 5 min | Open-Meteo |
| `GET /api/stock-chart?symbol=&range=&interval=` | 2 min - 2 hr | Yahoo Finance |
| `GET /api/crypto-ticker` | 10 s | Binance |
| `GET /api/coingecko-global` | 5 min | CoinGecko |
| `GET /api/earthquakes` | 5 min | USGS |
| `GET /api/fear-greed` | 5 min | Alternative.me |
| `GET /api/kp-index` | 10 min | NOAA SWPC |
| `GET /api/mempool` | 1 min | Mempool.space |
| `GET /api/binance-klines` | 5 min | Binance |
| `GET /api/hacker-news` | 5 min | Firebase |
| `GET /api/github-trending` | 30 min | GitHub API |
| `GET /api/llm-benchmarks` | 6 hr | GitHub (mlabonne) |
| `GET /api/exchange-rates` | 1 hr | exchangerate-api |
| `GET /api/fred` | 1 hr | NASA GISS |
| `GET /api/guestbook` | none | Cloudflare KV |
| `POST /api/guestbook` | none | Cloudflare KV |
| `DELETE /api/guestbook` | none | Cloudflare KV |

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Run unit tests
bunx vitest run

# Run E2E tests
bunx playwright test

# Lint and format
bun run lint
bun run format

# Build all packages
bun run build

# Build WASM widgets
cd packages/widgets && bash scripts/build.sh
```

## Testing

- **Unit tests**: 89 tests across 5 files (worker, API client, types, utilities, property-based)
- **Property-based tests**: fast-check for input validation, rate limiting, and CSS utility idempotency
- **E2E tests**: Playwright for navigation, accessibility, responsiveness, and design compliance
- **GUI traversal**: DOM snapshots and screenshots of all 9 routes at 4 viewport sizes

## Deployment

Cloudflare Pages (static site) + Cloudflare Workers (API). CI/CD via Forgejo Actions with automated build, test, and deploy pipeline.

## License

Proprietary. All rights reserved.

# Hydrated Personal Site

High-performance personal site and intelligence dashboard. Astro 5 + SolidJS 1.9 + Tailwind CSS 4 + Rust/WASM widgets, deployed to Cloudflare Pages and Workers.

## Architecture

```
hydrated_personal_site/
  apps/site/          Astro static site with SolidJS islands
  packages/widgets/   Rust/WASM widgets (16 modules, ~140 KB compiled)
  worker/             Cloudflare Worker (24 API endpoints, KV-backed guestbook)
  tests/              Vitest unit tests + Playwright E2E + property-based tests
  scripts/            Pre-commit hook, snapshot review, SBOM generation, health checks
```

### Tech Stack

| Layer       | Technology                       | Purpose                                          |
| ----------- | -------------------------------- | ------------------------------------------------ |
| Frontend    | Astro 5.18 + SolidJS 1.9         | Static generation with reactive islands          |
| Styling     | Tailwind CSS 4                   | Utility-first CSS with custom theme system       |
| WASM        | Rust + wasm-pack                 | 16 client-side computation widgets               |
| API         | Cloudflare Workers               | 24 proxy/cache endpoints for external APIs       |
| Storage     | Cloudflare KV                    | Guestbook persistence                            |
| Build       | Turborepo 2 + Bun 1.3            | Monorepo task orchestration                      |
| Lint        | Biome 1.9                        | Formatting + linting                             |
| Test        | Vitest 4 + Playwright 1.61       | Unit, property-based, and E2E testing            |
| CI/CD       | Forgejo Actions                  | Build, test, deploy pipeline                     |
| Deploy      | Cloudflare Pages + Workers       | Static + edge compute                            |

### WASM Widgets

16 standalone Rust/WASM modules for client-side computation, grouped under four domains:

- **Science (7)**: Fourier Transform, Cellular Automata, Climate Data Explorer, Physics Sandbox, Audio Visualizer, N-Body Simulation, Terrain Generator
- **Finance (5)**: Order Book, Market Treemap, BTC Health Dashboard, Correlation Network, Backtest
- **DevTools (2)**: Regex Playground, Network Visualizer
- **Creative (2)**: Generative Art, Color Blindness Simulator

### Design System

Two composited design philosophies enforced by automated E2E checks:

**Spatial Materialism.** Physical depth through a monotonic z-index token chain (`--z-bg` through `--z-modal`), shadow system with a consistent top-left light source, and letterboxing on ultra-wide displays.

**Amoebic UI.** Organic interaction patterns. Interactive elements apply the `amoebic-morph` / `amoebic-breathe` / `amoebic-underline` classes to transition from rigid rectangles to fluid blob-like shapes using `cubic-bezier` easing. Cinematic fade-in transitions respect `prefers-reduced-motion`.

### Theme System

Five themes with full CSS custom property coverage:

| Theme          | Accent   | Background | Character                |
| -------------- | -------- | ---------- | ------------------------ |
| midnight-navy  | #00e5ff  | #050505    | Default dark, cyberpunk  |
| tokyo-night    | #7aa2f7  | #1a1b26    | Editor-inspired          |
| arctic-dawn    | #0055ee  | #f0f4f8    | Light professional       |
| solaris        | #f0883e  | #0d1117    | Warm dark                |
| light          | #00838f  | #f5f5f5    | Minimal light            |

## Pages

| Route        | Description                                                          | Key Components                                          |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `/`          | Landing page with hero, projects, WASM showcase, expertise, contact  | TickerBar, ContactForm, WasmEmbed, CommandPalette       |
| `/projects`  | Filterable project grid with sort and live GitHub repository sync   | DynamicRepos                                            |
| `/dossier`   | Technical expertise, employment timeline, education, interactive demos | WasmEmbed (multiple widgets)                         |
| `/world`     | Real-time intelligence dashboard                                    | WorldMap, MetricCards, PriceChart, DataPanels, ScatterPlots |
| `/docs`      | Technical notes index                                               | Renders `src/content/docs/` markdown                    |
| `/etf`       | ETF database with search, comparison, correlation, portfolio optimizer | EtfApp, SearchBar, EtfDetail, CorrelationMatrix, PortfolioComparison |
| `/guestbook` | Public guestbook with rate limiting                                 | GuestbookForm, GuestbookList                            |
| `/uses`      | Development tools and infrastructure                                | Static content                                          |
| `/404`       | Custom 404 page                                                     | Terminal-themed                                         |

## API Endpoints

24 Cloudflare Worker endpoints with in-memory stale-while-revalidate caching, request deduplication, circuit breaker, and per-IP rate limiting. Health, versioning, metrics, and CSP report endpoints are infra-only.

| Endpoint                                          | Cache TTL | Upstream                |
| ------------------------------------------------- | --------- | ----------------------- |
| `GET /api/health`                                 | none      | local                   |
| `GET /api/versions`                               | none      | local                   |
| `GET /api/metrics`                                | none      | local                   |
| `POST /api/csp-report`                            | none      | local                   |
| `GET /api/weather?lat=&lon=`                      | 5 min     | Open-Meteo              |
| `GET /api/stock-chart?symbol=&range=&interval=`   | 5 min     | Yahoo Finance           |
| `GET /api/stock-quote?symbols=`                   | 1 min     | Yahoo Finance           |
| `GET /api/crypto-ticker`                          | 10 s      | Binance                 |
| `GET /api/coingecko-global`                       | 5 min     | CoinGecko               |
| `GET /api/earthquakes`                            | 5 min     | USGS                    |
| `GET /api/fear-greed`                             | 5 min     | Alternative.me          |
| `GET /api/kp-index`                               | 10 min    | NOAA SWPC               |
| `GET /api/mempool`                                | 1 min     | Mempool.space           |
| `GET /api/binance-klines?symbol=&interval=&limit=`| 5 min     | Binance                 |
| `GET /api/hacker-news`                            | 5 min     | Firebase                |
| `GET /api/github-trending`                        | 30 min    | GitHub API              |
| `GET /api/llm-benchmarks`                         | 6 hr      | GitHub (mlabonne)       |
| `GET /api/exchange-rates`                         | 1 hr      | exchangerate-api        |
| `GET /api/fred`                                   | 1 hr      | NASA GISS               |
| `GET /api/social-sentiment`                       | 5 min     | upstream                |
| `GET /api/restcountries`                          | 1 hr      | REST Countries          |
| `GET /api/world-bank`                             | 1 hr      | World Bank              |
| `GET /api/etf-price?ticker=`                      | 5 min     | upstream                |
| `GET /api/guestbook`                              | none      | Cloudflare KV           |
| `POST /api/guestbook`                             | none      | Cloudflare KV           |
| `DELETE /api/guestbook`                           | none      | Cloudflare KV           |

## Development

```bash
# Install dependencies (also installs the pre-commit hook via `prepare`).
bun install

# Start dev server.
bun run dev

# Run unit + property tests.
bunx vitest run

# Run E2E tests (requires a running dev server, auto-started by Playwright).
bunx playwright test

# Lint and format.
bun run lint
bun run format

# Build everything.
bun run build

# Build WASM widgets (also copies artifacts into apps/site/public/wasm).
cd packages/widgets && bash scripts/build.sh

# Review GUI snapshots after a Playwright traversal run.
scripts/review-gui-snapshots.sh
```

### Pre-commit Hook

The pre-commit hook (`scripts/pre-commit`) runs against staged files only and gates commits on:

1. **Biome format + lint** of staged TS/JS/Astro/JSON files (auto-formats then re-stages).
2. **TypeScript typecheck** of touched packages (`apps/site`, `worker`).
3. **Vitest unit tests** when TS/TSX files change.
4. **Cargo check** (wasm32 target) when Rust files change.

Re-install the hook after a fresh clone via `bun run setup` (or `bun run prepare`).

## Testing

| Layer              | Tool             | Count | Coverage                                          |
| ------------------ | ---------------- | ----- | ------------------------------------------------- |
| Unit               | Vitest 4         | 195   | Worker endpoints, API client, schemas, types, utils |
| Property-based     | fast-check       | 15    | Input validation, rate limiting, CSS idempotency  |
| E2E                | Playwright 1.61  | 90    | Navigation, a11y, responsiveness, GUI traversal, design compliance |
| GUI traversal      | Playwright       | 9 routes x 4 viewports | DOM JSON + screenshots written to `.tmp/gui-review/` |

Coverage thresholds are enforced at 80% for branches, functions, lines, and statements via `vitest.config.ts`.

## Deployment

Cloudflare Pages (static site) + Cloudflare Workers (API). CI/CD via Forgejo Actions performs:

1. **Validate** (lint, typecheck, unit tests with coverage).
2. **Build** WASM, site (with WASM staged into `public/wasm`), and verify worker types.
3. **E2E** tests against the built site.
4. **Deploy** Pages and Worker in parallel.
5. **Smoke test** homepage and key API endpoints.

Deployment runs only on pushes to `main`. Concurrency is queued (no cancellation in flight). Smoke tests probe `/`, `/api/health`, `/api/crypto-ticker`, `/world`, `/etf`.

A scheduled uptime check runs every 6 hours against the production endpoints.

## Project Layout

```
.
  apps/site/                 Astro app (pages, components, layouts, lib, styles)
  packages/widgets/          Rust crate (16 widget modules)
  worker/                    Cloudflare Worker (single index.ts, ~1370 lines)
  tests/unit/                Vitest specs (8 files)
  tests/e2e/                 Playwright specs (9 files)
  tests/baselines/           Committed DOM-snapshot baselines for drift detection
  scripts/                   pre-commit, install-hooks, health-check, review-gui-snapshots, generate-sbom
  .forgejo/workflows/        ci.yml, deploy.yml, uptime.yml
  .specs/                    R&D artifact tree (yellow/blue papers, threat model, compliance matrix)
  .reports/                  Phase reports from the R&D lifecycle
  .adrs/                     22 Architecture Decision Records
  .docs/                     User guide, API reference, design system, deployment runbook
```

## License

Proprietary. All rights reserved.

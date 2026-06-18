# Changelog

## [0.9.0] - 2026-06-17

### R&D Cycle Complete (Phases -1 through 9)

Full R&D cycle executed for Leptos 0.8 → Astro 5 + SolidJS 1.9 migration.

#### Phase -1: Context Discovery
- Domain analysis (personal portfolio + intelligence dashboard + WASM showcase)
- Applicable standards mapped (ISO/IEC 12207, IEEE 1016, WCAG 2.1, NIST, OWASP)
- Capability requirements defined

#### Phase 0: Requirements
- Existing requirements.md formalized (232 lines, FR-001 through FR-007, NFR-001 through NFR-008)

#### Phase 1: Research (5 Yellow Papers)
- YP-WEB-ASTRO-SSG-001: Astro SSG architecture theory
- YP-WEB-SOLIDJS-REACTIVITY-001: SolidJS fine-grained reactivity
- YP-WASM-WIDGET-ARCH-001: Standalone WASM widget architecture
- YP-VISUALIZATION-FINANCE-001: Financial data visualization (uPlot, D3, Rough.js)
- YP-INFRA-CF-WORKERS-001: Cloudflare Workers edge computing
- 26 test vectors, domain constraints TOML

#### Phase 2: Architecture (4 Blue Papers, 22 ADRs)
- BP-ASTRO-SITE-001: Astro site core (IEEE 1016)
- BP-CF-WORKER-001: CF Worker API layer (IEEE 1016)
- BP-WASM-WIDGETS-001: WASM widget system (IEEE 1016)
- BP-SOLIDJS-COMPONENTS-001: SolidJS component library (IEEE 1016)
- 22 ADR files (ADR-001 through ADR-024)
- Interface contracts TOML (20+ API endpoints)

#### Phase 3: Security
- STRIDE threat model (30+ threats)
- Security test plan (10 categories, 80+ tests)
- OWASP Top 10 + NIST SP 800-53 compliance matrix
- CSP, HSTS, Permissions-Policy configuration

#### Phase 4: Performance
- Core Web Vitals targets (LCP <1.5s, CLS <0.01)
- Bundle size budgets (initial <50KB, WASM <100KB/widget)
- Benchmark suite (Lighthouse CI, Vitest, size-limit)
- Optimization roadmap (critical CSS, fonts, images, code splitting)

#### Phase 5: Adversarial Loop
- 6 Critical Path Risks identified
- 45 adversarial test scenarios
- HAL mock API (all 20+ endpoints)

#### Phase 6: CI/CD
- Forgejo Actions pipeline config (ci.yml, deploy.yml, uptime.yml)
- Deployment strategy (CF Pages + Workers)
- Quality gates per stage

#### Phase 7: Documentation
- User guide
- API reference (16 endpoints)
- Design system documentation

#### Phase 8: Execution Graph
- 64-task master plan (topological sort)
- 235h total estimate
- Critical path identified

#### Phase 9: Deployment
- Deployment runbook
- Rollback procedures
- Incident response (P0-P3)

### Artifact Count
- `.specs/`: 28 files
- `.reports/`: 10 files
- `.adrs/`: 22 files
- `.docs/`: 4 files
- **Total: 64 R&D artifacts**

---

## [1.6.0] - 2026-06-18

### Implementation Complete (Phases 0-6)

Full site implemented from R&D specifications. Build passes, 16/16 tests pass, WASM widgets compile.

#### Phase 0: Foundation
- Astro 5.x + SolidJS 1.9 + Tailwind CSS 4
- Turborepo monorepo with Bun workspaces
- CF Worker with 16 API endpoints (caching, rate limiting, security headers)
- Vitest + Playwright testing
- Forgejo Actions CI/CD (ci.yml, deploy.yml, uptime.yml)
- Biome linting/formatting

#### Phase 1: Core Pages (9 pages)
- Home (hero, about, projects, expertise, employment, contact)
- Dossier (expertise grid, employment timeline, education)
- Projects (content collection grid)
- World (intelligence monitor)
- ETF (intelligence dashboard)
- Docs (technical notes placeholder)
- Guestbook (form + list)
- Uses (development tools)
- 404 (terminal-style)

#### Phase 2: World Monitor
- Leaflet.js map (dark tiles, earthquake markers, capitals)
- Metric cards (BTC, ETH, S&P500, Fear&Greed, Kp, Mempool)
- Price chart (Canvas2D, 5 timeframes, crosshair)
- Data panels (LLM benchmarks, GitHub Trending, HN)
- Scatter plots (LLM Intelligence vs Price/Speed)
- Stale indicator (data freshness)

#### Phase 3: ETF Intelligence
- SearchBar (autocomplete, keyboard nav, 89 ETFs)
- EtfDetail (sector/region allocation charts, holdings table)
- PortfolioComparison (side-by-side A vs B)
- CorrelationMatrix (Canvas2D heatmap, 10 ETFs)
- PerformanceMetrics (Sharpe, drawdown, volatility)

#### Phase 4: WASM Widgets (3 widgets, 41KB)
- Fourier Transform (FFT visualization)
- Cellular Automata (Game of Life)
- Regex Playground (pattern matching)
- WasmEmbed.astro (IntersectionObserver lazy loading)

#### Phase 5: Polish
- 5 themes (midnight-navy, tokyo-night, arctic-dawn, solaris, light)
- Command palette (Ctrl+K, page navigation)
- Ticker bar (live crypto prices)
- Contact form, guestbook form
- Content collections (9 projects)

#### Phase 6: Launch Ready
- robots.txt, manifest.json
- 15 SolidJS components code-split
- All pages pre-rendered
- WASM widgets compiled and copied to public/

### Build Metrics
| Metric | Value |
|--------|-------|
| Pages | 9 (pre-rendered) |
| SolidJS Components | 15 |
| WASM Widgets | 3 (41KB) |
| Tests | 16/16 passing |
| Build Time | ~3.5s |
| Total JS (gzipped) | ~90KB (excluding Leaflet 44KB) |

---

## [2.0.0] - 2026-06-18

### Full Implementation Complete

All pages enhanced with full content, 13 WASM widgets, comprehensive test suite.

#### Pages Enhanced
- **index.astro**: Full hero, about, 9 projects from content collections, expertise grid, employment, WASM showcase (3 widgets), contact form
- **dossier.astro**: 6 expertise categories with icons, employment achievements, education, 4 WASM widgets
- **projects.astro**: Content collection grid with client-side filter/sort
- **world.astro**: Full layout + 3 WASM analytics widgets (Order Book, Treemap, BTC Health)
- **etf.astro**: Full layout + Correlation Network WASM widget
- **uses.astro**: Grid layout with categories, external links
- **guestbook.astro**: 2:3 column layout, guidelines section
- **docs.astro**: Placeholder with topic cards
- **Nav.astro**: Active page detection, mobile hamburger menu

#### WASM Widgets (13 total, 140KB raw / 63KB gzipped)
| Widget | Category | Export |
|--------|----------|--------|
| Fourier Transform | Science | `create_fourier_viz` |
| Cellular Automata | Science | `create_cellular_automata` |
| Climate Data Explorer | Science | `create_climate` |
| Physics Sandbox | Science | `create_physics` |
| Order Book Depth | Finance | `create_order_book` |
| Market Treemap | Finance | `create_treemap` |
| BTC Health Dashboard | Finance | `create_btc_health` |
| Correlation Network | Finance | `create_correlation` |
| Strategy Backtester | Finance | `create_backtest` |
| Generative Art Studio | Creative | `create_generative` |
| Color Blindness Simulator | Creative | `create_colorblind` |
| Regex Playground | DevTools | `create_regex_playground` |
| Network Topology Mapper | DevTools | `create_network` |

#### Test Suite (74 unit + ~73 E2E)
| File | Tests | Coverage |
|------|-------|----------|
| utils.test.ts | 29 | Theme, format, debounce, throttle, clamp, slugify, JSON |
| api.test.ts | 13 | All API client functions, error handling |
| types.test.ts | 15 | Type structure validation |
| worker.test.ts | 17 | Health, guestbook, rate limiting, headers |
| home.spec.ts | 16 | Full home page E2E |
| world.spec.ts | 8 | World monitor E2E |
| etf.spec.ts | 9 | ETF intelligence E2E |
| projects.spec.ts | 8 | Projects page E2E |
| guestbook.spec.ts | 10 | Guestbook E2E |
| responsive.spec.ts | 12 | Cross-viewport testing |
| accessibility.spec.ts | 10 | WCAG compliance |

### Final Build Metrics
| Metric | Value |
|--------|-------|
| Pages | 9 (pre-rendered) |
| SolidJS Components | 15 (code-split) |
| WASM Widgets | 13 (63KB gzipped) |
| Unit Tests | 74/74 passing |
| E2E Tests | ~73 (Playwright) |
| Build Time | ~7.5s |
| Total JS (gzipped) | ~90KB + 44KB Leaflet |

# Implementation Plan: Hydrated Personal Site

## 1. Overview

### 1.1 Timeline
| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 0: Foundation | Week 1 | Project setup, tooling, CI/CD |
| Phase 1: Core Pages | Week 2-3 | Home, Dossier, Uses, 404 |
| Phase 2: World Monitor | Week 4-5 | Map, metrics, charts, data panels |
| Phase 3: ETF Intelligence | Week 6 | Search, detail, portfolio, correlation |
| Phase 4: WASM Widgets | Week 7-8 | Leptos showcase components |
| Phase 5: Polish | Week 9 | Performance, accessibility, SEO |
| Phase 6: Launch | Week 10 | Deployment, monitoring, documentation |

### 1.2 Dependencies
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
                              Phase 4 can start after Phase 1
```

### 1.3 Effort Summary
| Phase | Hours | Deliverable |
|-------|-------|-------------|
| Phase 0: Foundation | 16h | Project skeleton, CI/CD, Worker API |
| Phase 1: Core Pages | 24h | 4 pages with content |
| Phase 2: World Monitor | 40h | World monitor with all features |
| Phase 3: ETF Intelligence | 24h | ETF intelligence with all features |
| Phase 4: WASM Widgets | 48h | 13 Leptos showcase widgets |
| Phase 5: Polish | 16h | Performance, accessibility, SEO |
| Phase 6: Launch | 8h | Deployment, monitoring |
| **Total** | **~176h** | |

---

## 2. Phase 0: Foundation (Week 1)

### 2.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 0.1 | Initialize Astro 5 project | 2h | None | `pnpm create astro` + Solid adapter |
| 0.2 | Configure Tailwind CSS 4 | 2h | 0.1 | Same design tokens as current site |
| 0.3 | Set up Turborepo monorepo | 2h | 0.1 | `turbo build` works |
| 0.4 | Create CF Worker project | 2h | 0.1 | `wrangler dev` works |
| 0.5 | Port CF Worker API endpoints | 8h | 0.4 | All 20+ endpoints respond |
| 0.6 | Set up CI/CD (GitHub Actions) | 2h | 0.1 | Auto-deploy on push |
| 0.7 | Set up testing (Vitest + Playwright) | 2h | 0.1 | Test runner works |

### 2.2 Deliverables
- Working Astro project with SolidJS
- Tailwind CSS with design tokens
- CF Worker with all API endpoints
- CI/CD pipeline
- Test infrastructure

### 2.3 Verification
- `pnpm dev` starts dev server
- `pnpm build` produces static output
- `wrangler dev` serves API endpoints
- `pnpm test` runs unit tests
- All API endpoints return valid responses

---

## 3. Phase 1: Core Pages (Week 2-3)

### 3.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 1.1 | Create BaseLayout with SEO | 3h | 0.1 | Meta tags, structured data, fonts |
| 1.2 | Create Home page | 4h | 1.1 | Hero, about, featured projects |
| 1.3 | Create Dossier page | 2h | 1.1 | Expertise, employment, education |
| 1.4 | Create Uses page | 1h | 1.1 | Development tools list |
| 1.5 | Create 404 page | 1h | 1.1 | Terminal-style error page |
| 1.6 | Create Nav component | 2h | 1.1 | Fixed nav with theme toggle |
| 1.7 | Create Footer component | 1h | 1.1 | Footer with links |
| 1.8 | Port scroll reveal animations | 2h | 1.1 | IntersectionObserver-based |
| 1.9 | Port theme system | 2h | 1.1 | 6 themes, localStorage persistence |
| 1.10 | Port command palette | 3h | 1.1 | Keyboard shortcut, search |
| 1.11 | Visual regression testing | 4h | All | Screenshot comparison |

### 3.2 Deliverables
- 5 pages with identical visual output
- Working navigation and theme toggle
- Command palette functional
- Scroll reveals working
- SEO validated

---

## 4. Phase 2: World Monitor (Week 4-5)

### 4.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 2.1 | Create World page layout | 3h | Phase 1 | Map, metrics, charts, panels |
| 2.2 | Solid MetricCards component | 5h | Phase 1 | Live-updating metrics |
| 2.3 | Integrate Leaflet.js map | 6h | Phase 1 | Earthquakes, countries, capitals |
| 2.4 | Integrate uPlot for price charts | 4h | Phase 1 | Price chart with timeframe |
| 2.5 | Solid CountryPanel component | 5h | Phase 1 | Click-to-intelligence panel |
| 2.6 | Solid DataPanels component | 6h | Phase 1 | LLM, GitHub, ArXiv, HN |
| 2.7 | Solid ScatterPlots component | 4h | Phase 1 | LLM scatter plots |
| 2.8 | Solid StaleIndicator component | 2h | Phase 1 | Data freshness display |
| 2.9 | Port vanilla JS chart code | 4h | 2.3, 2.4 | Multi-graph, crosshair |
| 2.10 | Integration testing | 3h | All | All features work |

### 4.2 Deliverables
- World monitor with all features
- Map with earthquake markers
- Live-updating metric cards
- Price chart with timeframe selection
- LLM scatter plots
- Data panels with live data

---

## 5. Phase 3: ETF Intelligence (Week 6)

### 5.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 3.1 | Create ETF page layout | 2h | Phase 1 | Search, detail, comparison |
| 3.2 | Solid SearchBar component | 3h | Phase 1 | Autocomplete from 89 ETFs |
| 3.3 | Solid ETF detail view | 4h | Phase 1 | Price, allocation, holdings |
| 3.4 | Solid PortfolioComparison | 4h | Phase 1 | A vs B comparison |
| 3.5 | Solid CorrelationMatrix | 4h | Phase 1 | Heatmap visualization |
| 3.6 | Solid PerformanceMetrics | 3h | Phase 1 | Sharpe, drawdown, etc. |
| 3.7 | Integrate uPlot for ETF chart | 2h | 3.3 | ETF price chart |
| 3.8 | Integration testing | 4h | All | All features work |

### 5.2 Deliverables
- ETF intelligence with all features
- Search with autocomplete
- Detail view with allocations
- Portfolio comparison
- Correlation matrix
- Performance metrics

---

## 6. Phase 4: WASM Widgets (Week 7-8)

### 6.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 4.1 | Set up wasm-pack build pipeline | 4h | Phase 0 | `wasm-pack build` works |
| 4.2 | Create embed wrapper pattern | 4h | 4.1 | Astro component + IntersectionObserver |
| 4.3 | Fourier Transform widget | 6h | 4.1 | FFT visualization works |
| 4.4 | Correlation widget | 4h | 4.1 | Matrix computation works |
| 4.5 | Backtest widget | 6h | 4.1 | Strategy simulation works |
| 4.6 | Cellular Automata widget | 4h | 4.1 | Game of Life works |
| 4.7 | Physics Sandbox widget | 4h | 4.1 | Particle simulation works |
| 4.8 | Generative Art widget | 4h | 4.1 | Procedural art works |
| 4.9 | Page integration | 6h | All | Widgets on correct pages |
| 4.10 | WASM loading optimization | 2h | 4.9 | Lazy-load with skeleton |

### 6.2 Widget Inventory (13 total)

| # | Widget | Category | Data Source | WASM Size | Page | Effort |
|---|--------|----------|-------------|-----------|------|--------|
| A1 | Order Book Depth | Finance | Binance WebSocket | ~80KB | World | 8h |
| A2 | Correlation Network | Finance | Yahoo Finance | ~120KB | ETF | 8h |
| A3 | Strategy Backtester | Finance | Yahoo Finance | ~130KB | ETF | 12h |
| A4 | Market Treemap | Finance | CoinGecko | ~90KB | World | 6h |
| A5 | BTC Health Dashboard | Finance | mempool.space | ~100KB | World | 8h |
| B1 | Fourier Transform | Science | None (pure) | ~70KB | Home | 6h |
| B2 | Climate Data Explorer | Science | NASA GISS CSV | ~110KB | Dossier | 10h |
| B3 | Cellular Automata | Science | None (pure) | ~60KB | Dossier | 4h |
| B4 | Physics Sandbox | Science | None (pure) | ~80KB | Dossier | 8h |
| C1 | Generative Art Studio | Creative | None (pure) | ~90KB | Home | 8h |
| C2 | Color Blindness Simulator | Creative | User image | ~50KB | Dossier | 4h |
| D1 | Regex Playground | DevTools | None (Rust regex) | ~40KB | Home | 4h |
| D2 | Network Topology Mapper | DevTools | User input | ~70KB | Projects | 6h |

**Total WASM**: ~1.05MB (all 13 widgets, lazy-loaded per page)

---

## 7. Phase 5: Polish (Week 9)

### 7.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 5.1 | Visual fidelity audit | 4h | Phase 4 | Pixel-perfect comparison |
| 5.2 | Responsive testing | 3h | 5.1 | 320px-2560px works |
| 5.3 | Lighthouse optimization | 4h | 5.2 | 95+ all categories |
| 5.4 | Accessibility audit | 3h | 5.3 | WCAG 2.1 AA |
| 5.5 | SEO validation | 2h | 5.1 | Google Rich Results Test |
| 5.6 | Performance monitoring | 2h | 5.3 | RUM vitals working |

### 7.2 Deliverables
- Production-ready site
- All tests passing
- Performance targets met
- Accessibility validated

---

## 8. Phase 6: Launch (Week 10)

### 8.1 Tasks

| # | Task | Effort | Dependencies | Acceptance Criteria |
|---|------|--------|-------------|-------------------|
| 6.1 | CF Pages deployment | 2h | Phase 5 | Site live on CF Pages |
| 6.2 | Custom domain setup | 1h | 6.1 | wyattau.com works |
| 6.3 | SSL/TLS verification | 1h | 6.2 | HTTPS everywhere |
| 6.4 | Smoke testing | 2h | 6.1 | All pages work |
| 6.5 | Documentation | 2h | All | README, deployment guide |

### 8.2 Launch Checklist
- [ ] All pages render correctly
- [ ] All interactive features work
- [ ] SEO validates
- [ ] Accessibility passes
- [ ] Performance targets met
- [ ] Custom domain configured
- [ ] SSL working
- [ ] Monitoring active
- [ ] Documentation complete

---

## 9. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SolidJS hydration fails | Low | High | Use `client:only="lazy"` for isolation |
| WASM widgets don't load | Medium | Medium | Skeleton loading + error boundaries |
| CF Worker API changes | Low | Medium | Worker is framework-agnostic |
| Visual regression | Medium | High | Screenshot comparison CI |
| Performance regression | Low | Medium | Lighthouse CI on every PR |
| SEO regression | Low | High | Validate with Google Rich Results Test |
| Accessibility regression | Medium | Medium | Automated axe-core testing |

---

## 10. Success Metrics

### 10.1 Technical Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Lighthouse Performance | 95+ | CI on every PR |
| Lighthouse Accessibility | 100 | CI on every PR |
| Lighthouse SEO | 100 | CI on every PR |
| LCP | <1.5s | RUM data |
| FID | <50ms | RUM data |
| CLS | <0.01 | RUM data |
| Test coverage | >80% | Vitest + Playwright |
| Bundle size (initial) | <40KB | Build output |
| WASM (per widget) | <100KB | Build output |
| Charts | 48KB | uPlot gzipped |

### 10.2 Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Page views | Baseline + 20% | Analytics |
| Bounce rate | <40% | Analytics |
| Average session duration | >2min | Analytics |
| Lighthouse score | 95+ | Monthly audit |

---

## 11. Appendix: Task Dependency Graph

```
Phase 0 (Foundation)
├── 0.1 Initialize Astro
│   ├── 0.2 Configure Tailwind
│   ├── 0.3 Set up Turborepo
│   ├── 0.4 Create CF Worker
│   │   └── 0.5 Port API endpoints
│   ├── 0.6 Set up CI/CD
│   └── 0.7 Set up testing
│
Phase 1 (Core Pages) ─── depends on Phase 0
├── 1.1 BaseLayout
│   ├── 1.2-1.5 Static pages
│   ├── 1.6-1.7 Components
│   ├── 1.8-1.0 Animations/themes
│   └── 1.11 Visual regression
│
Phase 2 (World Monitor) ─── depends on Phase 1
├── 2.1 World page layout
├── 2.2-2.8 Components
├── 2.9 Vanilla JS integration
└── 2.10 Testing
│
Phase 3 (ETF Intelligence) ─── depends on Phase 1
├── 3.1-3.6 Components
├── 3.7 Chart integration
└── 3.8 Testing
│
Phase 4 (WASM Widgets) ─── depends on Phase 0 + Phase 1
├── 4.1-4.2 Infrastructure
├── 4.3-4.8 Widget development
├── 4.9 Page integration
└── 4.10 Optimization
│
Phase 5 (Polish) ─── depends on Phase 4
├── 5.1-5.6 Testing and optimization
│
Phase 6 (Launch) ─── depends on Phase 5
└── 6.1-6.5 Deployment
```

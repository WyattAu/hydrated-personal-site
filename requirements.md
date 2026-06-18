# Requirements Document: Hydrated Personal Site

## 1. Project Overview

### 1.1 Purpose
A personal portfolio website for Wyatt Au, showcasing technical expertise through interactive visualizations, real-time data dashboards, and Leptos WASM showcase widgets. The site serves as both a portfolio and a demonstration of modern web technologies.

### 1.2 Stakeholders
| Stakeholder | Role | Primary Concern |
|-------------|------|-----------------|
| Wyatt Au | Owner/Developer | Portfolio showcase, technical demonstration |
| Recruiters | Visitors | Quick assessment of skills, project quality |
| Developers | Visitors | Technical depth, open source contributions |
| Search Engines | Crawlers | SEO, structured data, accessibility |

### 1.3 Success Criteria
- Lighthouse score: 95+ across all categories
- First Contentful Paint: <1.5s on 4G
- All interactive features work without errors
- SEO: validates with Google Rich Results Test
- Accessibility: WCAG 2.1 AA compliant
- Mobile responsive: 320px to 2560px viewport

---

## 2. Functional Requirements

### 2.1 Page Structure

| Route | Content | Interactive Features |
|-------|---------|---------------------|
| `/` | Hero, About, Featured Projects, Expertise, Employment, Contact | Theme toggle, command palette, ticker bar, contact form |
| `/projects` | Dynamic project list from GitHub/Forgejo APIs | Filter by language, sort, search |
| `/dossier` | Technical expertise, employment timeline, education | Scroll reveals |
| `/world` | Real-time world intelligence monitor | Map (Leaflet), metric cards, price charts, scatter plots, data panels |
| `/docs` | Technical notes from wyattsnotes.wyattau.com | RSS feed, search/filter |
| `/etf` | ETF database with allocation analysis | Search, detail view, portfolio comparison, correlation matrix |
| `/guestbook` | User-submitted messages | Submit form, display list, rate limiting |
| `/uses` | Development tools and infrastructure | Static content |

### 2.2 Interactive Features

#### 2.2.1 Theme System
- 6 themes: midnight-navy, tokyo-night, arctic-dawn, solaris, light
- Persisted to localStorage
- System preference detection on first visit
- Smooth transition between themes

#### 2.2.2 Navigation
- Fixed top navigation bar with glassmorphism effect
- Active page highlighting
- Mobile hamburger menu
- Command palette (`/` or `Ctrl+K`)

#### 2.2.3 World Monitor (`/world`)
- **Leaflet.js Map**: Earthquake markers, country borders, capital markers
- **Country Intelligence Panel**: Click any country for World Bank data, REST Countries data
- **Metric Cards**: Live-updating crypto, macro, crash indicators
- **Price Chart**: uPlot candlestick/line chart with timeframe selection
- **LLM Scatter Plots**: Intelligence vs Price, Intelligence vs Speed
- **Data Panels**: LLM benchmarks, GitHub Trending, ArXiv AI papers, HN feed
- **Stale Indicator**: Shows data freshness

#### 2.2.4 ETF Intelligence (`/etf`)
- **Search**: Autocomplete from 89 ETF database
- **Detail View**: Price, change, sector allocation, region allocation, top holdings
- **Portfolio Comparison**: Side-by-side A vs B allocation
- **Correlation Matrix**: 1Y daily returns, max 10 ETFs
- **Performance Metrics**: Total return, volatility, Sharpe ratio, max drawdown

#### 2.2.5 Guestbook (`/guestbook`)
- Submit form with honeypot spam protection
- Rate limiting (5 posts per 10 min per IP)
- Admin delete with bearer token
- KV-backed persistence

#### 2.2.6 WASM Showcase Widgets (13 total)
- **Finance**: Order Book, Correlation Network, Strategy Backtester, Market Treemap, BTC Health Dashboard
- **Science**: Fourier Transform, Climate Data Explorer, Physics Sandbox
- **Creative**: Generative Art Studio, Color Blindness Simulator
- **Developer**: Regex Playground, Network Topology Mapper, Cellular Automata

### 2.3 API Endpoints

| Endpoint | Method | Purpose | Cache |
|----------|--------|---------|-------|
| `/api/health` | GET | Health check | None |
| `/api/weather` | GET | Open-Meteo weather | 5min |
| `/api/stock-chart` | GET | Yahoo Finance charts | 2min-2h |
| `/api/crypto-ticker` | GET | Binance crypto prices | 10s |
| `/api/coingecko-global` | GET | CoinGecko global data | 5min |
| `/api/earthquakes` | GET | USGS earthquake data | 5min |
| `/api/fear-greed` | GET | Crypto Fear & Greed | 5min |
| `/api/kp-index` | GET | NOAA Kp index | 10min |
| `/api/mempool` | GET | BTC mempool fees | 1min |
| `/api/binance-klines` | GET | Price history (via Yahoo Finance) | 5min |
| `/api/hacker-news` | GET | Top HN stories | 5min |
| `/api/github-trending` | GET | GitHub trending repos | 30min |
| `/api/llm-benchmarks` | GET | LLM benchmark data | 6h |
| `/api/guestbook` | GET/POST/DELETE | Guestbook CRUD | No cache |
| `/api/exchange-rates` | GET | Currency exchange rates | 1h |
| `/api/fred` | GET | Federal Reserve data | 1h |

### 2.4 Data Sources

| Source | Type | Update Frequency |
|--------|------|------------------|
| Yahoo Finance | REST API (proxied) | 10s-2h depending on range |
| CoinGecko | REST API (proxied) | 5min cache |
| Binance | REST API (proxied) | 10s |
| USGS | REST API | 5min |
| NOAA | REST API | 10min |
| Open-Meteo | REST API | 5min |
| HN Firebase | REST API | 5min |
| GitHub API | REST API | 30min |
| mempool.space | REST API | 1min |
| blockchain.info | REST API | 5min |

---

## 3. Non-Functional Requirements

### 3.1 Performance
| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | <1.5s | Astro SSG + critical CSS + font preload |
| FID | <50ms | SolidJS hydration, no WASM on initial load |
| CLS | <0.01 | Fixed dimensions, font-display: swap |
| TTI | <1.5s | Lazy-load WASM widgets |
| Bundle (initial) | <50KB | SolidJS ~4KB + Alpine.js ~16KB |
| WASM (per widget) | <100KB | Lazy-load via IntersectionObserver |
| CSS | <80KB | Tailwind 4 purging |
| Charts | <50KB | uPlot (48KB gzipped) |
| Total first load | <400KB | Astro SSG + lazy WASM |

### 3.2 SEO
- Structured data (JSON-LD) for all pages
- Open Graph and Twitter Card meta tags
- Canonical URLs
- XML sitemap
- RSS feed
- Semantic HTML (proper headings, landmarks, ARIA)
- Image optimization (WebP/AVIF, lazy loading)

### 3.3 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support (ARIA labels, roles)
- `prefers-reduced-motion` support
- Skip-to-content link
- Focus management for modals

### 3.4 Security
- Content Security Policy headers
- HSTS with preload
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (camera, microphone, geolocation disabled)

### 3.5 Reliability
- Service worker for offline support (stale-while-revalidate)
- Error boundaries for WASM widget failures
- Graceful degradation when APIs are unavailable
- Rate limiting on guestbook (5 posts/IP/10min)

### 3.6 Maintainability
- TypeScript for all JS code
- Component-based architecture
- Clear separation of concerns
- Comprehensive documentation
- CI/CD with automated testing

---

## 4. Technical Constraints

### 4.1 Platform
- Cloudflare Pages for static hosting
- Cloudflare Workers for API proxying
- Cloudflare KV for guestbook persistence
- No server-side rendering required (all pages are static)

### 4.2 Browser Support
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+
- No IE11 support

### 4.3 Network
- All API calls proxied through CF Worker (no CORS issues)
- DNS prefetch for external domains
- Aggressive caching (5min-6h depending on data freshness)

### 4.4 Build
- Bun 1.0+ (package manager + runtime, 10x faster than npm)
- Turborepo for monorepo orchestration with build caching
- Biome for linting + formatting (replaces ESLint + Prettier)
- wasm-pack for Rust WASM compilation
- Astro 5.x for SSG
- SolidJS 1.9 for interactive islands
- Vitest for unit testing
- Playwright for E2E testing

---

## 5. Content Requirements

### 5.1 Static Content
- Hero section with parallax images
- About section with bio and stats
- Featured projects (9 repositories)
- Expertise grid (6 categories)
- Employment timeline (2 entries)
- Education timeline (1 entry)
- Contact section with form
- Uses page (development tools)

### 5.2 Dynamic Content
- World monitor metrics (live-updating)
- ETF database (89 ETFs)
- Guestbook entries (user-submitted)
- LLM benchmarks (API-cached)
- GitHub trending (API-cached)

### 5.3 Media
- Hero images: london_night.webp/avif, hong_kong_twilight.webp/avif
- Profile photo: my_face.webp/avif
- OG images: 9 PNGs (1200x630)
- Fonts: Inter (47KB), JetBrains Mono (31KB)
- Favicons: SVG, ICO, PNG (32, 180, 192)

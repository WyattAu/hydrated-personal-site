# Hydrated Personal Site — Roadmap & Quality Audit

## Executive Summary

This document provides a formal roadmap for the hydrated personal site (wyattau.com) and a comprehensive code audit against FAANG, HFT, ECN, and defense sector engineering standards.

**Current State:**
- 29 WASM quant functions across 24 Rust modules
- 68+ SolidJS components across 5 pages
- 18 real-algorithm showcase widgets
- SEO audit page, multi-platform deployment (Cloudflare + GitHub + Netlify)
- 60 passing Rust tests, 11 TypeScript test files

**Audit Result:** 0 CRITICAL, 5 HIGH, 16 MEDIUM, 10 LOW issues identified.

---

## Roadmap

### Phase 1: Foundation Hardening (Week 1-2)

| Priority | Task | Impact | Status |
|----------|------|--------|--------|
| **HIGH** | Fix `static mut` in pendulum.rs → `thread_local!` | Rust safety violation | Pending |
| **HIGH** | Add error logging to 57 silent `catch {}` blocks | Observability for debugging | Pending |
| **HIGH** | Add structured audit logging (FINRA/defense requirement) | Regulatory compliance | Pending |
| **HIGH** | Publish GitHub repo publicly | DA/DR boost from github.io backlinks | Pending |
| **HIGH** | Fix CORS: restrict to `wyattau.com` and `*.github.io` | Security hardening | Pending |
| **MEDIUM** | Add `lang="en"` to HTML (crawlkit false positive check) | SEO accessibility | Verified present |
| **MEDIUM** | Add input validation for lat/lon/symbol parameters | Injection prevention | Pending |
| **MEDIUM** | Fix Boids/K-Means disappearing (check console for WASM errors) | UX reliability | Pending |
| **MEDIUM** | Add ResizeObserver to all canvas WASM widgets | Window resize handling | Pending |
| **LOW** | Remove `unsafe-inline` from CSP (if possible) | CSP strength | Deferred |

### Phase 2: Core Feature Expansion (Week 3-4)

| Priority | Task | Impact | Data Required |
|----------|------|--------|---------------|
| **HIGH** | Walk-forward backtester with slippage/commission | Transforms dashboard → research platform | Yahoo OHLCV |
| **HIGH** | Blog section with technical articles | DA/DR boost (content marketing) | None |
| **HIGH** | Fix canvas resize for all 18 showcase widgets | UX polish | None |
| **HIGH** | Publish GitHub repo publicly | DA/DR from github.io backlinks | None |
| **MEDIUM** | SVI volatility surface fitting from Deribit data | Professional quant credibility | Deribit API (existing) |
| **MEDIUM** | Black-Litterman interactive views UI | Portfolio optimization UX | None |
| **MEDIUM** | Walk-forward optimization for strategy parameters | Backtesting completeness | Yahoo OHLCV |
| **MEDIUM** | Fama-French factor returns data source | Factor regression accuracy | Ken French website (free) |
| **LOW** | CrUX/Core Web Vitals integration | Real user performance data | Chrome UX Report API |

### Phase 3: Advanced Features (Week 5-8)

| Priority | Task | Impact | Complexity |
|----------|------|--------|-----------|
| **HIGH** | Real-time WebSocket streaming for live prices | True live data | High — Cloudflare Durable Objects needed |
| **HIGH** | Walk-forward strategy backtester | Strategy validation | High — event-driven architecture |
| **HIGH** | L2 Order Book depth visualization | True HFT microstructure | High — WebSocket from crypto exchanges |
| **MEDIUM** | News sentiment analysis (NLP) | Market intelligence | Medium — WASM-compiled transformer |
| **MEDIUM** | Kalman filter beta tracker | Adaptive hedging | Medium — state-space model |
| **MEDIUM** | SVI/SABR volatility surface | Professional vol surface | Medium — numerical optimization |
| **MEDIUM** | Executive search/replace (crawlkit) | SEO automation | Low — existing crawlkit |
| **LOW** | Multi-currency normalization | Cross-asset comparison | Low — FX rate API exists |
| **LOW** | Credit spread analysis | Fixed income intelligence | Low — Treasury data exists |

### Phase 4: Enterprise Features (Month 3+)

| Priority | Task | Impact | Complexity |
|----------|------|--------|-----------|
| **MEDIUM** | Structured audit logging (FINRA 17a-4) | Regulatory compliance | Medium |
| **MEDIUM** | Real-time alerts (threshold monitoring) | Trading signals | Medium — Cloudflare Workers |
| **MEDIUM** | Historical scenario replay (2008, 2020, 2022) | Stress testing | Low — data exists |
| **LOW** | OMS integration (IBKR/Alpaca API) | Order execution | High — broker API complexity |
| **LOW** | Multi-tenant access control | Enterprise feature | Medium |

---

## Code Quality Audit Summary

### FAANG/HFT/Defense Standards Compliance

| Category | Score | Status |
|----------|-------|--------|
| **Algorithm Correctness** | 9/10 | All core quant algorithms verified correct |
| **Rust Safety** | 8/10 | One `static mut` issue in pendulum.rs |
| **Test Coverage (Quant)** | 9/10 | 21/21 modules have unit tests |
| **Test Coverage (Non-Quant)** | 3/10 | 0 tests for showcase/science/finance widgets |
| **Error Handling** | 6/10 | 57 silent catch blocks need logging |
| **Security Headers** | 9/10 | CSP, HSTS, X-Frame-Options all present |
| **API Design** | 8/10 | RESTful, rate-limited, CORS configured |
| **Input Validation** | 7/10 | Guestbook good, but lat/lon/symbol lack validation |
| **Memory Management** | 9/10 | All intervals, observers, listeners properly cleaned up |
| **Documentation** | 7/10 | Quant modules well-documented; showcase modules undocumented |

### Items Fixed This Session

| # | Issue | Fix |
|---|-------|-----|
| 1 | OG image rendering as `[object Object]` | Changed astro-seo to use string format |
| 2 | Missing og:image dimensions | Added meta tags |
| 3 | Short meta descriptions | Expanded all to 120-188 chars |
| 4 | Missing alt text on hero images | Added descriptive alt text |
| 5 | World page missing AssetSelector | Rebuilt entire page with all components |
| 6 | Quant widgets not using activeAsset | Fixed all 16 single-asset components |
| 7 | MonteCarlo/GARCH/VaR using wrong API | Changed from binance-klines to stock-chart |
| 8 | GreeksDashboard hardcoded to BTC | Now fetches actual spot price for any asset |
| 9 | Guestbook lazy loading | Added pagination, sorted by date, 5s cache |
| 10 | Protein folding widget added | HP model with Monte Carlo simulated annealing |
| 11 | Cross-asset ticker events | Added asset-changed CustomEvent dispatch |
| 12 | Duplicate const declarations in WASM calls | Renamed variables to avoid conflicts |
| 13 | Missing forecastHorizon signal in GARCH | Added createSignal for the control |

---

## Technical Debt Registry

| # | Debt | Impact | Priority | Effort |
|---|------|--------|----------|--------|
| 1 | `static mut` in pendulum.rs | Rust safety | HIGH | 30 min |
| 2 | 57 silent catch blocks | Debugging | HIGH | 2 hours |
| 3 | Gauss-Jordan matrix inverse duplicated 3x | Maintenance | LOW | 30 min |
| 4 | 35+ showcase widgets with 0 test coverage | Reliability | MEDIUM | 1 week |
| 5 | `any` types in WASM module references | Type safety | MEDIUM | 2 hours |
| 6 | CORS `*` — overly permissive | Security | MEDIUM | 15 min |
| 7 | Missing lat/lon validation | Injection risk | MEDIUM | 30 min |
| 8 | In-memory cache not shared across workers | Performance | LOW | N/A (serverless) |

---

## Deployment Pipeline

| Platform | Status | Purpose |
|----------|--------|---------|
| **Cloudflare Pages** | ✅ Live | Production at wyattau.com |
| **GitHub Pages** | ⏳ Pending (enable in settings) | Backup + DA/DR |
| **Netlify** | ⏳ Pending (auth token needed) | Backup + DA |
| **Forgejo CI** | ✅ Active | Primary dev pipeline |
| **GitHub Actions** | ✅ Active | GitHub Pages + Netlify deploy |

### WASM Version: v=j44 (29 exported functions, 60 tests passing)

# Phase 5: Adversarial Loop — Prototype Results Summary

## Overview

Phase 5 defined the adversarial test plan and HAL mock API specification for the Hydrated Personal Site migration from Leptos 0.8 to Astro 5 + SolidJS 1.9.

## Critical Path Risks Identified

| CPR | Risk | Severity | Test Scenarios | Property Tests | Fuzz Scenarios |
|-----|------|----------|----------------|----------------|----------------|
| CPR-1 | SolidJS hydration failure with Astro | High | 6 | 3 | — |
| CPR-2 | WASM widget loading race conditions | High | 8 | 2 | 8 |
| CPR-3 | CustomEvent bridge reliability | Medium | 7 | 2 | — |
| CPR-4 | uPlot candlestick rendering correctness | Medium | 8 | 2 | — |
| CPR-5 | Leaflet.js integration with SolidJS | Medium | 8 | 2 | — |
| CPR-6 | CF Worker API compatibility | High | 8 | — | 16 |
| **Total** | | | **45** | **11** | **24** |

## Adversarial Test Coverage

### CPR-1: SolidJS Hydration (6 scenarios)
- JS-disabled fallback
- Rapid theme toggle during load
- Multi-tab hydration independence
- SPA navigation re-initialization
- Slow network skeleton states
- noscript query param handling

### CPR-2: WASM Race Conditions (8 scenarios)
- Rapid scroll through multiple widgets
- Mid-load navigation abort
- Duplicate widget IDs
- Network failure error boundaries
- init() exception handling
- Pre-DOM-ready observer firing
- WASM cache version mismatch
- Cold-start API retry

### CPR-3: CustomEvent Bridge (7 scenarios)
- Null detail payload
- Mismatched series length
- Pre-initialization event dispatch
- Pre-mount listener attachment
- Listener leak on unmount
- High-frequency event debouncing
- Cross-thread (Web Worker) events

### CPR-4: uPlot Rendering (8 scenarios)
- Single data point
- 10,000 data point performance
- Weekend/holiday data gaps
- Rapid timeframe switching
- Edge crosshair clipping
- NaN/null value handling
- Responsive container resize
- Timezone offset correctness

### CPR-5: Leaflet Integration (8 scenarios)
- Mount in SolidJS component
- Unmount cleanup
- 500 marker performance
- Popup lifecycle
- Window resize handling
- Hidden container rendering
- Dual map instances
- CSS load timing

### CPR-6: CF Worker Compatibility (8 scenarios)
- Missing API key
- Unauthorized guestbook POST
- Rate limit enforcement
- USGS outage fallback
- Invalid query params
- Invalid bearer token
- KV unavailability
- Malformed upstream JSON

## Fuzzing Strategy

### API Endpoint Fuzzing (24 scenarios)
- Random query parameters (SQL injection, XSS, empty, null, unicode)
- Range value fuzzing (negative, float, string)
- Concurrent request race conditions
- Missing required parameters
- Content-Type mismatch
- Timeout simulation

### Guestbook Input Fuzzing (16 scenarios)
- XSS payloads in name/message
- SQL injection in name
- Unicode edge cases (\u0000, \uFFFF)
- Length boundary testing (0, 1, 100, 10000, 10001)
- Binary byte injection
- Empty/whitespace-only fields
- Rate limiting boundary (5 in 10min)
- Honeypot field detection
- Missing/invalid auth tokens

## Property-Based Tests

| # | Property | Library |
|---|----------|---------|
| 1 | Theme persistence across reloads | fast-check |
| 2 | Valid HTML output for all pages | fast-check |
| 3 | Semantic HTML for UI components | fast-check |
| 4 | Concurrent WASM widget rendering | fast-check |
| 5 | Loading states for all network conditions | fast-check |
| 6 | Event dispatch/listen roundtrip | fast-check |
| 7 | Listener cleanup on unmount | fast-check |
| 8 | Candlestick OHLC invariants | fast-check |
| 9 | Monotonic time in candle data | fast-check |
| 10 | Map center/zoom correctness | fast-check |
| 11 | Marker pixel positioning | fast-check |

## HAL Mock API

### Endpoints Covered (20+)
- `/api/health` — Health check with degradation simulation
- `/api/crypto-ticker` — 3-symbol crypto prices with freshness simulation
- `/api/stock-chart` — OHLC candlestick data with timezone handling
- `/api/coingecko-global` — Market cap, dominance, volume
- `/api/earthquakes` — USGS earthquake events with coordinates
- `/api/fear-greed` — Crypto sentiment index
- `/api/kp-index` — NOAA geomagnetic activity
- `/api/mempool` — BTC mempool fee estimates
- `/api/binance-klines` — Price history candlestick data
- `/api/hacker-news` — Top HN stories
- `/api/github-trending` — Trending repositories
- `/api/llm-benchmarks` — LLM performance data
- `/api/exchange-rates` — Currency conversion rates
- `/api/fred` — Federal Reserve economic data
- `/api/guestbook` — GET/POST/DELETE with rate limiting
- `/api/weather` — Open-Meteo weather data

### Error Simulation
- 500 Internal Server Error
- 503 Service Unavailable (upstream down)
- 504 Gateway Timeout
- 429 Rate Limited
- 400 Bad Request (validation)
- 401 Unauthorized
- 404 Not Found

### Data Freshness Simulation
- Fresh responses (within cache TTL)
- Stale responses (past cache TTL)
- Configurable stale probability per endpoint

## Testing Infrastructure

| Tool | Purpose |
|------|---------|
| fast-check | Property-based testing for TypeScript |
| Vitest | Unit and integration tests |
| Playwright | E2E browser tests |
| FFUF | HTTP API fuzzing |
| Cargo fuzz | Rust WASM memory safety |
| axe-core | Accessibility testing |
| Lighthouse CI | Performance testing |

## Artifacts Produced

| File | Purpose |
|------|---------|
| `.specs/06_prototypes/prototype_test_plan.md` | Adversarial test scenarios per CPR |
| `.specs/06_prototypes/hal_mock_api.md` | Mock API responses for all endpoints |
| `.reports/phase_05_prototype_results.md` | This summary |

## Next Steps

1. Implement HAL mock server using `msw` for browser tests
2. Write property-based tests using `fast-check`
3. Set up Cargo fuzz for WASM widgets
4. Implement adversarial test scenarios in Playwright
5. Integrate fuzzing into nightly CI pipeline

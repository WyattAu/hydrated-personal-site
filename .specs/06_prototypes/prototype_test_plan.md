# Phase 5: Adversarial Loop — Prototype Test Plan

## Critical Path Risks (CPRs)

### CPR-1: SolidJS Hydration Failure with Astro

**Risk**: SolidJS islands fail to hydrate, leaving static HTML shells with no interactivity. Astro's `client:load` directive misconfigurations can cause double-rendering or hydration mismatches.

**Adversarial Test Scenarios**:

| # | Scenario | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 1.1 | Navigate to `/world` with JS disabled | Static fallback content renders | Page shows "JavaScript required" message, no blank areas |
| 1.2 | Rapid theme toggle (50ms intervals) during page load | Theme switches without flash-of-unstyled-content | No FOUC, localStorage updated atomically |
| 1.3 | Open `/world` in two browser tabs simultaneously | Both tabs hydrate independently | No shared state conflicts, each tab renders map |
| 1.4 | Navigate from `/` to `/world` via SPA-style link | SolidJS re-initializes on new page | Map loads, metric cards animate, no console errors |
| 1.5 | Hydrate with slow network (3G throttled) | Skeleton states visible during hydration | Loading indicators resolve within 5s |
| 1.6 | Load page with `?noscript=1` query param | Server-rendered content only | No hydration attempted, no JS errors |

**Property-Based Tests** (fast-check):
```
Prop 1: forall theme in [midnight-navy, tokyo-night, arctic-dawn, solaris, light],
  setting theme to X and reloading preserves X in localStorage.

Prop 2: forall page in [/, /world, /etf, /guestbook, /projects, /dossier, /docs, /uses],
  navigating to page produces valid HTML with <title>, <meta description>, <main>.

Prop 3: forall components in [ThemeToggle, CommandPalette, TickerBar],
  rendering component produces DOM node with aria-role or semantic HTML.
```

---

### CPR-2: WASM Widget Loading Race Conditions

**Risk**: IntersectionObserver triggers multiple WASM loads simultaneously, or a widget loads after its container is removed (SPA navigation). WASM `init()` called before module is ready.

**Adversarial Test Scenarios**:

| # | Scenario | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 2.1 | Scroll rapidly through page with 4+ WASM widgets | Widgets load in order, no OOM | All visible widgets initialize, no crash |
| 2.2 | Navigate away from page mid-WASM-load | Abort controller cancels pending loads | No memory leak, no console error |
| 2.3 | Load same widget twice on same page (duplicate IDs) | Second instance gets unique ID or skips | No duplicate init, no DOM collision |
| 2.4 | WASM module fails to download (network error) | Error boundary catches, skeleton remains | Fallback UI shown, error logged to console |
| 2.5 | WASM module loads but `init()` throws | Error boundary catches, widget unmounts | Graceful degradation, no crash |
| 2.6 | IntersectionObserver fires before DOM is ready | Observer waits for readyState === 'complete' | No null reference errors |
| 2.7 | Two users load same page, WASM cache differs (version bump) | New WASM version loads, old cache invalid | Service worker serves correct version |
| 2.8 | Widget requests API data while CF Worker is cold-starting | Retry with exponential backoff | Data loads within 10s, no spinner stuck |

**Property-Based Tests**:
```
Prop 4: forall widgetIds in subsets of {w1, w2, ..., w13} where |subset| >= 1,
  loading subset concurrently results in each widget rendering its canvas.

Prop 5: forall networkConditions in [fast, slow, offline],
  loading any widget shows loading state then either renders or shows error.
```

**Fuzzing Strategy — API Endpoints**:
- Randomize query parameters: `?symbol=AAPL&range=1y` → fuzz `symbol` with SQL injection, XSS, empty, null, unicode
- Randomize range values: `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `5y`, `max`, negative, float, string
- Send concurrent requests to same endpoint (race condition detection)
- Send requests with missing required params
- Send requests with Content-Type mismatch (POST with text/html)
- Timeout simulation: delay upstream response by 30s

---

### CPR-3: CustomEvent Bridge Reliability

**Risk**: SolidJS dispatches events that vanilla JS/uPlot/Leaflet doesn't receive, or event detail payloads are malformed. Event listener leaks when components unmount.

**Adversarial Test Scenarios**:

| # | Scenario | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 3.1 | Dispatch `chart:update` with null detail | Chart ignores, no crash | No TypeError, chart retains previous state |
| 3.2 | Dispatch `chart:update` with mismatched series length | Chart handles gracefully | Chart shows available data, warns in console |
| 3.3 | Dispatch `wasm:update` before WASM is initialized | Event queued or dropped | No "Cannot send to uninitialized WASM" error |
| 3.4 | Listen for `chart:click` but chart is not yet mounted | Listener attaches, fires when ready | No null reference on first click |
| 3.5 | Component unmounts without removing event listener | Listener still fires but target is null | No memory leak, no "detached element" error |
| 3.6 | Dispatch same event 100 times in 1s (debounce test) | Handler called max ~10 times | No performance degradation, DOM stable |
| 3.7 | Event dispatched from WASM thread (Web Worker) | Main thread receives event | Cross-thread communication works |

**Property-Based Tests**:
```
Prop 6: forall events in [chart:update, chart:click, wasm:update, wasm:result],
  dispatching event with valid detail and listener attached results in handler called.

Prop 7: forall component lifecycles in [mount, unmount, remount],
  event listeners are properly cleaned up on unmount.
```

---

### CPR-4: uPlot Candlestick Rendering Correctness

**Risk**: Custom candlestick extension renders incorrect OHLC data, misaligned time axes, or missing data points for timezones. uPlot's strict array format requirements cause silent failures.

**Adversarial Test Scenarios**:

| # | Scenario | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 4.1 | Render candlestick with single data point | Shows one candle, no crash | Single candle visible with correct OHLC |
| 4.2 | Render with 10,000 data points (max range) | Renders within 100ms, smooth scroll | No frame drops, correct candle alignment |
| 4.3 | Data has gaps (weekends, holidays for crypto) | Gaps shown or candles contiguous | No missing candles in visible range |
| 4.4 | Switch timeframe 1d→1y rapidly (5 switches) | Chart re-renders without stacking | Previous chart destroyed, new one mounted |
| 4.5 | Hover crosshair at chart edges | Crosshair clips correctly | No overflow outside chart bounds |
| 4.6 | Data has NaN or null values | Chart skips or interpolates | No crash, visual gap shown |
| 4.7 | Chart container is resized (responsive) | Chart re-fits to container | No horizontal scrollbar, candles resize |
| 4.8 | Render with timezone offset (UTC vs local) | Time labels correct for user TZ | No 1-day offset bug |

**Property-Based Tests**:
```
Prop 8: forall ohlcData arrays where length >= 1,
  rendering produces candles where high >= open, high >= close, low <= open, low <= close.

Prop 9: forall candle positions [0..N-1],
  candle[i].x <= candle[i+1].x (monotonic time).
```

---

### CPR-5: Leaflet.js Integration with SolidJS

**Risk**: Leaflet manages its own DOM tree inside a SolidJS-controlled container, causing hydration conflicts. Map markers and popups leak on component unmount.

**Adversarial Test Scenarios**:

| # | Scenario | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 5.1 | Mount Leaflet map in SolidJS component | Map renders in container div | Map tiles load, controls visible |
| 5.2 | Unmount map component (navigate away) | Leaflet instance destroyed | No lingering tile requests, no memory leak |
| 5.3 | Add 500 earthquake markers simultaneously | Markers cluster or render | No frame drop, markers clickable |
| 5.4 | Click marker, then unmount map | Popup destroyed with map | No orphaned popup DOM nodes |
| 5.5 | Resize window during map render | Map fits new container | No tile overlap, zoom controls repositioned |
| 5.6 | Map container has `display: none` initially | Map renders when shown | Tiles load on visibility change |
| 5.7 | Two map instances on same page | Both render independently | No shared state, independent zoom/pan |
| 5.8 | Map loads before Leaflet CSS is ready | Fallback or retry | No broken controls, tiles still load |

**Property-Based Tests**:
```
Prop 10: forall map center/zoom pairs,
  setting center and zoom produces map view containing the center point.

Prop 11: forall marker positions in valid lat/lng range,
  adding marker places it at correct pixel position (±2px tolerance).
```

---

### CPR-6: CF Worker API Compatibility

**Risk**: CF Worker response format differs between local dev (`wrangler dev`) and production, causing silent failures in SolidJS components. KV operations behave differently locally.

**Adversarial Test Scenarios**:

| # | Scenario | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 6.1 | Call `/api/crypto-ticker` with no upstream API key | Returns 503 with error body | JSON error body, no HTML |
| 6.2 | Call `/api/guestbook` POST without auth header | Returns 401 | JSON error body |
| 6.3 | Call `/api/guestbook` POST with 6th post in 10min | Returns 429 rate limit | JSON error with retry-after |
| 6.4 | Call `/api/earthquakes` during USGS outage | Returns cached data or 503 | Stale data served with stale indicator |
| 6.5 | Call `/api/stock-chart` with range=invalid | Returns 400 with validation error | JSON error body |
| 6.6 | Call `/api/guestbook` DELETE with invalid bearer token | Returns 401 | JSON error body |
| 6.7 | Call `/api/health` with KV unavailable | Returns degraded status | Health endpoint reports degraded |
| 6.8 | Call `/api/exchange-rates` with malformed JSON upstream | Returns 502 | JSON error body, upstream error logged |

**Fuzzing Strategy — Guestbook Input**:

| Fuzz Target | Input Type | Expected |
|-------------|-----------|----------|
| `name` field | XSS: `<script>alert(1)</script>` | Sanitized or rejected |
| `name` field | SQL injection: `'; DROP TABLE--` | Treated as literal string |
| `name` field | Unicode: `\u0000\uFFFF` | Stored or rejected (no crash) |
| `name` field | Length: 10,000 chars | Rejected (max 100) |
| `message` field | Empty string | Rejected (min 1 char) |
| `message` field | 10,001 chars | Rejected (max 10,000) |
| `message` field | Unicode emoji: `` | Stored as-is |
| `name` + `message` | Both empty | Rejected (400) |
| `name` + `message` | Both whitespace only | Rejected (400) |
| `name` + `message` | Binary bytes: `\x00\x01\x02` | Rejected or sanitized |
| Rate limiting | 5 rapid POSTs from same IP | 6th returns 429 |
| Rate limiting | 5 POSTs, wait 10min, 1 more | 6th succeeds |
| Honeypot field | `website` field filled | Silently dropped (spam) |
| Admin delete | DELETE without bearer token | 401 |
| Admin delete | DELETE with expired token | 401 |

---

## Testing Infrastructure

### Property-Based Testing Strategy

| Library | Language | Use Case |
|---------|----------|----------|
| fast-check | TypeScript | Component props, event payloads, data transforms |
| Vitest + @vitest/property | TypeScript | Schema validation, API response shapes |
| quickcheck (Rust) | Rust | WASM widget math functions (correlation, FFT) |

### Fuzzing Tools

| Tool | Target | Method |
|------|--------|--------|
| `wrangler dev --test` | CF Worker | HTTP fuzzer for all endpoints |
| Playwright + custom script | Frontend | Random navigation, rapid clicks |
| Cargo fuzz | Rust WASM | Memory safety, edge cases |
| FFUF | CF Worker API | Parameter fuzzing, wordlist-based |

### Test Execution Plan

```
1. Unit tests (Vitest)          → runs on every commit
2. Property tests (fast-check)  → runs on every PR
3. API fuzzing (FFUF)           → runs nightly
4. WASM fuzzing (cargo fuzz)    → runs on every PR
5. E2E tests (Playwright)       → runs on every PR
6. Visual regression            → runs on every PR
7. Accessibility (axe-core)     → runs on every PR
8. Performance (Lighthouse CI)  → runs on every PR
```

---

## Acceptance Criteria

- [ ] All 6 CPRs have ≥ 5 adversarial test scenarios each
- [ ] Property-based tests defined for data transforms
- [ ] API fuzzing covers all 20+ endpoints
- [ ] Guestbook fuzzing covers 12+ input scenarios
- [ ] Test execution plan documented with tooling
- [ ] Error boundaries tested for all failure modes

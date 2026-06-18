# BP-CF-WORKER-001: CF Worker API Layer

**IEEE 1016 Software Design Description**

| Field | Value |
|-------|-------|
| ID | BP-CF-WORKER-001 |
| Title | CF Worker API Layer — Proxy, KV, Security |
| Status | Approved |
| Version | 1.0.0 |
| Date | 2026-06-17 |
| Author | Construct (Systems Architect) |
| Priority | Critical |
| Layer | Infrastructure |

---

## BP-1: Design Overview

### 1.1 System Purpose

The CF Worker API Layer provides a framework-agnostic proxy layer that sits between the browser and 20+ external APIs. It handles CORS, rate limiting, caching, security headers, and KV-backed persistence for the guestbook. The Worker is completely independent of the frontend framework (no Leptos/Solid dependency).

### 1.2 Scope

**In scope:**
- 20+ API proxy endpoints
- KV storage (guestbook, rate limiting, RUM)
- Security headers injection (CSP, HSTS, etc.)
- Rate limiting (guestbook: 5 posts/IP/10min)
- Bearer token authentication (admin operations)
- Caching strategies per endpoint
- Error handling and logging

**Out of scope:**
- Static asset serving (→ CF Pages)
- Client-side data fetching (→ BP-SOLIDJS-COMPONENTS-001)
- WASM compilation (→ BP-WASM-WIDGETS-001)

### 1.3 Stakeholders

| Stakeholder | Concern |
|-------------|---------|
| Wyatt Au | API reliability, security, cost |
| Browser clients | Fast responses, CORS |
| External APIs | Rate limit compliance |

### 1.4 Context Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser    │────▶│  CF Worker API   │────▶│  External APIs  │
│  (SolidJS)   │◀────│  (20+ endpoints) │◀────│  (Yahoo, USGS,  │
│              │     │                  │     │   CoinGecko...)  │
└─────────────┘     └────────┬─────────┘     └─────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │    CF KV Store    │
                     │  (guestbook,      │
                     │   rate limits,    │
                     │   RUM data)       │
                     └──────────────────┘
```

---

## BP-2: Design Decomposition

### 2.1 Component Hierarchy

```
worker/src/index.ts
├── Router (URL pattern matching)
├── Security Headers Middleware
├── Rate Limiter (KV-backed)
├── API Handlers
│   ├── /api/health ─────────── Health check
│   ├── /api/weather ────────── Open-Meteo weather proxy
│   ├── /api/stock-chart ────── Yahoo Finance chart proxy
│   ├── /api/crypto-ticker ──── Binance price proxy
│   ├── /api/coingecko-global ─ CoinGecko global data
│   ├── /api/earthquakes ────── USGS earthquake data
│   ├── /api/fear-greed ─────── Crypto Fear & Greed Index
│   ├── /api/kp-index ───────── NOAA Kp index
│   ├── /api/mempool ────────── BTC mempool fees
│   ├── /api/binance-klines ─── Price history (via Yahoo)
│   ├── /api/hacker-news ────── HN top stories
│   ├── /api/github-trending ── GitHub trending repos
│   ├── /api/llm-benchmarks ── LLM benchmark data
│   ├── /api/guestbook ──────── Guestbook CRUD
│   ├── /api/exchange-rates ─── Currency exchange rates
│   ├── /api/fred ───────────── Federal Reserve data
│   └── /api/vitals ─────────── RUM vitals collection
├── KV Operations
│   ├── Guestbook CRUD
│   ├── Rate limit checks
│   └── RUM data aggregation
└── Error Handler
```

### 2.2 Dependency Graph

```
index.ts
  ├── Router
  │   ├── SecurityHeaders (all routes)
  │   └── RateLimiter (guestbook routes)
  ├── API Handlers (20+)
  │   ├── Cache Layer (per-endpoint TTL)
  │   └── External API Clients
  └── KV Bindings
      ├── GUESTBOOK_KV
      ├── RATE_LIMIT_KV
      └── RUM_KV
```

### 2.3 Coupling Metrics

| Interface | Type | Coupling Level |
|-----------|------|----------------|
| Worker → External APIs | HTTP fetch | Low (framework-agnostic) |
| Worker → KV | Native binding | Tight (CF-specific) |
| Worker → Browser | HTTP response | Low (JSON API) |
| Security Headers → All routes | Middleware | Low |

---

## BP-3: Design Rationale

### 3.1 Why a Separate Worker?

**Decision**: Keep the CF Worker as a standalone, framework-agnostic API layer.

**Rationale**:
1. **No framework lock-in** — The Worker doesn't depend on Leptos, Solid, or any frontend
2. **Independent deployment** — Worker can be updated without rebuilding the site
3. **CORS isolation** — All external API calls go through the Worker, no CORS issues in browser
4. **Rate limiting** — Centralized rate limiting in one place
5. **Security headers** — Injected at the Worker level, not per-framework

### 3.2 Why KV for Guestbook?

KV provides:
- Global replication (reads are fast worldwide)
- Eventual consistency (acceptable for guestbook)
- Simple API (get/put/delete)
- Built-in TTL for rate limiting

### 3.3 Caching Strategy Rationale

| Endpoint Category | TTL | Strategy | Rationale |
|-------------------|-----|----------|-----------|
| Real-time (crypto, mempool) | 10s-1min | Short cache | Data changes rapidly |
| Near-real-time (earthquakes, weather) | 5min | Medium cache | Data updates periodically |
| Slow-changing (HN, GitHub, LLM) | 5min-6h | Long cache | Data changes infrequently |
| Static (benchmarks, FRED) | 1h-6h | Very long cache | Data is historical |
| Guestbook | None | No cache | Must be real-time |

---

## BP-4: Traceability

### 4.1 Requirements → Design Mapping

| Requirement | Design Element |
|-------------|----------------|
| FR-2.3: 20+ API endpoints | API handler functions |
| FR-2.2.5: Guestbook with rate limiting | KV-backed CRUD + rate limiter |
| FR-3.4: Security headers | SecurityHeaders middleware |
| FR-3.5: Reliability (error boundaries) | Graceful error handling |
| FR-4.1: CF Workers for API proxying | Worker architecture |
| FR-4.3: Aggressive caching | Per-endpoint cache TTL |

### 4.2 Design → ADR Mapping

| Design Decision | ADR |
|-----------------|-----|
| CF Workers for API proxy | ADR-004 |
| KV for guestbook | ADR-004 |
| Rate limiting | ADR-004 |
| Security headers | ADR-004 |

---

## BP-5: Interface Design

### 5.1 Endpoint Contracts

#### `GET /api/health`
```yaml
Method: GET
Path: /api/health
Params: none
Response:
  status: 200
  body: { "status": "ok", "timestamp": number, "version": string }
Cache: none
Error codes: none (always 200)
```

#### `GET /api/weather`
```yaml
Method: GET
Path: /api/weather
Params:
  - lat: number (required) — Latitude
  - lon: number (required) — Longitude
  - units: string (optional, default "celsius") — "celsius" | "fahrenheit"
Response:
  status: 200
  body: { "temperature": number, "humidity": number, "windSpeed": number, "description": string, "icon": string }
Cache: 5min (stale-while-revalidate)
Error codes: 400 (missing params), 502 (upstream error), 429 (rate limit)
External: Open-Meteo API
```

#### `GET /api/stock-chart`
```yaml
Method: GET
Path: /api/stock-chart
Params:
  - symbol: string (required) — e.g. "AAPL", "BTC-USD"
  - range: string (optional, default "1d") — "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y"
  - interval: string (optional, default "auto") — "1m" | "5m" | "15m" | "1h" | "1d" | "1wk"
Response:
  status: 200
  body: { "symbol": string, "timestamps": number[], "opens": number[], "highs": number[], "lows": number[], "closes": number[], "volumes": number[] }
Cache: 2min (intraday) / 2h (daily+)
Error codes: 400 (invalid symbol), 404 (symbol not found), 502 (upstream error)
External: Yahoo Finance v8 API
```

#### `GET /api/crypto-ticker`
```yaml
Method: GET
Path: /api/crypto-ticker
Params:
  - symbols: string (optional, default "BTCUSDT,ETHUSDT") — Comma-separated
Response:
  status: 200
  body: [{ "symbol": string, "price": number, "change": number, "changePercent": number, "volume": number, "timestamp": number }]
Cache: 10s
Error codes: 502 (upstream error)
External: Binance API
```

#### `GET /api/coingecko-global`
```yaml
Method: GET
Path: /api/coingecko-global
Params: none
Response:
  status: 200
  body: { "totalMarketCap": { "usd": number }, "totalVolume": { "usd": number }, "btcDominance": number, "activeCryptos": number }
Cache: 5min
Error codes: 502 (upstream error)
External: CoinGecko API
```

#### `GET /api/earthquakes`
```yaml
Method: GET
Path: /api/earthquakes
Params:
  - minMagnitude: number (optional, default 4.5)
  - days: number (optional, default 7)
Response:
  status: 200
  body: { "earthquakes": [{ "id": string, "magnitude": number, "place": string, "time": number, "lat": number, "lng": number, "depth": number }] }
Cache: 5min
Error codes: 502 (upstream error)
External: USGS Earthquake API
```

#### `GET /api/fear-greed`
```yaml
Method: GET
Path: /api/fear-greed
Params: none
Response:
  status: 200
  body: { "value": number, "classification": string, "timestamp": number }
Cache: 5min
Error codes: 502 (upstream error)
External: alternative.me API
```

#### `GET /api/kp-index`
```yaml
Method: GET
Path: /api/kp-index
Params: none
Response:
  status: 200
  body: { "kpIndex": number, "timestamp": number }
Cache: 10min
Error codes: 502 (upstream error)
External: NOAA SWPC API
```

#### `GET /api/mempool`
```yaml
Method: GET
Path: /api/mempool
Params: none
Response:
  status: 200
  body: { "fees": { "fastestFee": number, "halfHourFee": number, "hourFee": number, "economyFee": number }, "timestamp": number }
Cache: 1min
Error codes: 502 (upstream error)
External: mempool.space API
```

#### `GET /api/binance-klines`
```yaml
Method: GET
Path: /api/binance-klines
Params:
  - symbol: string (required) — e.g. "BTCUSDT"
  - interval: string (optional, default "1d") — "1m" | "5m" | "15m" | "1h" | "1d" | "1wk"
  - limit: number (optional, default 100) — Max 1000
Response:
  status: 200
  body: [{ "openTime": number, "open": number, "high": number, "low": number, "close": number, "volume": number, "closeTime": number }]
Cache: 5min
Error codes: 400 (invalid params), 502 (upstream error)
External: Binance API (via Yahoo Finance proxy)
```

#### `GET /api/hacker-news`
```yaml
Method: GET
Path: /api/hacker-news
Params:
  - limit: number (optional, default 20) — Max 50
Response:
  status: 200
  body: [{ "id": number, "title": string, "url": string, "score": number, "by": string, "time": number, "descendants": number }]
Cache: 5min
Error codes: 502 (upstream error)
External: HN Firebase API
```

#### `GET /api/github-trending`
```yaml
Method: GET
Path: /api/github-trending
Params:
  - language: string (optional) — e.g. "rust", "typescript"
  - since: string (optional, default "daily") — "daily" | "weekly" | "monthly"
Response:
  status: 200
  body: [{ "name": string, "url": string, "description": string, "language": string, "stars": number, "forks": number, "todayStars": number }]
Cache: 30min
Error codes: 502 (upstream error)
External: GitHub Trending (scraped)
```

#### `GET /api/llm-benchmarks`
```yaml
Method: GET
Path: /api/llm-benchmarks
Params: none
Response:
  status: 200
  body: [{ "model": string, "provider": string, "scores": { [benchmark: string]: number }, "price": number, "speed": number }]
Cache: 6h
Error codes: 502 (upstream error)
External: Artificial Analysis API
```

#### `GET /api/exchange-rates`
```yaml
Method: GET
Path: /api/exchange-rates
Params:
  - base: string (optional, default "USD") — Base currency
Response:
  status: 200
  body: { "base": string, "rates": { [currency: string]: number }, "timestamp": number }
Cache: 1h
Error codes: 502 (upstream error)
External: exchangerate-api.com
```

#### `GET /api/fred`
```yaml
Method: GET
Path: /api/fred
Params:
  - series: string (required) — e.g. "GDP", "UNRATE", "CPIAUCSL"
  - limit: number (optional, default 100)
Response:
  status: 200
  body: { "series": string, "data": [{ "date": string, "value": number }] }
Cache: 1h
Error codes: 400 (invalid series), 502 (upstream error)
External: FRED API (Federal Reserve)
```

#### `GET/POST/DELETE /api/guestbook`
```yaml
# GET — List entries
Method: GET
Path: /api/guestbook
Params:
  - limit: number (optional, default 20)
  - offset: number (optional, default 0)
Response:
  status: 200
  body: { "entries": [{ "id": string, "name": string, "message": string, "timestamp": number }], "total": number }
Cache: none
Error codes: 500 (KV error)

# POST — Create entry
Method: POST
Path: /api/guestbook
Headers: Content-Type: application/json
Body: { "name": string, "message": string, "honeypot": string (must be empty) }
Response:
  status: 201
  body: { "id": string, "name": string, "message": string, "timestamp": number }
Cache: none
Error codes: 400 (validation error), 413 (message too long), 429 (rate limit: 5/IP/10min)

# DELETE — Admin delete
Method: DELETE
Path: /api/guestbook/:id
Headers: Authorization: Bearer <ADMIN_TOKEN>
Response:
  status: 200
  body: { "deleted": true }
Cache: none
Error codes: 401 (unauthorized), 404 (not found)
```

#### `POST /api/vitals`
```yaml
Method: POST
Path: /api/vitals
Body: { "ttfb": number, "lcp": number, "cls": number, "inp": number, "url": string }
Response:
  status: 204
Cache: none
Error codes: 400 (invalid data)
```

### 5.2 Error Response Schema

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 300 seconds.",
    "status": 429
  }
}
```

### 5.3 Security Headers

All responses include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.open-meteo.com https://query1.finance.yahoo.com https://api.binance.com https://api.coingecko.com https://earthquake.usgs.gov https://api.alternative.me https://services.swpc.noaa.gov https://mempool.space https://blockchain.info https://hacker-news.firebaseio.com https://api.github.com https://api.artificialanalysis.ai https://api.exchangerate-api.com https://api.stlouisfed.org; font-src 'self'; object-src 'none'; frame-ancestors 'none';
```

---

## BP-6: Data Design

### 6.1 KV Namespace Design

```
Namespace: GUESTBOOK_KV
├── Key format: "guestbook:{entryId}"
├── Value: GuestbookEntry JSON
├── TTL: none (permanent)
└── Operations: get, put, delete, list

Namespace: RATE_LIMIT_KV
├── Key format: "ratelimit:{ip}:{window}"
├── Value: { "count": number, "windowStart": number }
├── TTL: 600 seconds (10 min)
└── Operations: get, put

Namespace: RUM_KV
├── Key format: "rum:{date}:{metric}"
├── Value: { "count": number, "sum": number, "min": number, "max": number }
├── TTL: 2592000 (30 days)
└── Operations: get, put (atomic increment)
```

### 6.2 Data Models

```typescript
interface GuestbookEntry {
  id: string;        // UUID
  name: string;      // Max 50 chars
  message: string;   // Max 500 chars
  timestamp: number; // Unix timestamp (ms)
  deleted?: boolean; // Soft delete flag
}

interface RateLimitRecord {
  count: number;
  windowStart: number; // Unix timestamp (ms)
}

interface RUMMetric {
  count: number;
  sum: number;
  min: number;
  max: number;
}
```

### 6.3 Cache Key Design

```
Cache key format: "cache:{endpoint}:{params_hash}"
Cache value: { "data": any, "timestamp": number, "ttl": number }
TTL: Per-endpoint (see 5.1)
```

---

## BP-7: Component Design

### 7.1 Router

**Purpose**: URL pattern matching and request dispatching.

**Pattern**: Simple prefix matching with method detection.

```typescript
// Pseudocode
router.get('/api/health', healthHandler);
router.get('/api/weather', weatherHandler);
router.get('/api/stock-chart', stockChartHandler);
// ... 20+ routes

router.all('/api/*', securityHeadersMiddleware);
router.post('/api/guestbook', rateLimitMiddleware, guestbookCreateHandler);
router.delete('/api/guestbook/:id', authMiddleware, guestbookDeleteHandler);
```

### 7.2 Security Headers Middleware

**Purpose**: Inject security headers on all responses.

**Headers injected** (see 5.3).

### 7.3 Rate Limiter

**Purpose**: Limit guestbook submissions to 5 per IP per 10 minutes.

**Algorithm**: Fixed window counter with KV backing.

```
1. Extract client IP from request
2. Generate window key: "ratelimit:{ip}:{windowStart}"
3. Read count from KV
4. If count >= 5 → return 429
5. Increment count → write to KV
6. Continue to handler
```

### 7.4 Cache Layer

**Purpose**: Cache external API responses to reduce upstream calls.

**Strategy**: Stale-while-revalidate with per-endpoint TTL.

```
1. Generate cache key from endpoint + params
2. Read from KV
3. If cached and fresh → return cached
4. If cached and stale → return cached, fetch in background
5. If not cached → fetch, cache, return
```

### 7.5 Error Handler

**Purpose**: Consistent error responses across all endpoints.

**Pattern**:
```typescript
class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) { super(message); }
}

// Handler wraps all endpoints
function handleError(error: unknown): Response {
  if (error instanceof APIError) {
    return new Response(JSON.stringify({
      error: { code: error.code, message: error.message, status: error.status }
    }), { status: error.status });
  }
  return new Response(JSON.stringify({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 }
  }), { status: 500 });
}
```

---

## BP-8: Deployment

### 8.1 Worker Configuration

```toml
# worker/wrangler.toml
name = "hydrated-site-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

kv_namespaces = [
  { binding = "GUESTBOOK_KV", id = "..." },
  { binding = "RATE_LIMIT_KV", id = "..." },
  { binding = "RUM_KV", id = "..." }
]

[vars]
ADMIN_TOKEN = "..."  # Set via secrets
```

### 8.2 Deployment Flow

```
1. wrangler deploy (Worker)
2. wrangler pages deploy (Static site)
3. Verify: curl /api/health → {"status":"ok"}
```

### 8.3 Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `ADMIN_TOKEN` | Bearer token for admin ops | `wrangler secret put` |
| `AA_API_KEY` | Artificial Analysis API | `wrangler secret put` |
| `FRED_API_KEY` | Federal Reserve API | `wrangler secret put` |

---

## BP-9: Compliance

### 9.1 Security Compliance

| Header | Value | Purpose |
|--------|-------|---------|
| HSTS | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| X-Content-Type-Options | `nosniff` | Prevent MIME sniffing |
| X-Frame-Options | `DENY` | Prevent clickjacking |
| COOP | `same-origin` | Isolate browsing context |
| COEP | `credentialless` | Cross-origin isolation |
| Referrer-Policy | `strict-origin-when-cross-origin` | Limit referrer data |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | Disable features |
| CSP | See 5.3 | Content Security Policy |

### 9.2 Rate Limiting Compliance

| Endpoint | Limit | Window | Action |
|----------|-------|--------|--------|
| POST /api/guestbook | 5 requests | 10 minutes | 429 Too Many Requests |
| All other endpoints | None | — | Cached per-endpoint |

### 9.3 Error Handling Compliance

| Error Type | Status Code | Response Format |
|------------|-------------|-----------------|
| Missing params | 400 | `{ error: { code, message, status } }` |
| Unauthorized | 401 | `{ error: { code, message, status } }` |
| Rate limited | 429 | `{ error: { code, message, status } }` |
| Upstream error | 502 | `{ error: { code, message, status } }` |
| Internal error | 500 | `{ error: { code, message, status } }` |

---

## BP-10: Quality Checklist

- [ ] All 20+ endpoints respond correctly
- [ ] Health check returns `{"status":"ok"}`
- [ ] Weather endpoint proxies Open-Meteo
- [ ] Stock chart endpoint proxies Yahoo Finance
- [ ] Crypto ticker endpoint proxies Binance
- [ ] CoinGecko global endpoint works
- [ ] Earthquakes endpoint proxies USGS
- [ ] Fear & Greed endpoint works
- [ ] Kp index endpoint proxies NOAA
- [ ] Mempool endpoint proxies mempool.space
- [ ] Binance klines endpoint works
- [ ] Hacker News endpoint proxies HN Firebase
- [ ] GitHub trending endpoint works
- [ ] LLM benchmarks endpoint works
- [ ] Exchange rates endpoint works
- [ ] FRED endpoint works
- [ ] Guestbook CRUD works (create, read, delete)
- [ ] Rate limiting works (5/IP/10min)
- [ ] Bearer token auth works for admin delete
- [ ] Security headers present on all responses
- [ ] CSP header is correct and complete
- [ ] Error responses are consistent and informative
- [ ] Caching works per-endpoint TTL
- [ ] KV operations work (guestbook, rate limit)
- [ ] RUM vitals collection works
- [ ] No sensitive data in error messages
- [ ] CORS headers are correct
- [ ] Build completes without errors

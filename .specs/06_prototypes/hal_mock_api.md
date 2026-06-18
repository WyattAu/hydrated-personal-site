# Phase 5: HAL Mock API Specification

## Overview

Mock API layer for offline development, CI testing, and frontend prototyping without upstream dependencies. All endpoints return realistic data matching production response schemas.

---

## Base URL & Configuration

```yaml
mock_api:
  base_url: http://localhost:8787
  delay_simulation: 0-500ms (configurable)
  error_rate: 0-100% (configurable)
  stale_probability: 0-50% (configurable)
  port: 8787
```

---

## Endpoint Mock Responses

### GET /api/health

**Success Response (200)**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-06-17T12:00:00Z",
  "services": {
    "kv": "operational",
    "upstream_apis": "operational"
  }
}
```

**Error Scenarios**:
| Scenario | Response | Header |
|----------|----------|--------|
| KV unavailable | `{"status": "degraded", "services": {"kv": "unavailable"}}` | 503 |
| Cold start | `{"status": "starting", "version": "1.0.0"}` | 200 |

---

### GET /api/crypto-ticker

**Query Params**: `symbols` (optional, comma-separated, default: BTC,ETH,SOL)

**Success Response (200)**:
```json
{
  "data": [
    {
      "symbol": "BTC",
      "price": 104235.67,
      "change24h": 2.34,
      "changePercent24h": 2.34,
      "high24h": 105000.00,
      "low24h": 101500.00,
      "volume24h": 28500000000,
      "marketCap": 2050000000000,
      "lastUpdate": "2026-06-17T12:00:00Z"
    },
    {
      "symbol": "ETH",
      "price": 3845.12,
      "change24h": -1.23,
      "changePercent24h": -1.23,
      "high24h": 3900.00,
      "low24h": 3800.00,
      "volume24h": 15000000000,
      "marketCap": 462000000000,
      "lastUpdate": "2026-06-17T12:00:00Z"
    },
    {
      "symbol": "SOL",
      "price": 178.45,
      "change24h": 5.67,
      "changePercent24h": 5.67,
      "high24h": 180.00,
      "low24h": 170.00,
      "volume24h": 3200000000,
      "marketCap": 78000000000,
      "lastUpdate": "2026-06-17T12:00:00Z"
    }
  ],
  "timestamp": "2026-06-17T12:00:00Z"
}
```

**Error Scenarios**:
| Scenario | Response | Status |
|----------|----------|--------|
| Binance API down | `{"error": "upstream_unavailable", "retryAfter": 30}` | 503 |
| Invalid symbol | `{"error": "invalid_symbol", "symbol": "INVALID"}` | 400 |
| Rate limited by upstream | `{"error": "rate_limited", "retryAfter": 60}` | 429 |

**Data Freshness Simulation**:
- Fresh: `lastUpdate` within 10 seconds
- Stale: `lastUpdate` 30-120 seconds old (triggers stale indicator)
- Configurable via `?stale=true` query param

---

### GET /api/stock-chart

**Query Params**: `symbol` (required), `range` (1d|5d|1mo|3mo|6mo|1y|5y|max), `interval` (auto|1m|5m|15m|1h|1d|1wk|1mo)

**Success Response (200)**:
```json
{
  "symbol": "AAPL",
  "range": "1y",
  "data": {
    "timestamps": [1687000000, 1687086400, 1687172800],
    "open": [185.20, 186.50, 187.30],
    "high": [187.00, 188.20, 189.10],
    "low": [184.50, 185.80, 186.90],
    "close": [186.80, 187.90, 188.50],
    "volume": [52000000, 48000000, 55000000]
  },
  "meta": {
    "currency": "USD",
    "exchange": "NASDAQ",
    "instrumentType": "EQUITY"
  }
}
```

**Error Scenarios**:
| Scenario | Response | Status |
|----------|----------|--------|
| Symbol not found | `{"error": "symbol_not_found", "symbol": "FAKE"}` | 404 |
| Invalid range | `{"error": "invalid_range", "valid": ["1d","5d","1mo","3mo","6mo","1y","5y","max"]}` | 400 |
| Yahoo Finance down | `{"error": "upstream_unavailable", "retryAfter": 120}` | 503 |
| Weekend/holiday data | Returns previous trading day data | 200 |

---

### GET /api/coingecko-global

**Success Response (200)**:
```json
{
  "data": {
    "total_market_cap": {"usd": 3800000000000},
    "total_volume": {"usd": 120000000000},
    "btc_dominance": 52.3,
    "eth_dominance": 16.8,
    "active_cryptos": 12500,
    "market_cap_change_24h": 2.5,
    "market_cap_change_percentage_24h": 2.5
  },
  "timestamp": "2026-06-17T12:00:00Z"
}
```

---

### GET /api/earthquakes

**Query Params**: `minMagnitude` (default: 4.0), `days` (default: 7)

**Success Response (200)**:
```json
{
  "earthquakes": [
    {
      "id": "us7000abc1",
      "magnitude": 5.2,
      "place": "120km SE of Tokyo, Japan",
      "time": "2026-06-17T11:30:00Z",
      "coordinates": {"lat": 34.5, "lng": 139.8},
      "depth": 35.2,
      "tsunami": false,
      "felt": 1200,
      "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc1"
    },
    {
      "id": "us7000abc2",
      "magnitude": 6.1,
      "place": "50km SW of Lima, Peru",
      "time": "2026-06-17T08:15:00Z",
      "coordinates": {"lat": -12.5, "lng": -77.2},
      "depth": 22.0,
      "tsunami": false,
      "felt": 5400,
      "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc2"
    }
  ],
  "metadata": {
    "count": 2,
    "generated": "2026-06-17T12:00:00Z",
    "api": "USGS GeoJSON"
  }
}
```

**Error Scenarios**:
| Scenario | Response | Status |
|----------|----------|--------|
| USGS API timeout | `{"error": "upstream_timeout", "retryAfter": 300}` | 504 |
| Invalid minMagnitude | Returns default (4.0) with warning | 200 |

---

### GET /api/fear-greed

**Success Response (200)**:
```json
{
  "data": {
    "value": 72,
    "value_classification": "Greed",
    "timestamp": "2026-06-17T00:00:00Z",
    "previous_close": 68,
    "previous_classification": "Greed",
    "one_week_ago": 55,
    "one_month_ago": 45
  }
}
```

---

### GET /api/kp-index

**Success Response (200)**:
```json
{
  "data": {
    "kp_index": 4.2,
    "kp_index_label": "Active",
    "timestamp": "2026-06-17T12:00:00Z",
    "forecast_3hr": 3.8,
    "forecast_24hr": 3.5,
    "source": "NOAA"
  }
}
```

---

### GET /api/mempool

**Success Response (200)**:
```json
{
  "data": {
    "fastestFee": 15,
    "halfHourFee": 12,
    "hourFee": 8,
    "economyFee": 5,
    "minimumFee": 1,
    "timestamp": "2026-06-17T12:00:00Z"
  }
}
```

---

### GET /api/binance-klines

**Query Params**: `symbol` (default: BTCUSDT), `interval` (1m|5m|15m|1h|4h|1d), `limit` (default: 500)

**Success Response (200)**:
```json
{
  "symbol": "BTCUSDT",
  "interval": "1d",
  "klines": [
    {
      "openTime": 1687000000000,
      "open": 104000.00,
      "high": 105200.00,
      "low": 103500.00,
      "close": 104500.00,
      "volume": 28500.5,
      "closeTime": 1687086399999,
      "quoteVolume": 2978250000.00,
      "trades": 1500000
    }
  ]
}
```

---

### GET /api/hacker-news

**Query Params**: `count` (default: 30)

**Success Response (200)**:
```json
{
  "stories": [
    {
      "id": 40000001,
      "title": "Show HN: Building a personal site with Astro and SolidJS",
      "url": "https://example.com/article",
      "score": 256,
      "by": "pg",
      "time": "2026-06-17T10:00:00Z",
      "descendants": 89,
      "type": "story"
    }
  ],
  "timestamp": "2026-06-17T12:00:00Z"
}
```

---

### GET /api/github-trending

**Query Params**: `language` (optional), `since` (daily|weekly|monthly, default: daily)

**Success Response (200)**:
```json
{
  "repos": [
    {
      "name": "user/repo",
      "description": "A revolutionary new framework",
      "language": "TypeScript",
      "languageColor": "#3178c6",
      "stars": 15000,
      "starsToday": 500,
      "forks": 2000,
      "builtBy": ["user1", "user2"]
    }
  ],
  "timestamp": "2026-06-17T12:00:00Z"
}
```

---

### GET /api/llm-benchmarks

**Success Response (200)**:
```json
{
  "models": [
    {
      "name": "GPT-5",
      "provider": "OpenAI",
      "intelligence": 95.2,
      "speed": 85.0,
      "pricePer1MInput": 10.00,
      "pricePer1MOutput": 30.00,
      "contextWindow": 1000000,
      "mmlu": 92.0,
      "humaneval": 95.0
    },
    {
      "name": "Claude 4 Opus",
      "provider": "Anthropic",
      "intelligence": 94.8,
      "speed": 80.0,
      "pricePer1MInput": 15.00,
      "pricePer1MOutput": 75.00,
      "contextWindow": 500000,
      "mmlu": 91.5,
      "humaneval": 94.0
    }
  ],
  "timestamp": "2026-06-17T12:00:00Z"
}
```

---

### GET /api/exchange-rates

**Query Params**: `base` (default: USD)

**Success Response (200)**:
```json
{
  "base": "USD",
  "rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 157.50,
    "CAD": 1.36,
    "AUD": 1.52,
    "CHF": 0.88,
    "CNY": 7.25,
    "HKD": 7.82
  },
  "timestamp": "2026-06-17T12:00:00Z"
}
```

---

### GET /api/fred

**Query Params**: `series` (required, e.g., GDP, CPIAUCSL, FEDFUNDS)

**Success Response (200)**:
```json
{
  "series": "FEDFUNDS",
  "data": [
    {"date": "2026-05-01", "value": 4.50},
    {"date": "2026-04-01", "value": 4.50},
    {"date": "2026-03-01", "value": 4.50}
  ],
  "meta": {
    "title": "Federal Funds Effective Rate",
    "units": "Percent",
    "frequency": "Monthly"
  }
}
```

**Error Scenarios**:
| Scenario | Response | Status |
|----------|----------|--------|
| Missing series param | `{"error": "missing_series", "valid": ["GDP","CPIAUCSL","FEDFUNDS","UNRATE"]}` | 400 |
| Invalid series | `{"error": "invalid_series"}` | 400 |
| FRED API key invalid | `{"error": "unauthorized"}` | 401 |

---

### POST /api/guestbook

**Request Body**:
```json
{
  "name": "string (1-100 chars)",
  "message": "string (1-10000 chars)",
  "website": "" // honeypot field, must be empty
}
```

**Success Response (201)**:
```json
{
  "id": "g_abc123",
  "name": "Wyatt",
  "message": "Hello from the guestbook!",
  "created_at": "2026-06-17T12:00:00Z",
  "ip_hash": "sha256:abc..."
}
```

**Error Scenarios**:
| Scenario | Response | Status |
|----------|----------|--------|
| Rate limited | `{"error": "rate_limited", "retryAfter": 600}` | 429 |
| Missing name | `{"error": "validation", "field": "name", "message": "Required"}` | 400 |
| Name too long | `{"error": "validation", "field": "name", "message": "Max 100 chars"}` | 400 |
| Message empty | `{"error": "validation", "field": "message", "message": "Min 1 char"}` | 400 |
| Message too long | `{"error": "validation", "field": "message", "message": "Max 10000 chars"}` | 400 |
| Honeypot filled | Silently dropped, returns 201 (fake success) | 201 |
| KV unavailable | `{"error": "storage_unavailable"}` | 503 |
| XSS in name | Stored sanitized, rendered escaped | 201 |

---

### GET /api/guestbook

**Success Response (200)**:
```json
{
  "entries": [
    {
      "id": "g_abc123",
      "name": "Wyatt",
      "message": "Hello from the guestbook!",
      "created_at": "2026-06-17T12:00:00Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

---

### DELETE /api/guestbook/:id

**Headers**: `Authorization: Bearer <token>`

**Success Response (200)**:
```json
{"deleted": true, "id": "g_abc123"}
```

**Error Scenarios**:
| Scenario | Response | Status |
|----------|----------|--------|
| Missing auth header | `{"error": "unauthorized"}` | 401 |
| Invalid token | `{"error": "invalid_token"}` | 401 |
| Entry not found | `{"error": "not_found"}` | 404 |

---

### GET /api/weather

**Query Params**: `lat` (required), `lng` (required)

**Success Response (200)**:
```json
{
  "location": {
    "lat": 22.32,
    "lng": 114.17,
    "name": "Hong Kong"
  },
  "current": {
    "temperature": 31.2,
    "feelsLike": 35.0,
    "humidity": 78,
    "windSpeed": 12.5,
    "windDirection": 180,
    "condition": "Partly Cloudy",
    "conditionIcon": "partly-cloudy",
    "uvIndex": 8
  },
  "forecast": [
    {
      "date": "2026-06-18",
      "high": 33.0,
      "low": 27.0,
      "condition": "Thunderstorms",
      "precipitationProbability": 65
    }
  ]
}
```

---

## Error Simulation Configuration

### HAL Mock Config File

```yaml
# .specs/06_prototypes/mock_config.yaml
simulation:
  # Global delay range (ms)
  delay:
    min: 0
    max: 500

  # Per-endpoint overrides
  endpoints:
    /api/crypto-ticker:
      delay: { min: 50, max: 200 }
      stale_after: 10s
    /api/earthquakes:
      delay: { min: 100, max: 300 }
      error_rate: 0.05  # 5% chance of 503
    /api/guestbook:
      delay: { min: 0, max: 100 }
      rate_limit:
        max_posts: 5
        window: 10m

  # Error injection
  errors:
    # Force specific error on next N requests
    inject:
      - endpoint: /api/crypto-ticker
        status: 503
        body: {"error": "simulated_upstream_failure"}
        for: 3  # next 3 requests
      - endpoint: /api/stock-chart
        status: 504
        body: {"error": "timeout"}
        for: 1

  # Stale data simulation
  stale:
    probability: 0.1  # 10% chance of stale response
    max_age: 120s

  # Upstream API simulation
  upstream:
    yahoo_finance:
      availability: 0.98  # 98% uptime
    binance:
      availability: 0.99
    coingecko:
      availability: 0.95  # 95% uptime (free tier)
    usgs:
      availability: 0.99
    noaa:
      availability: 0.99
```

### Mock Server Implementation Notes

- Use `msw` (Mock Service Worker) for browser-level mocking in tests
- Use `wrangler dev` with local KV for Worker-level mocking
- Export mock data as JSON fixtures in `__tests__/fixtures/`
- All mock responses include `X-Mock: true` header for test assertions
- Stale responses include `X-Data-Freshness: stale` header

---

## Test Data Generators

| Generator | Purpose | Output |
|-----------|---------|--------|
| `generateOHLC(n)` | n candlestick data points | `{timestamps, open, high, low, close, volume}` |
| `generateEarthquakes(n)` | n earthquake events | Array of earthquake objects |
| `generateLLMModels(n)` | n LLM benchmark entries | Array of model objects |
| `generateGuestbookEntries(n)` | n guestbook posts | Array of entry objects |
| `generateTimeSeries(type, range)` | Time series for any metric | `{dates, values}` |

---

## Acceptance Criteria

- [ ] All 20+ endpoints have mock responses matching production schema
- [ ] Error scenarios simulated for each endpoint (500, 503, 504, 429)
- [ ] Data freshness configurable per endpoint
- [ ] Rate limiting mock works for guestbook
- [ ] Honeypot detection mock works
- [ ] Test data generators produce valid data
- [ ] Mock config file is self-documenting

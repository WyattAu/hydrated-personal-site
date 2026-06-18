# API Reference: Hydrated Personal Site

All endpoints are served by the Cloudflare Worker at `https://wyattau.com/api/`. Responses are JSON unless noted. All endpoints include security headers (CSP, HSTS, X-Frame-Options: DENY).

---

## Health Check

### `GET /api/health`

Returns worker health status.

**Cache:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00Z",
  "version": "1.0.0"
}
```

**Errors:** Never (always 200)

---

## Weather

### `GET /api/weather`

Fetches current weather from Open-Meteo.

**Cache:** 5 minutes

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `lat` | number | yes | — | Latitude (-90 to 90) |
| `lon` | number | yes | — | Longitude (-180 to 180) |
| `units` | string | no | `celsius` | `celsius` or `fahrenheit` |

**Response:**
```json
{
  "temperature": 12.5,
  "units": "celsius",
  "description": "Partly cloudy",
  "icon": "02d",
  "wind_speed": 15.2,
  "humidity": 72,
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278
  },
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing or invalid `lat`/`lon` |
| 502 | Open-Meteo API unreachable |

---

## Stock Chart

### `GET /api/stock-chart`

Fetches price chart data from Yahoo Finance.

**Cache:** 2 minutes (intraday), 2 hours (daily+)

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `symbol` | string | yes | — | Ticker symbol (e.g. `AAPL`, `BTC-USD`) |
| `range` | string | no | `1d` | `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `5y`, `max` |
| `interval` | string | no | auto | `1m`, `5m`, `15m`, `1h`, `1d`, `1wk`, `1mo` |

**Response:**
```json
{
  "symbol": "BTC-USD",
  "range": "3mo",
  "interval": "1d",
  "data": {
    "timestamps": [1705276800, 1705363200, 1705449600],
    "open": [42500.0, 43100.5, 42800.0],
    "high": [43200.0, 43500.0, 43000.0],
    "low": [42000.0, 42800.0, 42200.0],
    "close": [43100.5, 42800.0, 42950.0],
    "volume": [1250000000, 1180000000, 1320000000]
  },
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `symbol` |
| 404 | Symbol not found |
| 502 | Yahoo Finance API unreachable |

---

## Crypto Ticker

### `GET /api/crypto-ticker`

Real-time crypto prices from Binance.

**Cache:** 10 seconds

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `symbols` | string | no | `BTCUSDT,ETHUSDT` | Comma-separated trading pairs |

**Response:**
```json
{
  "prices": [
    {
      "symbol": "BTCUSDT",
      "price": 65814.20,
      "change_24h": 2.35,
      "change_24h_pct": 3.68,
      "volume_24h": 28500000000,
      "high_24h": 66200.00,
      "low_24h": 63500.00
    },
    {
      "symbol": "ETHUSDT",
      "price": 3456.78,
      "change_24h": -12.30,
      "change_24h_pct": -0.35,
      "volume_24h": 15200000000,
      "high_24h": 3500.00,
      "low_24h": 3400.00
    }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | Binance API unreachable |

---

## CoinGecko Global

### `GET /api/coingecko-global`

Global cryptocurrency market data.

**Cache:** 5 minutes

**Response:**
```json
{
  "total_market_cap_usd": 2450000000000,
  "total_volume_24h": 98000000000,
  "btc_dominance": 52.4,
  "eth_dominance": 16.8,
  "active_cryptos": 12500,
  "market_cap_change_24h": 1.2,
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | CoinGecko API unreachable |

---

## Earthquakes

### `GET /api/earthquakes`

Recent earthquake data from USGS.

**Cache:** 5 minutes

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `min_magnitude` | number | no | `4.5` | Minimum magnitude (0-10) |
| `days` | number | no | `7` | Lookback period in days (1-30) |
| `limit` | number | no | `100` | Max results (1-500) |

**Response:**
```json
{
  "earthquakes": [
    {
      "id": "us7000abcd",
      "magnitude": 5.2,
      "place": "120km SW of La Paz, Bolivia",
      "time": "2025-01-15T08:30:00Z",
      "coordinates": {
        "latitude": -17.5,
        "longitude": -68.2,
        "depth": 45.0
      },
      "tsunami": false,
      "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd"
    }
  ],
  "count": 1,
  "min_magnitude": 4.5,
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Invalid `min_magnitude` or `days` |
| 502 | USGS API unreachable |

---

## Fear & Greed Index

### `GET /api/fear-greed`

Crypto Fear & Greed Index.

**Cache:** 5 minutes

**Response:**
```json
{
  "value": 65,
  "classification": "Greed",
  "timestamp": "2025-01-15T00:00:00Z",
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | Alternative.me API unreachable |

---

## Kp Index

### `GET /api/kp-index`

NOAA planetary Kp index (geomagnetic activity).

**Cache:** 10 minutes

**Response:**
```json
{
  "kp_index": 3,
  "classification": "Unsettled",
  "timestamp": "2025-01-15T12:00:00Z",
  "forecast": [
    { "kp": 2, "time": "2025-01-15T15:00:00Z" },
    { "kp": 3, "time": "2025-01-15T18:00:00Z" },
    { "kp": 4, "time": "2025-01-15T21:00:00Z" }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | NOAA API unreachable |

---

## Mempool

### `GET /api/mempool`

Bitcoin mempool fee estimates from mempool.space.

**Cache:** 1 minute

**Response:**
```json
{
  "fees": {
    "fastest_fee": 25,
    "half_hour_fee": 18,
    "hour_fee": 12,
    "economy_fee": 8,
    "minimum_fee": 1
  },
  "mempool_size": 45000,
  "mempool_bytes": 28000000,
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | mempool.space API unreachable |

---

## Binance Klines

### `GET /api/binance-klines`

Price history via Binance kline (candlestick) data. Used as fallback for Yahoo Finance.

**Cache:** 5 minutes

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `symbol` | string | yes | — | Trading pair (e.g. `BTCUSDT`) |
| `interval` | string | no | `1d` | `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w` |
| `limit` | number | no | `500` | Number of candles (1-1000) |

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "interval": "1d",
  "klines": [
    {
      "open_time": 1705276800000,
      "open": 42500.0,
      "high": 43200.0,
      "low": 42000.0,
      "close": 43100.5,
      "volume": 12500.0,
      "close_time": 1705363199999
    }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `symbol` |
| 502 | Binance API unreachable |

---

## Hacker News

### `GET /api/hacker-news`

Top Hacker News stories.

**Cache:** 5 minutes

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `limit` | number | no | `30` | Number of stories (1-50) |

**Response:**
```json
{
  "stories": [
    {
      "id": 39000000,
      "title": "Show HN: A new CSS framework",
      "url": "https://example.com",
      "score": 245,
      "by": "pg",
      "time": "2025-01-15T10:00:00Z",
      "descendants": 87
    }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | HN Firebase API unreachable |

---

## GitHub Trending

### `GET /api/github-trending`

Trending GitHub repositories.

**Cache:** 30 minutes

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `language` | string | no | — | Filter by language (e.g. `rust`, `typescript`) |
| `since` | string | no | `daily` | `daily`, `weekly`, `monthly` |

**Response:**
```json
{
  "repositories": [
    {
      "name": "user/repo",
      "description": "A cool project",
      "language": "Rust",
      "language_color": "#dea584",
      "stars": 15200,
      "stars_today": 342,
      "forks": 890,
      "url": "https://github.com/user/repo"
    }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | GitHub scraping failed |

---

## LLM Benchmarks

### `GET /api/llm-benchmarks`

LLM performance benchmark data.

**Cache:** 6 hours

**Response:**
```json
{
  "models": [
    {
      "name": "GPT-4o",
      "provider": "OpenAI",
      "intelligence_score": 92,
      "speed_tokens_per_sec": 85,
      "context_window": 128000,
      "price_per_1m_input": 2.50,
      "price_per_1m_output": 10.00,
      "release_date": "2024-05-13"
    }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | Artificial Analysis API unreachable |

---

## Guestbook

### `GET /api/guestbook`

Retrieve guestbook entries.

**Cache:** None

**Response:**
```json
{
  "entries": [
    {
      "id": "abc123",
      "name": "Visitor",
      "message": "Great portfolio!",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### `POST /api/guestbook`

Submit a new guestbook entry.

**Cache:** None

**Request Body:**
```json
{
  "name": "Visitor",
  "message": "Great portfolio!",
  "website": ""
}
```

**Rate Limit:** 5 posts per IP per 10 minutes.

**Response (201):**
```json
{
  "id": "abc123",
  "name": "Visitor",
  "message": "Great portfolio!",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `name` or `message` |
| 409 | Honeypot field filled (bot detected) |
| 429 | Rate limit exceeded |

### `DELETE /api/guestbook`

Delete a guestbook entry (admin only).

**Cache:** None

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <ADMIN_TOKEN>` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Entry ID to delete |

**Response (204):** No content.

**Errors:**

| Status | Cause |
|--------|-------|
| 401 | Missing or invalid bearer token |
| 404 | Entry not found |

---

## Exchange Rates

### `GET /api/exchange-rates`

Currency exchange rates.

**Cache:** 1 hour

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `base` | string | no | `USD` | Base currency |
| `symbols` | string | no | — | Comma-separated target currencies |

**Response:**
```json
{
  "base": "USD",
  "rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 148.50,
    "BTC": 0.0000152
  },
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 502 | Exchange rate API unreachable |

---

## FRED (Federal Reserve)

### `GET /api/fred`

Federal Reserve Economic Data.

**Cache:** 1 hour

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `series` | string | yes | — | FRED series ID (e.g. `GDP`, `UNRATE`, `CPIAUCSL`) |
| `limit` | number | no | `100` | Number of data points |

**Response:**
```json
{
  "series_id": "UNRATE",
  "series_name": "Unemployment Rate",
  "data": [
    { "date": "2024-12-01", "value": 4.1 },
    { "date": "2024-11-01", "value": 4.2 },
    { "date": "2024-10-01", "value": 4.1 }
  ],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `series` |
| 404 | Series not found |
| 502 | FRED API unreachable or API key invalid |

---

## Common Response Headers

All endpoints include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

## Error Response Schema

All errors follow:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common error codes:

| Code | Description |
|------|-------------|
| `MISSING_PARAM` | Required parameter not provided |
| `INVALID_PARAM` | Parameter value out of range |
| `RATE_LIMITED` | Too many requests |
| `UPSTREAM_ERROR` | External API returned an error |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `BOT_DETECTED` | Honeypot field filled |

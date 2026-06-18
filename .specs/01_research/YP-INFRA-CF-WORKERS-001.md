# YP-INFRA-CF-WORKERS-001: Edge Computing with Cloudflare Workers

**Status:** Accepted  
**Domain:** Infrastructure / Edge Layer  
**Date:** 2026-06-17  
**Author:** DeepThought (Researcher)

---

## 1. V8 Isolate Model

### 1.1 Isolation Architecture

$$\text{Worker} = \text{V8 Isolate} + \text{Event Loop} + \text{Fetch Handler}$$

Each Worker runs in an isolated V8 context:
- No shared memory between isolates
- Cold start: $<5\text{ms}$ (V8 snapshot)
- Execution: $10\text{ms}$–$30\text{s}$ CPU time
- Memory: $128\text{MB}$ per isolate

### 1.2 Execution Model

```
Request → Router → V8 Isolate → Handler → Response
              │
              ▼
         Isolate Pool (warm)
```

- **Warm starts**: Isolates are reused across requests (~0ms overhead)
- **Cold starts**: New isolate spawned from V8 snapshot (~5ms)
- **No container overhead**: Unlike Lambda/Fargate, no Docker layer

### 1.3 Limits

| Limit | Value | Impact |
|-------|-------|--------|
| CPU time (free) | 10ms | API proxy must be fast |
| CPU time (paid) | 30s | Allows complex computation |
| Memory | 128MB | Sufficient for API proxying |
| Subrequests | 50 per request | Limited fan-out |
| KV reads | 1000/s per key | Eventually consistent |
| KV writes | 1/s per key | Eventually consistent |

---

## 2. KV Storage Semantics

### 2.1 Eventual Consistency

$$\text{KV}(\text{write}) \rightarrow \text{Propagate}(\text{eventually}) \rightarrow \text{KV}(\text{read})$$

- Writes are committed to one edge location
- Propagation to other locations: $10\text{s}$–$60\text{s}$
- Reads may return stale data during propagation

### 2.2 Consistency Model

$$\text{Consistency}(\text{KV}) = \text{Eventual}(\text{propagation delay})$$

**For this project:**
- Guestbook writes: Acceptable (eventual consistency is fine)
- Rate limiting: Acceptable (eventual consistency prevents some abuse)
- Cache invalidation: Acceptable (stale data is acceptable for 10-60s)

### 2.3 KV Operations

```typescript
// Write
await env.GUESTBOOK_KV.put(key, value, {
  expirationTtl: 86400, // 24 hours
});

// Read (may be stale)
const value = await env.GUESTBOOK_KV.get(key);

// List
const keys = await env.GUESTBOOK_KV.list({ prefix: 'guestbook:' });

// Delete
await env.GUESTBOOK_KV.delete(key);
```

### 2.4 KV Pricing

| Operation | Cost |
|-----------|------|
| Read | $0.50 / million |
| Write | $5.00 / million |
| List | $5.00 / million |
| Storage | $0.50 / GB-month |

**Estimated monthly cost:** $0.01–$0.05 (personal site, low traffic)

---

## 3. API Proxying Patterns

### 3.1 Proxy Architecture

$$\text{Browser} \xrightarrow{\text{fetch}} \text{CF Worker} \xrightarrow{\text{fetch}} \text{External API}$$

Benefits:
1. **CORS bypass**: Worker makes server-to-server requests (no CORS headers needed)
2. **Rate limiting**: Worker enforces rate limits before hitting external API
3. **Caching**: Worker caches responses in KV
4. **Security**: API keys never exposed to browser

### 3.2 Proxy Implementation

```typescript
// worker/src/index.ts
async function handleProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  
  if (!target) {
    return new Response('Missing url parameter', { status: 400 });
  }
  
  // Rate limiting
  const ip = request.headers.get('cf-connecting-ip');
  const rateKey = `rate:${ip}:${url.pathname}`;
  const hits = await env.RATE_KV.get(rateKey);
  
  if (hits && parseInt(hits) > RATE_LIMIT) {
    return new Response('Rate limited', { status: 429 });
  }
  
  // Check cache
  const cacheKey = `cache:${url.pathname}:${url.search}`;
  const cached = await env.CACHE_KV.get(cacheKey);
  
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Fetch from external API
  const response = await fetch(target);
  const data = await response.text();
  
  // Cache response
  await env.CACHE_KV.put(cacheKey, data, {
    expirationTtl: getCacheTTL(url.pathname),
  });
  
  // Increment rate limit counter
  await env.RATE_KV.put(rateKey, String((parseInt(hits || '0') + 1)), {
    expirationTtl: 600, // 10 minutes
  });
  
  return new Response(data, {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 3.3 Endpoint Map

| Endpoint | External API | Cache TTL |
|----------|-------------|-----------|
| `/api/health` | — | None |
| `/api/weather` | Open-Meteo | 5min |
| `/api/stock-chart` | Yahoo Finance | 2min–2h |
| `/api/crypto-ticker` | Binance | 10s |
| `/api/coingecko-global` | CoinGecko | 5min |
| `/api/earthquakes` | USGS | 5min |
| `/api/fear-greed` | Alternative.me | 5min |
| `/api/kp-index` | NOAA | 10min |
| `/api/mempool` | mempool.space | 1min |
| `/api/binance-klines` | Yahoo Finance | 5min |
| `/api/hacker-news` | HN Firebase | 5min |
| `/api/github-trending` | GitHub API | 30min |
| `/api/llm-benchmarks` | Artificial Analysis | 6h |
| `/api/guestbook` | KV (internal) | No cache |
| `/api/exchange-rates` | ExchangeRate-API | 1h |
| `/api/fred` | FRED API | 1h |

---

## 4. Rate Limiting Algorithms

### 4.1 Fixed Window

$$\text{Allow}(t) = \begin{cases} \text{true} & \text{if } \text{count}(t) < \text{limit} \\ \text{false} & \text{otherwise} \end{cases}$$

```typescript
// Fixed window: 5 requests per 10 minutes per IP
const windowKey = `rate:${ip}:${Math.floor(Date.now() / 600000)}`;
const count = parseInt(await env.KV.get(windowKey) || '0');

if (count >= 5) {
  return new Response('Rate limited', { status: 429 });
}

await env.KV.put(windowKey, String(count + 1), { expirationTtl: 600 });
```

**Drawback:** Burst at window boundary (5 requests at 9:59, 5 at 10:00 = 10 in 2 minutes)

### 4.2 Sliding Window Log

$$\text{Allow}(t) = \begin{cases} \text{true} & \text{if } |\{r \in \text{requests} : t - r < \text{window}\}| < \text{limit} \\ \text{false} & \text{otherwise} \end{cases}$$

Better accuracy but higher storage cost. Not practical with KV's 1MB value limit.

### 4.3 Token Bucket

$$\text{Tokens}(t) = \min(\text{capacity}, \text{tokens}(t_{\text{last}}) + (t - t_{\text{last}}) \times \text{rate})$$

$$\text{Allow}(t) = \begin{cases} \text{true}, \text{tokens}(t) \leftarrow \text{tokens}(t) - 1 & \text{if } \text{tokens}(t) \geq 1 \\ \text{false} & \text{otherwise} \end{cases}$$

### 4.4 For This Project

**Fixed window** is sufficient:
- Guestbook: 5 posts per 10 minutes per IP
- Simple to implement with KV
- Burst risk is acceptable (low-traffic personal site)

---

## 5. Security Headers Injection

### 5.1 Headers

$$\text{Headers}(\text{response}) = \{ \text{HSTS}, \text{XCTO}, \text{XFO}, \text{COOP}, \text{COEP}, \text{RP}, \text{PP}, \text{CSP} \}$$

```typescript
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  headers.set('Strict-Transport-Security', 
    'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', CSP_DIRECTIVE);
  
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

### 5.2 Content Security Policy

$$\text{CSP} = \text{default-src} + \text{script-src} + \text{style-src} + \text{img-src} + \ldots$$

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://api.binance.com https://api.coingecko.com ...;
worker-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### 5.3 Why Worker-Level Headers

- CF Pages adds some headers, but not all
- Worker intercepts all requests (HTML + API)
- CSP must cover both static assets and API responses
- Centralized header management in one place

---

## 6. Cache Strategies

### 6.1 Stale-While-Revalidate

$$\text{Response}(t) = \begin{cases} \text{Fresh}(t) & \text{if } t - t_{\text{created}} < \text{TTL} \\ \text{Stale}(t) + \text{Background Revalidate} & \text{if } t - t_{\text{created}} < \text{TTL} + \text{SWR Window} \\ \text{Miss} & \text{otherwise} \end{cases}$$

### 6.2 Cache Tiers

| Tier | Storage | TTL | Use Case |
|------|---------|-----|----------|
| L1 | KV (edge) | 10s–6h | API responses |
| L2 | Browser | `max-age` | Static assets |
| L3 | CDN | Edge cache | HTML pages |

### 6.3 Cache Headers for Static Assets

| Asset | Cache-Control | Strategy |
|-------|---------------|----------|
| HTML | `max-age=0, must-revalidate` | Always fresh |
| CSS/JS | `max-age=31536000, immutable` | Content-hashed |
| Fonts | `max-age=31536000, immutable` | Self-hosted |
| Images | `max-age=86400` | Daily refresh |
| WASM | `max-age=31536000, immutable` | Content-hashed |

### 6.4 API Cache Implementation

```typescript
function getCacheTTL(pathname: string): number {
  const ttls: Record<string, number> = {
    '/api/crypto-ticker': 10,        // 10 seconds
    '/api/mempool': 60,              // 1 minute
    '/api/stock-chart': 120,         // 2 minutes
    '/api/weather': 300,             // 5 minutes
    '/api/earthquakes': 300,         // 5 minutes
    '/api/coingecko-global': 300,    // 5 minutes
    '/api/fear-greed': 300,          // 5 minutes
    '/api/hacker-news': 300,         // 5 minutes
    '/api/kp-index': 600,            // 10 minutes
    '/api/binance-klines': 300,      // 5 minutes
    '/api/exchange-rates': 3600,     // 1 hour
    '/api/fred': 3600,               // 1 hour
    '/api/github-trending': 1800,    // 30 minutes
    '/api/llm-benchmarks': 21600,    // 6 hours
  };
  
  return ttls[pathname] || 300; // Default 5 minutes
}
```

### 6.5 Cache Invalidation

$$\text{Invalidation} = \text{TTL expiry} + \text{Manual purge}$$

- No automatic invalidation (TTL-based)
- Manual purge via `wrangler kv:key delete` for emergency invalidation
- Content changes trigger rebuild → new content-hashed URLs

---

## 7. Worker Entry Point

### 7.1 Request Routing

```typescript
// worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // API routes
    if (url.pathname.startsWith('/api/')) {
      const response = await handleAPI(request, env);
      return addSecurityHeaders(response);
    }
    
    // Static assets (CF Pages handles this)
    return addSecurityHeaders(fetch(request));
  },
};
```

### 7.2 Error Handling

```typescript
async function handleAPI(request: Request, env: Env): Promise<Response> {
  try {
    const response = await routeRequest(request, env);
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### 7.3 Environment Variables

| Variable | Purpose | Type |
|----------|---------|------|
| `GUESTBOOK_KV` | Guestbook data | KV namespace |
| `RATE_KV` | Rate limiting counters | KV namespace |
| `CACHE_KV` | API response cache | KV namespace |
| `AA_API_KEY` | Artificial Analysis API | Secret |
| `FRED_API_KEY` | Federal Reserve API | Secret |

---

## 8. References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [CF Pages + Workers](https://developers.cloudflare.com/pages/functions/)

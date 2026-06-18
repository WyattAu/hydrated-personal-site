# Threat Model: Hydrated Personal Site

## 1. STRIDE Analysis

### 1.1 Spoofing

| Threat | Attack Vector | Component | Risk | Mitigation |
|--------|--------------|-----------|------|------------|
| Identity spoofing on guestbook | Attacker submits messages impersonating other users | `/api/guestbook` POST | Medium | No auth on guestbook; accept as design decision — display `Anonymous` by default, optional name field |
| API impersonation | Attacker calls CF Worker endpoints pretending to be legitimate client | CF Worker API | Low | CORS same-origin only; no API keys needed for public data |
| DNS spoofing | Attacker redirects traffic via DNS manipulation | Domain | Low | DNSSEC on Cloudflare; HSTS preload prevents HTTP downgrade |
| WASM module spoofing | Attacker serves modified WASM from compromised CDN | WASM loading | Medium | Same-origin WASM loading only; no external WASM CDN; Subresource Integrity (SRI) on all `<script>` tags |

### 1.2 Tampering

| Threat | Attack Vector | Component | Risk | Mitigation |
|--------|--------------|-----------|------|------------|
| Guestbook message injection | HTML/script injection in message body | `/api/guestbook` POST, `GuestbookForm.tsx` | High | Server-side HTML entity encoding; sanitize on CF Worker before KV write; render as text, not HTML |
| XSS via CustomEvent data | Malicious data injected into `CustomEvent.detail` | `document.dispatchEvent()` | Medium | Validate all event data at listener; never use `innerHTML` with external data |
| API response tampering | MITM modifying proxy responses | CF Worker → external API | Low | HTTPS everywhere; HSTS; external APIs use HTTPS; no sensitive data in responses |
| Query parameter injection | Crafted query params to manipulate API behavior | `/api/stock-chart`, `/api/binance-klines` | Medium | Valibot schema validation on all params; whitelist allowed symbols/tickers |
| Service worker tampering | Modified SW intercepts requests | `sw.js` | Low | Same-origin SW; no external SW registration; `Cache-Control: no-store` on SW file |
| WASM memory tampering | Crafted input to corrupt WASM linear memory | WASM widgets | Low | Rust memory safety; no `unsafe` blocks in widget code; no direct pointer manipulation from JS |

### 1.3 Repudiation

| Threat | Attack Vector | Component | Risk | Mitigation |
|--------|--------------|-----------|------|------------|
| Guestbook abuse denial | Attacker posts spam/abuse then denies it | `/api/guestbook` | Low | CF Worker logs request IP + timestamp in KV metadata; rate limiting records per-IP |
| API abuse denial | Attacker hammers endpoints and denies | `/api/*` | Low | CF Worker request logging; rate limiting counters in KV |
| No audit trail for admin delete | Admin deletes guestbook entries with no record | `/api/guestbook` DELETE | Low | Log delete operations in KV with timestamp and admin token hash |

### 1.4 Information Disclosure

| Threat | Attack Vector | Component | Risk | Mitigation |
|--------|--------------|-----------|------|------------|
| API key exposure | Secrets leaked in client-side code | CF Worker env vars | High | All API keys (AA_API_KEY, FRED_API_KEY) stored in CF Worker env, never in client JS; Astro build doesn't include worker secrets |
| Error message information leak | Verbose errors expose stack traces, internal paths | CF Worker error handlers | Medium | Generic error responses (`{ error: "Internal error" }`); no stack traces in production |
| External API data leakage | Proxied responses contain user-specific data | CF Worker → external APIs | Low | All proxied APIs are public data (Yahoo Finance, CoinGecko, USGS); no user tokens forwarded |
| WASM binary analysis | Attacker reverse-engineers WASM to find logic | `packages/widgets/pkg/` | Low | WASM is public portfolio code; no secrets in widgets; obfuscation not needed |
| KV data exposure | Guestbook entries readable by unauthorized parties | CF KV | Medium | KV reads only through CF Worker API; no direct KV access from client; no PII in guestbook entries |
| CORS misconfiguration | Cross-origin requests leak data | CF Worker | Medium | `Access-Control-Allow-Origin` restricted to same origin; no wildcard CORS |

### 1.5 Denial of Service

| Threat | Attack Vector | Component | Risk | Mitigation |
|--------|--------------|-----------|------|------------|
| Guestbook flood | Mass POST requests to guestbook | `/api/guestbook` POST | High | Rate limiting: 5 posts per 10 min per IP; CF Worker has built-in request limits |
| API endpoint abuse | Rapid requests to exhaust CF Worker CPU/time | `/api/*` GET | Medium | CF Worker execution limits (10ms CPU, 30s wall); aggressive cache TTLs (10s-6h); Cloudflare's own DDoS protection |
| Large payload DoS | Oversized request bodies to CF Worker | `/api/guestbook` POST | Medium | Max body size limit on CF Worker; validate content-length header |
| WASM resource exhaustion | Crafted input causing infinite computation in WASM | WASM widgets | Low | All computation is bounded (fixed-size canvas, iteration limits); no unbounded loops in Rust code |
| Cache poisoning | Flooding cache with garbage data to evict valid entries | CF Worker KV cache | Low | TTL-based cache eviction; cache keys namespaced per endpoint; max cache size enforced by CF |

### 1.6 Elevation of Privilege

| Threat | Attack Vector | Component | Risk | Mitigation |
|--------|--------------|-----------|------|------------|
| Admin token bypass | Attacker guesses/cracks bearer token for guestbook delete | `/api/guestbook` DELETE | Medium | Bearer token stored as CF Worker secret; compare with constant-time `timingSafeEqual`; token > 32 chars |
| XSS to admin session | Attacker steals admin token via XSS | Guestbook display | Medium | No admin token in client-side code; admin delete is server-side only; CSP headers prevent inline script execution |
| CF Worker privilege escalation | Attacker exploits CF Worker to access KV directly | CF Worker | Low | CF Worker runs in isolated V8 isolate; no shared state between requests; KV binding scoped to Worker |
| WASM breakout | WASM escapes sandbox to access host resources | WASM widgets | Low | WASM runs in browser sandbox; no WASI; Canvas2D only; no filesystem/network access from WASM |

---

## 2. Attack Surface Mapping

### 2.1 External-Facing Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                     ATTACK SURFACE MAP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLIENT BROWSER                                                 │
│  ├── Static Assets (CF Pages)                                   │
│  │   ├── HTML (pre-rendered, 8 pages)                           │
│  │   ├── CSS (Tailwind, ~80KB)                                  │
│  │   ├── JS (SolidJS islands, ~20KB)                            │
│  │   └── WASM (13 widgets, 70-130KB each, lazy-loaded)          │
│  │                                                              │
│  ├── CustomEvent Bridge                                         │
│  │   ├── chart:update (SolidJS → Charts)                        │
│  │   ├── chart:click (Charts → SolidJS)                         │
│  │   ├── wasm:update (SolidJS → WASM)                           │
│  │   └── wasm:result (WASM → SolidJS)                           │
│  │                                                              │
│  └── Service Worker (stale-while-revalidate)                    │
│                                                                 │
│  CF WORKER (API LAYER)                                          │
│  ├── /api/health (GET)                                          │
│  ├── /api/weather (GET) → Open-Meteo                            │
│  ├── /api/stock-chart (GET) → Yahoo Finance                     │
│  ├── /api/crypto-ticker (GET) → Binance                         │
│  ├── /api/coingecko-global (GET) → CoinGecko                    │
│  ├── /api/earthquakes (GET) → USGS                              │
│  ├── /api/fear-greed (GET) → Alternative.me                     │
│  ├── /api/kp-index (GET) → NOAA                                 │
│  ├── /api/mempool (GET) → mempool.space                         │
│  ├── /api/binance-klines (GET) → Yahoo Finance                  │
│  ├── /api/hacker-news (GET) → HN Firebase                       │
│  ├── /api/github-trending (GET) → GitHub API                    │
│  ├── /api/llm-benchmarks (GET) → Artificial Analysis            │
│  ├── /api/exchange-rates (GET) → ExchangeRate API               │
│  ├── /api/fred (GET) → Federal Reserve                          │
│  └── /api/guestbook (GET/POST/DELETE) → CF KV                   │
│                                                                 │
│  CF KV                                                          │
│  ├── guestbook:* (message data)                                 │
│  ├── rate:* (rate limiting counters)                            │
│  └── cache:* (response cache)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 External Data Sources (Untrusted Input)

| Source | Trust Level | Data Received | Validation |
|--------|-------------|---------------|------------|
| Yahoo Finance | Low — third-party API | Price data, charts | Valibot schema; reject malformed responses |
| CoinGecko | Low — third-party API | Crypto market data | Valibot schema; reject malformed responses |
| Binance | Low — third-party API | Order book, prices | Valibot schema; reject malformed responses |
| USGS | Medium — government API | Earthquake data | Valibot schema; validate magnitude/coordinates |
| NOAA | Medium — government API | Kp index, space weather | Valibot schema; validate numeric range |
| Open-Meteo | Low — third-party API | Weather data | Valibot schema; reject malformed responses |
| HN Firebase | Low — third-party API | Story titles, URLs | Sanitize HTML entities; validate URL format |
| GitHub API | Medium — Microsoft-owned | Repo metadata | Valibot schema; validate language/topic fields |
| NASA GISS | Medium — government data | Climate CSV | Parse CSV; validate numeric columns |
| mempool.space | Low — third-party API | BTC mempool fees | Valibot schema; validate sat/byte ranges |
| blockchain.info | Low — third-party API | BTC network stats | Valibot schema; validate block height/hash |

### 2.3 Client-Side Storage

| Storage | Content | Risk | Mitigation |
|---------|---------|------|------------|
| localStorage | Theme preference (string) | Low — XSS could read | CSP prevents inline script; no sensitive data stored |
| Service Worker Cache | Static assets | Low — stale data | Cache only first-party static assets; versioned cache keys |
| CF KV (client-invisible) | Guestbook, rate limits | Medium — data integrity | Server-side only; no client KV access |

---

## 3. Threat Actors

### 3.1 Script Kiddies

| Attribute | Description |
|-----------|-------------|
| **Motivation** | Vandalism, curiosity, proving capability |
| **Capability** | Low — automated tools, known exploits, OWASP Top 10 |
| **Targets** | Guestbook (spam), XSS injection, defacement |
| **Likelihood** | High — automated scanners constantly probe sites |
| **Impact** | Low-Medium — spam, visual defacement, not data breach |

**Specific Attack Scenarios:**
1. **Guestbook spam** — Submit promotional links, offensive content via automated POST requests
2. **XSS injection** — Attempt `<script>alert(1)</script>` in guestbook name/message fields
3. **SQL injection** — Not applicable (no SQL database); but try path traversal on API endpoints
4. **Directory enumeration** — Probe `/api/admin`, `/api/debug`, `/.env`, `/worker/`

### 3.2 Web Scrapers

| Attribute | Description |
|-----------|-------------|
| **Motivation** | Data harvesting, content theft, competitive analysis |
| **Capability** | Medium — headless browsers, automated scraping pipelines |
| **Targets** | API endpoints (price data, project data, benchmark data) |
| **Likelihood** | High — financial data is valuable; scraping is common |
| **Impact** | Low — all data is public; but excessive scraping increases costs |

**Specific Attack Scenarios:**
1. **API scraping** — Hit `/api/stock-chart` and `/api/crypto-ticker` at high frequency to harvest financial data
2. **Content copying** — Scrape all pages for portfolio content theft
3. **WASM extraction** — Download all 13 WASM binaries for analysis/reuse

### 3.3 API Abusers

| Attribute | Description |
|-----------|-------------|
| **Motivation** | Cost amplification, service disruption |
| **Capability** | Medium — custom scripts, API testing tools |
| **Targets** | CF Worker endpoints (CPU/time limits), external API quotas |
| **Likelihood** | Medium — personal sites are low-value targets |
| **Impact** | Medium — CF Worker bill increase, external API rate limit exhaustion |

**Specific Attack Scenarios:**
1. **Worker CPU exhaustion** — Rapid-fire requests to force CF Worker invocations beyond free tier
2. **External API abuse** — Use proxy to hit Yahoo Finance/CoinGecko beyond their rate limits
3. **Cache bypass** — Craft requests that bypass CF Worker cache, forcing fresh API calls

### 3.4 Sophisticated Attackers (Low Likelihood)

| Attribute | Description |
|-----------|-------------|
| **Motivation** | Targeted attack, supply chain compromise |
| **Capability** | High — custom exploits, MITM, supply chain attacks |
| **Targets** | Build pipeline (WASM binaries, npm packages), deployment credentials |
| **Likelihood** | Very Low — personal portfolio is not a high-value target |
| **Impact** | High — compromised WASM served to visitors, stolen deployment keys |

---

## 4. Risk Matrix

### 4.1 Risk Calculation

```
Risk = Likelihood × Impact

Likelihood: 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
Impact: 1=Negligible, 2=Minor, 3=Moderate, 4=Major, 5=Critical
```

### 4.2 Risk Matrix

| Threat | Likelihood | Impact | Risk Score | Priority |
|--------|-----------|--------|------------|----------|
| Guestbook XSS injection | 4 | 3 | **12** | HIGH |
| Guestbook spam/flood | 5 | 2 | **10** | HIGH |
| API key exposure in client code | 2 | 5 | **10** | HIGH |
| CustomEvent data injection | 3 | 3 | **9** | MEDIUM |
| API response tampering (MITM) | 2 | 3 | **6** | MEDIUM |
| WASM module spoofing | 2 | 3 | **6** | MEDIUM |
| Admin token brute force | 2 | 4 | **8** | MEDIUM |
| API endpoint enumeration | 4 | 1 | **4** | LOW |
| WASM reverse engineering | 3 | 1 | **3** | LOW |
| Cache poisoning | 2 | 2 | **4** | LOW |
| Supply chain attack (npm) | 1 | 5 | **5** | MEDIUM |
| DNS spoofing | 1 | 4 | **4** | LOW |
| WASM resource exhaustion | 2 | 2 | **4** | LOW |
| KV data exposure | 1 | 3 | **3** | LOW |

### 4.3 Risk Heat Map

```
              IMPACT
         1     2     3     4     5
    ┌─────┬─────┬─────┬─────┬─────┐
 5  │     │ GBF │     │     │     │  Almost Certain
    ├─────┼─────┼─────┼─────┼─────┤
 4  │ APE │     │ XSS │     │     │  Likely
    ├─────┼─────┼─────┼─────┼─────┤
 3  │ WASM│     │ CED │     │     │  Possible
    ├─────┼─────┼─────┼─────┼─────┤
 2  │     │ CAS │ API │ ADF │     │  Unlikely
    ├─────┼─────┼─────┼─────┼─────┤
 1  │     │     │ KV  │ DNS │ SCA │  Rare
    └─────┴─────┴─────┴─────┴─────┘

LEGEND:
  XSS = Guestbook XSS          GBF = Guestbook Flood
  APE = API Key Exposure        CED = CustomEvent Data Injection
  API = API Response Tampering  ADF = Admin Token Brute Force
  CAS = Cache Poisoning         WASM = WASM Spoofing/Reverse
  KV  = KV Data Exposure        DNS = DNS Spoofing
  SCA = Supply Chain Attack     APE = API Enumeration
```

### 4.4 Risk Response Strategy

| Priority | Risk Score Range | Response | Examples |
|----------|-----------------|----------|----------|
| **CRITICAL** | 20-25 | Immediate mitigation | None identified |
| **HIGH** | 10-19 | Mitigate before deployment | XSS, spam flood, API key exposure |
| **MEDIUM** | 5-9 | Mitigate during Phase 3 | CustomEvent injection, MITM, admin token |
| **LOW** | 1-4 | Accept or monitor | WASM analysis, enumeration, cache poisoning |

---

## 5. Data Flow Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 1: Browser (Untrusted)                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Astro SSG  │◄──►│   SolidJS    │◄──►│  WASM Widget │      │
│  │   (Static)   │    │   (Island)   │    │  (Sandbox)   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │                                    │
├─────────────────────────────┼────────────────────────────────────┤
│                             ▼                                    │
│ TRUST BOUNDARY 2: Network (HTTPS only)                          │
│                                                                 │
│         ┌───────────────────────────────────────┐                │
│         │     Cloudflare Edge (TLS termination) │                │
│         └───────────────────┬───────────────────┘                │
│                             │                                    │
├─────────────────────────────┼────────────────────────────────────┤
│                             ▼                                    │
│ TRUST BOUNDARY 3: CF Worker (Semi-trusted)                      │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   API Proxy  │    │   KV Store   │    │  Rate Limiter│      │
│  │   (Validate) │    │   (Persist)  │    │  (Protect)   │      │
│  └──────┬───────┘    └──────────────┘    └──────────────┘      │
│         │                                                       │
├─────────┼───────────────────────────────────────────────────────┤
│         ▼                                                       │
│ TRUST BOUNDARY 4: External APIs (Untrusted)                     │
│                                                                 │
│  Yahoo Finance │ CoinGecko │ Binance │ USGS │ NOAA │ GitHub   │
│  Open-Meteo    │ HN Firebase │ mempool.space │ blockchain.info │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Mitigation Summary

### 6.1 Controls by Category

| Category | Control | Implementation | Status |
|----------|---------|----------------|--------|
| **Input Validation** | Valibot schemas on all API params | CF Worker endpoint handlers | Required |
| **Input Validation** | HTML entity encoding on guestbook | CF Worker POST handler | Required |
| **Output Encoding** | Text-only rendering for guestbook | SolidJS `GuestbookForm.tsx` | Required |
| **CSP** | Content-Security-Policy header | CF Worker response headers | Required |
| **HSTS** | Strict-Transport-Security header | CF Worker response headers | Required |
| **Rate Limiting** | 5 posts/IP/10min on guestbook | CF Worker + KV counter | Required |
| **Rate Limiting** | Cache-first for all API proxies | CF Worker cache layer | Implemented |
| **Authentication** | Bearer token for admin delete | CF Worker secret comparison | Required |
| **CORS** | Same-origin only | CF Worker `Access-Control-Allow-Origin` | Required |
| **Dependency Scanning** | Automated vulnerability check | CI/CD pipeline (pnpm audit) | Required |
| **WASM Integrity** | Same-origin loading | IntersectionObserver loader | Implemented |
| **Error Handling** | Generic error responses | CF Worker try/catch | Required |
| **Headers** | Security headers on all responses | CF Worker middleware | Required |

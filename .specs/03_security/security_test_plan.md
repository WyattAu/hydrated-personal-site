# Security Test Plan: Hydrated Personal Site

## 1. XSS Prevention Tests

### 1.1 Guestbook XSS

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| XSS-GB-01 | Script tag in message | `<script>alert('xss')</script>` | Displayed as literal text, not executed | `GuestbookForm.tsx`, CF Worker |
| XSS-GB-02 | Event handler in name | `<img src=x onerror=alert(1)>` | Displayed as literal text | `GuestbookForm.tsx` |
| XSS-GB-03 | JavaScript URI in name | `javascript:alert(1)` | Displayed as literal text | `GuestbookForm.tsx` |
| XSS-GB-04 | SVG with script in message | `<svg onload=alert(1)>` | Displayed as literal text | `GuestbookForm.tsx` |
| XSS-GB-05 | HTML entity bypass | `&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;` | Displayed as literal text (double-encoding prevented) | CF Worker |
| XSS-GB-06 | Null byte injection | `test\x00<script>alert(1)</script>` | Stripped of null bytes, displayed safely | CF Worker |
| XSS-GB-07 | Unicode bypass | `\u003cscript\u003ealert(1)\u003c/script\u003e` | Displayed as literal text | CF Worker |
| XSS-GB-08 | Markdown injection | `[link](javascript:alert(1))` | Displayed as literal text, not rendered as link | Guestbook display |
| XSS-GB-09 | Template literal injection | `${alert(1)}` | Displayed as literal text | SolidJS component |
| XSS-GB-10 | Data URI | `<a href="data:text/html,<script>alert(1)</script>">click</a>` | Displayed as literal text | Guestbook display |

**Implementation Notes:**
- CF Worker: HTML-encode all entities (`<`, `>`, `"`, `'`, `&`) before KV write
- SolidJS: Render guestbook entries as `{entry.message}` (text node, not `innerHTML`)
- Display: No `dangerouslySetInnerHTML` or equivalent in SolidJS

### 1.2 CustomEvent Data Injection

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| XSS-CE-01 | Malicious detail payload | `CustomEvent('chart:update', { detail: '<script>alert(1)</script>' })` | Listener rejects non-object detail | Chart listeners |
| XSS-CE-02 | Prototype pollution via detail | `CustomEvent('wasm:update', { detail: { __proto__: { polluted: true } })` | Detail validated before use; prototype not modified | WASM bridge |
| XSS-CE-03 | Unexpected data types | `CustomEvent('chart:click', { detail: 123 })` | Listener validates type; rejects if not expected shape | Chart listeners |
| XSS-CE-04 | XSS via event name collision | Attacker dispatches `chart:update` with malicious payload | Only specific expected event names trigger handlers; namespace events | All CustomEvent listeners |
| XSS-CE-05 | Nested object injection | `{ detail: { data: { inner: '<img onerror=alert(1)>' } } }` | Nested values validated before DOM insertion | SolidJS components |

**Implementation Notes:**
- All CustomEvent listeners validate `e.detail` shape with Valibot before use
- Never pass `e.detail` directly to `innerHTML`; always extract specific fields
- Use namespaced event names (e.g., `hps:chart:update`) to avoid collisions

### 1.3 API Response Injection

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| XSS-API-01 | Script tag in API response | Yahoo Finance returns `<script>alert(1)</script>` in symbol name | Valibot rejects response; fallback displayed | Solid Query + Valibot |
| XSS-API-02 | HTML in project description | GitHub returns `<img onerror=alert(1)>` in repo description | Escaped before rendering | `ProjectsList.tsx` |
| XSS-API-03 | Script in HN story title | HN API returns `<script>alert(1)</script>` in title | Escaped before rendering | HN data panel |
| XSS-API-04 | Malformed JSON response | API returns `{ invalid json }` | Try/catch handles parse error; graceful fallback | All API consumers |
| XSS-API-05 | Script in earthquake place name | USGS returns `California<script>alert(1)</script>` | Escaped before rendering | World monitor |
| XSS-API-06 | Script in weather location | Open-Meteo returns malicious location name | Escaped before rendering | Weather component |

**Implementation Notes:**
- Valibot schemas validate structure AND types; reject unexpected fields
- SolidJS text interpolation (`{value}`) auto-escapes; never use `innerHTML`
- API error states display static fallback text, not error messages from external APIs

---

## 2. CSRF Protection Tests

### 2.1 Guestbook CSRF

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| CSRF-GB-01 | Cross-origin POST to guestbook | `fetch('https://site.com/api/guestbook', { method: 'POST', body: ... })` from different origin | Request blocked by CORS (no `Access-Control-Allow-Origin` for cross-origin) | CF Worker |
| CSRF-GB-02 | Form submission from external site | `<form action="https://site.com/api/guestbook" method="POST">` | CORS preflight fails; browser blocks request | CF Worker |
| CSRF-GB-03 | Simple POST (no preflight) | `fetch()` with `Content-Type: application/json` | CORS requires preflight for `application/json`; blocked | CF Worker |
| CSRF-GB-04 | Same-origin CSRF | POST from same origin but different page | Rate limiting limits damage; no sensitive action performed | CF Worker |
| CSRF-GB-05 | Honeypot field bypass | Bot submits form with honeypot field filled | Honeypot field present in form; if filled, reject submission | `GuestbookForm.tsx` |

**Implementation Notes:**
- CF Worker: `Access-Control-Allow-Origin: https://wyattau.com` (exact match, no wildcard)
- CF Worker: `Access-Control-Allow-Methods: GET, POST, DELETE` (no PUT/PATCH)
- CF Worker: `Access-Control-Allow-Headers: Content-Type, Authorization` (restrictive)
- Guestbook form includes hidden honeypot field; bots that fill all fields are rejected
- Rate limiting (5 posts/10min/IP) limits CSRF impact even if CORS bypassed

---

## 3. Rate Limiting Verification

### 3.1 Guestbook Rate Limiting

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| RL-GB-01 | 5 rapid POST requests | 5 POSTs within 10 minutes from same IP | All 5 succeed | CF Worker + KV |
| RL-GB-02 | 6th POST within window | 6th POST within same 10-minute window | Returns `429 Too Many Requests` | CF Worker + KV |
| RL-GB-03 | POST after window expires | 1 POST after 10-minute window has passed | Request succeeds; counter resets | CF Worker + KV |
| RL-GB-04 | Different IPs | 5 POSTs from IP-A, 5 POSTs from IP-B | All 10 succeed (separate counters) | CF Worker + KV |
| RL-GB-05 | Counter persistence | KV write succeeds but counter read fails | Default to allowing request (fail open) or fail closed per config | CF Worker |
| RL-GB-06 | Race condition | 10 concurrent POSTs from same IP | At most 5 succeed; rest get 429 | CF Worker + KV atomic ops |
| RL-GB-07 | IP spoofing via X-Forwarded-For | Request with fake `X-Forwarded-For` header | Use `cf-connecting-ip` header (immutable from CF edge) | CF Worker |

**Implementation Notes:**
- Rate limit key: `cf-connecting-ip` header (Cloudflare-provided, cannot be spoofed by client)
- KV key format: `rate:{ip}:{window_start}`
- Counter incremented atomically; TTL set to 10 minutes
- Use CF Worker `context.waitUntil()` for non-blocking KV writes

### 3.2 API Rate Limiting

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| RL-API-01 | Cache hit bypass | 100 rapid GETs to `/api/crypto-ticker` | Only 1 external API call per 10s cache TTL | CF Worker cache |
| RL-API-02 | Cache miss storm | 100 requests to `/api/llm-benchmarks` simultaneously | First request populates cache; rest served from cache | CF Worker cache |
| RL-API-03 | Cache key isolation | Same endpoint, different query params | Cached separately per unique query string | CF Worker cache |

---

## 4. CSP Header Validation

### 4.1 Content Security Policy Tests

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| CSP-01 | Default CSP header present | `GET /` response | `Content-Security-Policy` header present with all directives | CF Worker |
| CSP-02 | script-src restricts inline | `<script>alert(1)</script>` in guestbook | Blocked by CSP `script-src 'self'` (no `'unsafe-inline'`) | Browser |
| CSP-03 | script-src restricts eval | `eval('alert(1)')` in SolidJS | Blocked by CSP (no `'unsafe-eval'`) | Browser |
| CSP-04 | style-src allows inline styles | Tailwind inline styles | `style-src 'self' 'unsafe-inline'` needed for Tailwind | CF Worker |
| CSP-05 | img-src allows data URIs | Profile images, OG images | `img-src 'self' data: https:` for external images | CF Worker |
| CSP-06 | connect-src restricts API calls | JS `fetch()` to external API | Only `connect-src 'self'` (all external calls go through CF Worker proxy) | Browser |
| CSP-07 | font-src restricts fonts | Web fonts loading | `font-src 'self'` (fonts served from same origin) | Browser |
| CSP-08 | wasm-src blocks external WASM | Attempt to load WASM from CDN | `wasm-src 'self'` (only same-origin WASM allowed) | Browser |
| CSP-09 | frame-src blocks iframes | Attempt to embed external content | `frame-src 'none'` (no iframes allowed) | Browser |
| CSP-10 | object-src blocks plugins | Attempt to load Flash/Java plugins | `object-src 'none'` | Browser |
| CSP-11 | base-uri restricts base tag | `<base href="https://evil.com">` | `base-uri 'self'` prevents base tag injection | Browser |
| CSP-12 | form-action restricts form targets | Form submitting to external URL | `form-action 'self'` | Browser |
| CSP-13 | report-uri violation reporting | CSP violation triggered | `report-uri /api/csp-report` captures violations | CF Worker |

**CSP Header Configuration:**
```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self';
  connect-src 'self';
  media-src 'none';
  object-src 'none';
  child-src 'none';
  frame-src 'none';
  worker-src 'self';
  wasm-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  report-uri /api/csp-report;
  upgrade-insecure-requests;
```

---

## 5. Input Validation Tests

### 5.1 API Endpoint Validation

| Test ID | Endpoint | Test Case | Input | Expected Result |
|---------|----------|-----------|-------|-----------------|
| IV-01 | `/api/stock-chart` | Missing symbol param | `GET /api/stock-chart` | 400 `{ error: "Missing symbol parameter" }` |
| IV-02 | `/api/stock-chart` | Invalid symbol format | `GET /api/stock-chart?symbol=<script>` | 400 `{ error: "Invalid symbol format" }` |
| IV-03 | `/api/stock-chart` | SQL injection in symbol | `GET /api/stock-chart?symbol=AAPL'; DROP TABLE--` | 400 `{ error: "Invalid symbol format" }` |
| IV-04 | `/api/stock-chart` | Extremely long symbol | `GET /api/stock-chart?symbol=A` + 10000 chars | 400 `{ error: "Invalid symbol format" }` |
| IV-05 | `/api/stock-chart` | Valid symbol | `GET /api/stock-chart?symbol=AAPL` | 200 with valid data |
| IV-06 | `/api/crypto-ticker` | Invalid pair format | `GET /api/crypto-ticker?pair=../../etc/passwd` | 400 `{ error: "Invalid pair format" }` |
| IV-07 | `/api/weather` | Invalid latitude | `GET /api/weather?lat=999` | 400 `{ error: "Invalid latitude" }` |
| IV-08 | `/api/weather` | Script in location param | `GET /api/weather?lat=0&lon=0&name=<script>` | 400 or sanitized |
| IV-09 | `/api/guestbook` POST | Empty message | `POST /api/guestbook` with `{ "message": "" }` | 400 `{ error: "Message required" }` |
| IV-10 | `/api/guestbook` POST | Oversized message | 10KB+ message body | 400 `{ error: "Message too long" }` |
| IV-11 | `/api/guestbook` POST | Missing fields | `POST /api/guestbook` with `{}` | 400 with validation error |
| IV-12 | `/api/guestbook` DELETE | Missing auth header | `DELETE /api/guestbook?id=1` | 401 `{ error: "Unauthorized" }` |
| IV-13 | `/api/guestbook` DELETE | Invalid token | `DELETE /api/guestbook` with `Authorization: Bearer wrong` | 401 `{ error: "Unauthorized" }` |
| IV-14 | `/api/earthquakes` | Invalid min magnitude | `GET /api/earthquakes?min_mag=abc` | 400 or default value |
| IV-15 | `/api/exchange-rates` | Invalid base currency | `GET /api/exchange-rates?base=<script>` | 400 `{ error: "Invalid currency" }` |
| IV-16 | All endpoints | Path traversal | `GET /api/../worker/src/index.ts` | 404; no file system access |
| IV-17 | All endpoints | HTTP method not allowed | `PUT /api/guestbook` | 405 `{ error: "Method not allowed" }` |
| IV-18 | All endpoints | Content-Type mismatch | `POST /api/guestbook` with `text/plain` body | 400 `{ error: "Invalid content type" }` |

**Valibot Schema Example (stock-chart):**
```typescript
const StockChartParams = v.object({
  symbol: v.pipe(v.string(), v.regex(/^[A-Z]{1,10}$/)),
  range: v.optional(v.picklist(['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y', 'max']), '1y'),
});
```

### 5.2 Guestbook Input Validation

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| IV-GB-01 | Name field max length | 256+ character name | Truncated to 100 chars or rejected |
| IV-GB-02 | Message field max length | 10KB+ message | Rejected with 400 error |
| IV-GB-03 | Name field special chars | `<script>`, `null bytes`, control chars | Stripped or rejected |
| IV-GB-04 | Message field special chars | HTML tags, script tags | HTML-encoded before storage |
| IV-GB-05 | Honeypot field | Bot fills hidden `website` field | Rejected silently (200 OK but not stored) |
| IV-GB-06 | Empty submission | Both fields empty | Rejected with 400 error |
| IV-GB-07 | Unicode edge cases | Zero-width characters, RTL overrides | Stripped or rejected |

---

## 6. WASM Security Tests

### 6.1 WASM Loading Security

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| WASM-01 | Same-origin loading | WASM loaded from `https://wyattau.com/wasm/*.wasm` | Loaded successfully | `IntersectionObserver` loader |
| WASM-02 | Cross-origin loading | Attempt to load WASM from CDN | Blocked by `wasm-src 'self'` CSP | Browser |
| WASM-03 | WASM integrity check | Modified WASM file served | Hash mismatch; module fails to instantiate | Browser WASM loader |
| WASM-04 | No eval() usage | Search codebase for `eval(` | No matches found | All JS/WASM code |
| WASM-05 | No Function() constructor | Search codebase for `new Function(` | No matches found | All JS/WASM code |
| WASM-06 | WASM memory bounds | Crafted input causing OOM | Rust memory safety prevents OOM; bounded allocations | WASM widgets |
| WASM-07 | Canvas2D isolation | WASM writes to wrong canvas | Each widget owns its `<div>` subtree; `document.getElementById(canvasId)` scoped | WASM widgets |
| WASM-08 | No WASI imports | Audit WASM imports | Only `env` and `wbg_*` imports; no WASI | `wasm-pack build` output |
| WASM-09 | No filesystem access | WASM attempts to open files | Not possible without WASI; `web-sys` doesn't expose filesystem | Browser sandbox |
| WASM-10 | No network access from WASM | WASM attempts `fetch()` | Not possible; WASM only renders to Canvas2D; all network goes through SolidJS | Browser sandbox |

**Implementation Notes:**
- WASM built with `wasm-pack build --target web` (no WASI)
- `Cargo.toml` has no WASI dependencies
- `wasm-bindgen` only generates JS glue for Canvas2D API
- Each widget is isolated in its own `<div>` with unique ID

---

## 7. Supply Chain Security Tests

### 7.1 Dependency Scanning

| Test ID | Test Case | Tool | Expected Result | Frequency |
|---------|-----------|------|-----------------|-----------|
| SC-01 | npm audit for known vulnerabilities | `pnpm audit` | No critical/high vulnerabilities | Every CI build |
| SC-02 | Cargo audit for Rust dependencies | `cargo audit` | No critical/high vulnerabilities | Every WASM build |
| SC-03 | Lockfile integrity | `pnpm install --frozen-lockfile` | Lockfile matches `pnpm-lock.yaml` | Every CI build |
| SC-04 | Dependency pinning | Check `package.json` | All deps pinned to exact versions or ranges | Manual review |
| SC-05 | Known malicious packages | Check against advisory DB | No known malicious packages in deps | Every CI build |
| SC-06 | Postinstall scripts | `pnpm audit --audit-level=high` | No suspicious postinstall scripts | Every CI build |
| SC-07 | Bundle analysis | `pnpm build --analyze` | No unexpected large dependencies | Quarterly review |

### 7.2 Build Pipeline Security

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| SC-BP-01 | Reproducible builds | Build twice, compare output | Identical WASM binaries | `wasm-pack build` |
| SC-BP-02 | No dev dependencies in production | Audit production bundle | No test frameworks, linters in output | Astro build |
| SC-BP-03 | Environment variable isolation | Check client bundle | No `CLOUDFLARE_*`, `AA_API_KEY`, `FRED_API_KEY` in client code | Astro build |
| SC-BP-04 | Source maps disabled in production | Check production assets | No `.map` files served | CF Pages config |
| SC-BP-05 | CI/CD access control | Check GitHub/Forgejo actions | Only repo owner can trigger deployments | Forgejo config |

---

## 8. Security Header Tests

### 8.1 Header Validation

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| SH-01 | HSTS header present | `GET /` | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` | CF Worker |
| SH-02 | X-Content-Type-Options | `GET /` | `X-Content-Type-Options: nosniff` | CF Worker |
| SH-03 | X-Frame-Options | `GET /` | `X-Frame-Options: DENY` | CF Worker |
| SH-04 | Cross-Origin-Opener-Policy | `GET /` | `Cross-Origin-Opener-Policy: same-origin` | CF Worker |
| SH-05 | Cross-Origin-Embedder-Policy | `GET /` | `Cross-Origin-Embedder-Policy: credentialless` | CF Worker |
| SH-06 | Referrer-Policy | `GET /` | `Referrer-Policy: strict-origin-when-cross-origin` | CF Worker |
| SH-07 | Permissions-Policy | `GET /` | `Permissions-Policy: camera=(), microphone=(), geolocation=()` | CF Worker |
| SH-08 | X-XSS-Protection | `GET /` | `X-XSS-Protection: 0` (disable legacy XSS filter) | CF Worker |
| SH-09 | All headers on API responses | `GET /api/health` | All security headers present on API responses too | CF Worker |
| SH-10 | Headers on error responses | `GET /api/nonexistent` | Security headers present even on 404 responses | CF Worker |

---

## 9. Authentication & Authorization Tests

### 9.1 Admin Token Security

| Test ID | Test Case | Input | Expected Result | Component |
|---------|-----------|-------|-----------------|-----------|
| AUTH-01 | Valid bearer token | `Authorization: Bearer {valid_token}` | Delete succeeds | CF Worker |
| AUTH-02 | Missing Authorization header | No header | 401 `{ error: "Unauthorized" }` | CF Worker |
| AUTH-03 | Empty bearer token | `Authorization: Bearer ` | 401 `{ error: "Unauthorized" }` | CF Worker |
| AUTH-04 | Wrong token | `Authorization: Bearer wrong_token` | 401 (constant-time comparison) | CF Worker |
| AUTH-05 | Token in query string | `DELETE /api/guestbook?id=1&token=xxx` | 401 (token not accepted from query) | CF Worker |
| AUTH-06 | Token in request body | POST body with token field | 401 (token not accepted from body) | CF Worker |
| AUTH-07 | Timing attack resistance | Measure response time for wrong vs correct token | Response time identical (constant-time compare) | CF Worker |
| AUTH-08 | Token not logged | Check CF Worker logs | Token value never appears in logs | CF Worker |
| AUTH-09 | Token not in error messages | Invalid token request | Error response doesn't include submitted token | CF Worker |

---

## 10. Test Execution

### 10.1 Test Automation

| Test Category | Tool | Integration | Frequency |
|---------------|------|-------------|-----------|
| XSS prevention | Playwright E2E | CI pipeline | Every PR |
| CSRF protection | Playwright E2E | CI pipeline | Every PR |
| Rate limiting | Vitest + CF Worker test harness | CI pipeline | Every PR |
| CSP validation | Playwright E2E + header checks | CI pipeline | Every PR |
| Input validation | Vitest unit tests | CI pipeline | Every PR |
| WASM security | Manual audit + `cargo audit` | CI pipeline | Every build |
| Supply chain | `pnpm audit` + `cargo audit` | CI pipeline | Every build |
| Security headers | Playwright E2E + header checks | CI pipeline | Every PR |

### 10.2 Manual Testing Checklist

- [ ] Guestbook: Submit all XSS payloads listed above
- [ ] Guestbook: Verify honeypot field blocks bots
- [ ] Guestbook: Verify rate limiting with manual rapid submissions
- [ ] API: Test all endpoints with missing/invalid params
- [ ] API: Verify CORS blocks cross-origin requests (browser DevTools)
- [ ] WASM: Verify all 13 widgets load from same origin only
- [ ] Headers: Verify all security headers present (curl -I)
- [ ] CSP: Verify no console violations on any page
- [ ] Admin: Verify delete requires valid bearer token
- [ ] Admin: Verify token not exposed in client code

### 10.3 Test Report Template

```markdown
## Security Test Report — [Date]

### Summary
- Tests executed: [N]
- Passed: [N]
- Failed: [N]
- Skipped: [N]

### Critical Findings
- [List any critical/high findings]

### Test Results by Category
| Category | Passed | Failed | Notes |
|----------|--------|--------|-------|
| XSS Prevention | | | |
| CSRF Protection | | | |
| Rate Limiting | | | |
| CSP Headers | | | |
| Input Validation | | | |
| WASM Security | | | |
| Supply Chain | | | |
```

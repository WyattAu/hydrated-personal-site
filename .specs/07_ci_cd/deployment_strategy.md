# Phase 6: Deployment Strategy

## CF Pages Deployment Flow

### Build Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    CI Trigger (push to main)             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  1. Checkout code                                        │
│  2. Setup Rust + wasm-pack + Bun                         │
│  3. bun install --frozen-lockfile                        │
│  4. biome check . (final gate)                           │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Build WASM Widgets │  │  Build Astro Site    │
│  wasm-pack build    │  │  turbo build         │
│  --target web       │  │  --filter=site       │
└─────────┬───────────┘  └─────────┬───────────┘
          │                         │
          ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Copy WASM to       │  │  Static output in    │
│  public/wasm/       │  │  apps/site/dist/     │
└─────────┬───────────┘  └─────────┬───────────┘
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  wrangler pages deploy apps/site/dist                    │
│  --project-name=hydrated-site                           │
│                                                          │
│  Produces: https://hydrated-site.pages.dev              │
│  Then: https://wyattau.com (custom domain)              │
└─────────────────────────────────────────────────────────┘
```

### CF Pages Configuration

```toml
# wrangler.toml (CF Pages project)
name = "hydrated-site"
compatibility_date = "2026-06-01"
pages_build_output_dir = "apps/site/dist"

[site]
bucket = "./apps/site/dist"

[env.production]
name = "hydrated-site"
routes = [
  { pattern = "wyattau.com", zone_name = "wyattau.com" },
  { pattern = "*.wyattau.com", zone_name = "wyattau.com" },
]

[[headers]]
  [headers.values]
    "X-Content-Type-Options" = "nosniff"
    "X-Frame-Options" = "DENY"
    "Referrer-Policy" = "strict-origin-when-cross-origin"
    "Permissions-Policy" = "camera=(), microphone=(), geolocation=()"
    "Strict-Transport-Security" = "max-age=31536000; includeSubDomains; preload"
```

---

## CF Worker Deployment Flow

### Worker Build Pipeline

```
┌─────────────────────────────────────────────────────────┐
│  Build Worker (after site build)                         │
│  turbo build --filter=worker                             │
│                                                          │
│  Output: worker/dist/index.js                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  wrangler deploy                                         │
│                                                          │
│  Produces: hydrated-site-worker.wyatt.workers.dev      │
│  Then: API routes on wyattau.com/api/*                  │
└─────────────────────────────────────────────────────────┘
```

### Worker Configuration

```toml
# worker/wrangler.toml
name = "hydrated-site-worker"
main = "src/index.ts"
compatibility_date = "2026-06-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "hydrated-site-worker"
routes = [
  { pattern = "wyattau.com/api/*", zone_name = "wyattau.com" },
]

# KV bindings
[[kv_namespaces]]
binding = "GUESTBOOK"
id = "kv-guestbook-id"
preview_id = "kv-guestbook-preview-id"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "kv-ratelimit-id"
preview_id = "kv-ratelimit-preview-id"

[[kv_namespaces]]
binding = "RUM"
id = "kv-rum-id"
preview_id = "kv-rum-preview-id"

# Environment variables (secrets, set via wrangler secret put)
# AA_API_KEY — Artificial Analysis API key
# FRED_API_KEY — Federal Reserve API key
```

### Worker Deployment Steps

1. Build: `turbo build --filter=worker` → `worker/dist/index.js`
2. Validate: `wrangler dev` (local test)
3. Deploy: `wrangler deploy`
4. Verify: `curl https://wyattau.com/api/health`
5. Monitor: Check `wrangler tail` for errors

---

## Custom Domain Configuration

### DNS Records

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| CNAME | @ | hydrated-site.pages.dev | Proxied | Auto |
| CNAME | www | hydrated-site.pages.dev | Proxied | Auto |
| CNAME | api | hydrated-site-worker.wyatt.workers.dev | Proxied | Auto |

### SSL/TLS Setup

1. CF Pages auto-provisions SSL for custom domains
2. Enable "Always Use HTTPS" in CF Pages settings
3. Enable HSTS with preload
4. Verify with `curl -I https://wyattau.com`

### Custom Domain Steps

1. Go to CF Pages → Settings → Custom Domains
2. Add `wyattau.com` and `www.wyattau.com`
3. Verify DNS records exist
4. Wait for SSL certificate provisioning (< 24h)
5. Set as primary domain
6. Enable "Always Use HTTPS"

---

## Rollback Procedure

### Quick Rollback (CF Pages)

```bash
# List recent deployments
wrangler pages deployment list --project-name=hydrated-site

# Rollback to previous deployment
wrangler pages deployment rollback <deployment-id> --project-name=hydrated-site

# Verify rollback
curl -I https://wyattau.com
```

### Worker Rollback

```bash
# List recent deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback hydrated-site-worker

# Verify API health
curl https://wyattau.com/api/health
```

### Rollback Scenarios

| Scenario | Action | Downtime | Data Impact |
|----------|--------|----------|-------------|
| Site build broken | Rollback Pages deployment | < 30s | None (static) |
| Worker deploy broken | Rollback Worker deployment | < 30s | KV data preserved |
| API endpoints failing | Rollback Worker + keep Pages | < 30s | KV data preserved |
| DNS issue | Revert DNS records | < 5min | None |
| WASM broken | Rollback Pages deployment | < 30s | None |

### Emergency Rollback Checklist

- [ ] Identify breaking commit: `git log --oneline -10`
- [ ] Rollback CF Pages: `wrangler pages deployment rollback`
- [ ] Rollback CF Worker (if needed): `wrangler rollback`
- [ ] Verify site loads: `curl -I https://wyattau.com`
- [ ] Verify API works: `curl https://wyattau.com/api/health`
- [ ] Notify if service was down > 5 minutes

---

## Monitoring Setup

### Real User Monitoring (RUM)

```typescript
// src/lib/rum.ts
export function reportVitals(metric: { name: string; value: number; id: string }) {
  fetch('/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      page: window.location.pathname,
      timestamp: Date.now(),
    }),
  }).catch(() => {}); // fire-and-forget
}
```

### RUM Data Storage (CF KV)

```typescript
// Worker: store vitals
async function handleVitals(request, env) {
  const data = await request.json();
  const key = `vitals:${data.name}:${Date.now()}`;
  await env.RUM.put(key, JSON.stringify(data), { expirationTtl: 86400 }); // 24h TTL
  return new Response('ok');
}
```

### Health Check Monitoring

| Check | Frequency | Endpoint | Alert Threshold |
|-------|-----------|----------|-----------------|
| Homepage | 5min | `GET /` | Status != 200 |
| API Health | 5min | `GET /api/health` | Status != 200 |
| Crypto Ticker | 5min | `GET /api/crypto-ticker` | Status != 200 |
| Guestbook | 15min | `GET /api/guestbook` | Status != 200 |
| Static Assets | 15min | `GET /favicon.svg` | Status != 200 |

### Alerting

| Severity | Condition | Action |
|----------|-----------|--------|
| Critical | Homepage down > 5min | Page + email |
| Warning | API endpoint down > 10min | Email |
| Warning | Lighthouse score drops > 5 points | Email |
| Info | Deploy completed | Slack/Email |

### Uptime Kuma Setup

```yaml
# Uptime Kuma monitor config
monitors:
  - name: "Homepage"
    type: http
    url: https://wyattau.com/
    interval: 300  # 5 minutes
    retry: 3

  - name: "API Health"
    type: http
    url: https://wyattau.com/api/health
    interval: 300
    retry: 3

  - name: "Crypto Ticker"
    type: http
    url: https://wyattau.com/api/crypto-ticker
    interval: 300
    retry: 3

  - name: "World Monitor Page"
    type: http
    url: https://wyattau.com/world
    interval: 900  # 15 minutes
    retry: 3
```

---

## Deployment Checklist

### Pre-Deploy

- [ ] All CI stages pass (format, lint, typecheck, test, build)
- [ ] Lighthouse scores >= 95
- [ ] No console errors in E2E tests
- [ ] WASM widgets load correctly
- [ ] API endpoints return valid responses

### Deploy

- [ ] Merge to main branch
- [ ] CF Pages deployment starts automatically
- [ ] CF Worker deployment starts automatically
- [ ] Both deployments complete without errors

### Post-Deploy

- [ ] Verify site loads at `https://wyattau.com`
- [ ] Verify API at `https://wyattau.com/api/health`
- [ ] Verify all 8 pages render correctly
- [ ] Verify WASM widgets load on `/world`, `/etf`, `/home`
- [ ] Verify theme toggle works
- [ ] Verify guestbook submit works
- [ ] Check `wrangler tail` for errors
- [ ] Monitor RUM data for anomalies

---

## Acceptance Criteria

- [ ] CF Pages deployment automated on push to main
- [ ] CF Worker deployment automated on push to main
- [ ] Custom domain configured and SSL working
- [ ] Rollback procedure documented and tested
- [ ] RUM monitoring active
- [ ] Health checks running every 5 minutes
- [ ] Alerting configured for critical/warning thresholds
- [ ] Deployment checklist complete

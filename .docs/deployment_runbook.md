# Deployment Runbook: Hydrated Personal Site

## Pre-Deployment Checklist

### Code Quality

- [ ] `bun run typecheck` — no errors
- [ ] `bun run lint` — no warnings (Biome)
- [ ] `bun run test` — all unit tests pass
- [ ] `bun run test:e2e` — all E2E tests pass
- [ ] No secrets in source code (`grep -r "sk_\|token\|key" --include="*.ts" --include="*.toml"`)

### Build Verification

- [ ] `bun run build` — clean build, no errors
- [ ] `ls apps/site/dist/` — static output exists
- [ ] `ls packages/widgets/pkg/` — WASM files present (13 widgets)
- [ ] `ls apps/site/public/wasm/` — WASM copied to public dir
- [ ] `wrangler pages deployment list` — last deployment successful

### Feature Verification

- [ ] All 9 pages render (/, /projects, /dossier, /world, /docs, /etf, /guestbook, /uses, 404)
- [ ] Theme toggle works (6 themes cycle correctly)
- [ ] Command palette opens (`/` or `Ctrl+K`)
- [ ] API endpoints respond (at least `/api/health`)
- [ ] WASM widgets load (check browser console for errors)

### Performance

- [ ] Lighthouse score ≥95 all categories
- [ ] No console errors in browser
- [ ] Initial bundle <400KB (check build output)
- [ ] WASM widgets lazy-load (IntersectionObserver triggers)

---

## Build Steps

### 1. Build WASM Widgets

```bash
cd packages/widgets
./scripts/build.sh
```

This runs `wasm-pack build --target web --release` for each widget crate. Output goes to `packages/widgets/pkg/`.

**Verify:**
```bash
ls pkg/*.wasm | wc -l  # Should be 13
ls -la pkg/*.wasm      # Each <130KB
```

### 2. Copy WASM to Public Dir

```bash
cp packages/widgets/pkg/*.wasm apps/site/public/wasm/
cp packages/widgets/pkg/*.js apps/site/public/wasm/
```

### 3. Build Astro Site

```bash
cd apps/site
bun run build
```

Output: `apps/site/dist/` (static HTML + JS + CSS).

**Verify:**
```bash
ls dist/index.html           # Home page exists
ls dist/world/index.html     # World monitor page exists
find dist -name "*.html" | wc -l  # Should be 9+ pages
```

### 4. Build CF Worker

```bash
cd worker
bun run build
```

Output: `worker/dist/` (Worker bundle).

---

## Deployment Steps

### Deploy to Cloudflare Pages

```bash
# From project root
wrangler pages deploy apps/site/dist --project-name=hydrated-site
```

**Verify:**
```bash
wrangler pages deployment list --project-name=hydrated-site
# Should show new deployment with "active" status
```

### Deploy CF Worker

```bash
cd worker
wrangler deploy
```

**Verify:**
```bash
curl https://wyattau.com/api/health
# Should return {"status":"ok",...}
```

### Update DNS (if needed)

```bash
# Check current DNS
dig wyattau.com

# Verify CF Pages URL
curl -I https://hydrated-site.pages.dev
```

### Custom Domain

If deploying to a custom domain:

1. Go to Cloudflare Dashboard → Pages → hydrated-site → Custom domains
2. Add `wyattau.com` and `www.wyattau.com`
3. Verify DNS records point to CF Pages

---

## Post-Deployment Verification

### Smoke Tests

```bash
# Health check
curl -s https://wyattau.com/api/health | jq .

# All pages load
for page in "" "projects" "dossier" "world" "docs" "etf" "guestbook" "uses"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://wyattau.com/$page")
  echo "/$page: $status"
done

# API endpoints respond
for endpoint in "health" "crypto-ticker" "earthquakes" "hacker-news"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://wyattau.com/api/$endpoint")
  echo "/api/$endpoint: $status"
done
```

### Browser Verification

1. Open `https://wyattau.com` in Chrome, Firefox, Safari
2. Verify theme toggle works
3. Verify command palette opens
4. Navigate to `/world` — map loads, metrics update
5. Navigate to `/etf` — search works, detail view loads
6. Check `/guestbook` — form submits
7. Scroll to bottom of home page — WASM widgets load (Fourier, Generative Art)
8. Check browser console for errors (should be clean)

### SEO Verification

- [ ] Google Rich Results Test: `https://search.google.com/test/rich-results?url=wyattau.com`
- [ ] OG image renders: `curl -I https://wyattau.com/og-image.png`
- [ ] Sitemap exists: `curl https://wyattau.com/sitemap.xml`
- [ ] Robots.txt exists: `curl https://wyattau.com/robots.txt`

### Performance Verification

- [ ] Lighthouse on Chrome (95+ all categories)
- [ ] WebPageTest on 3G (LCP <1.5s)
- [ ] No layout shift (CLS <0.01)

---

## Rollback Procedure

### Scenario: Broken Build Deployed

```bash
# List recent deployments
wrangler pages deployment list --project-name=hydrated-site

# Rollback to previous deployment
wrangler pages deployment rollback --project-name=hydrated-site <deployment-id>
```

### Scenario: Worker API Broken

```bash
# Rollback Worker to previous version
wrangler rollback --name hydrated-worker
```

### Scenario: Complete Revert to Previous Commit

```bash
# Revert to last known-good commit
git log --oneline -10  # Find the good commit hash
git checkout <good-hash> -- .

# Rebuild and redeploy
bun run build
cd packages/widgets && ./scripts/build.sh && cd ../..
cp packages/widgets/pkg/*.wasm apps/site/public/wasm/
bun run build
wrangler pages deploy apps/site/dist --project-name=hydrated-site
cd worker && wrangler deploy
```

### Rollback Checklist

After rollback:
1. Verify site loads at `https://wyattau.com`
2. Verify API endpoints respond
3. Verify no console errors
4. Notify stakeholders if user-facing impact occurred
5. Create incident report

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Site completely down | Immediate |
| P1 | Major feature broken (map, ETF, WASM) | 1 hour |
| P2 | Minor feature broken (theme, command palette) | 4 hours |
| P3 | Cosmetic issue | Next business day |

### P0: Site Down

1. Check CF Pages status: `https://www.cloudflarestatus.com/`
2. Check Worker logs: `wrangler tail`
3. Verify DNS: `dig wyattau.com`
4. Rollback if needed (see above)
5. Check if CF is experiencing an outage

### P1: Major Feature Broken

1. Identify which feature is broken (map, charts, WASM, API)
2. Check browser console for errors
3. Check Worker logs for API errors
4. If WASM: check `/wasm/` directory, verify files exist
5. If API: check upstream API status
6. Rollback specific feature if possible, or full rollback

### P2: Minor Feature Broken

1. Document the issue
2. Check if it's a regression from recent deploy
3. Fix and deploy, or rollback

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| WASM widgets show "Loading..." forever | WASM files not in `/wasm/` | Copy WASM to `public/wasm/` and redeploy |
| API returns 502 | Upstream API down | Wait for recovery, or disable endpoint |
| Theme not persisting | localStorage blocked | Check browser privacy settings |
| Map not loading | Leaflet.js not loaded | Check script loading order |
| Chart empty | uPlot data format wrong | Check API response schema |
| Build fails | TypeScript errors | Fix type errors, run `bun run typecheck` |

---

## Monitoring

### Active Monitoring

- **Uptime:** External monitoring via Uptime Kuma (checks `/api/health` every 60s)
- **Performance:** RUM vitals via `/api/vitals` endpoint
- **Errors:** Browser console errors captured, CF Worker error logging

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Uptime | 99.9% | <99.5% |
| LCP | <1.5s | >2.0s |
| Error rate | <0.1% | >1.0% |
| API p95 latency | <500ms | >1000ms |

### Dashboards

- Cloudflare Analytics: Traffic, bandwidth, security events
- Worker Metrics: Request count, error rate, latency
- KV Metrics: Read/write counts, storage usage

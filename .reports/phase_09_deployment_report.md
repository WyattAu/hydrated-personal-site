# Phase 9: Deployment — Report

**Status:** Complete
**Date:** 2025-01-15
**Author:** Zeitgeist (Brand Strategist, Project Manager, Operations Engineer)

---

## Deliverables

| Artifact | Location | Status |
|----------|----------|--------|
| Deployment Runbook | `.docs/deployment_runbook.md` | Y Complete |

---

## Runbook Coverage

### Pre-Deployment Checklist

- Code quality gates (typecheck, lint, test)
- Build verification (WASM, Astro, Worker)
- Feature verification (pages, themes, command palette, APIs, WASM)
- Performance checks (Lighthouse, bundle size)

### Build Pipeline

| Step | Command | Output |
|------|---------|--------|
| 1. WASM widgets | `cd packages/widgets && ./scripts/build.sh` | `packages/widgets/pkg/*.wasm` |
| 2. Copy WASM | `cp packages/widgets/pkg/*.wasm apps/site/public/wasm/` | WASM in public dir |
| 3. Astro build | `cd apps/site && bun run build` | `apps/site/dist/` |
| 4. Worker build | `cd worker && bun run build` | `worker/dist/` |

### Deployment Commands

| Target | Command |
|--------|---------|
| CF Pages | `wrangler pages deploy apps/site/dist --project-name=hydrated-site` |
| CF Worker | `cd worker && wrangler deploy` |
| Custom domain | CF Dashboard → Pages → Custom domains |

### Post-Deployment Verification

- Smoke tests (curl all pages + API endpoints)
- Browser verification (Chrome, Firefox, Safari)
- SEO validation (Rich Results Test, OG images, sitemap)
- Performance validation (Lighthouse, WebPageTest)

### Rollback Procedures

| Scenario | Procedure |
|----------|-----------|
| Broken build | `wrangler pages deployment rollback` |
| Broken Worker | `wrangler rollback` |
| Complete revert | `git checkout <good-hash> -- .` → rebuild → redeploy |

### Incident Response

| Severity | Response Time | Example |
|----------|--------------|---------|
| P0 (site down) | Immediate | CF outage, DNS failure |
| P1 (major feature) | 1 hour | Map broken, API 502 |
| P2 (minor feature) | 4 hours | Theme toggle broken |
| P3 (cosmetic) | Next business day | Alignment issue |

### Common Issues & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| WASM "Loading..." forever | Files missing in `/wasm/` | Copy WASM to `public/wasm/`, redeploy |
| API 502 | Upstream API down | Wait for recovery, or disable endpoint |
| Theme not persisting | localStorage blocked | Check browser privacy settings |
| Map not loading | Leaflet.js not loaded | Check script loading order |
| Chart empty | uPlot data format wrong | Check API response schema |

---

## Infrastructure Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Static hosting | Cloudflare Pages | HTML, CSS, JS, WASM, images, fonts |
| API layer | Cloudflare Workers | 16+ API proxies with caching |
| Persistence | Cloudflare KV | Guestbook, rate limiting, RUM |
| CDN | Cloudflare Edge | Global edge caching |
| DNS | Cloudflare DNS | Domain resolution |
| SSL | Cloudflare SSL/TLS | Automatic HTTPS |

### Environment Variables

| Variable | Purpose | Storage |
|----------|---------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | CF account | CI secret |
| `CLOUDFLARE_API_TOKEN` | CF API token | CI secret |
| `AA_API_KEY` | Artificial Analysis API | CI secret |
| `FRED_API_KEY` | Federal Reserve API | CI secret (optional) |
| `GUESTBOOK_ADMIN_TOKEN` | Admin delete bearer token | KV secret |

---

## Monitoring Setup

| Monitor | Tool | Check Interval |
|---------|------|---------------|
| Uptime | Uptime Kuma | 60s |
| Performance | RUM via `/api/vitals` | Continuous |
| Errors | Browser console capture | Continuous |
| SSL | Cloudflare auto-renewal | Automatic |

---

## Validation Against Source Documents

| Source Document | Coverage |
|----------------|----------|
| architecture.md §5 (Deployment) | Y Build pipeline and deployment flow documented |
| architecture.md §6 (Security) | Y Security headers and API security in runbook |
| architecture.md §7 (Monitoring) | Y Monitoring setup documented |
| plan.md §8 (Launch) | Y All launch tasks covered in runbook |
| ADR-004 (CF Pages + Workers) | Y Deployment model matches decision |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation in Runbook |
|------|-------------|--------|----------------------|
| WASM build fails in CI | Medium | High | Verify wasm-pack locally before deploy |
| CF Pages deployment timeout | Low | Medium | Retry, check CF status page |
| KV write limits exceeded | Low | Low | Monitor KV usage, rate limit guestbook |
| SSL certificate issue | Low | High | CF auto-renews, monitor expiry |
| DNS propagation delay | Medium | Low | Allow 24h for full propagation |

---

## Recommendations

1. **Test deployment in Phase 0** — deploy skeleton to verify CF Pages + Worker work
2. **Set up Uptime Kuma before launch** — catch outages immediately
3. **Document KV namespace IDs** — required for `wrangler rollback`
4. **Keep previous deployment ID** — enables instant rollback
5. **Run smoke tests on every deploy** — automated in CI/CD

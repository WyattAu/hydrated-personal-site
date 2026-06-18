# Phase 6: CI/CD Engineering — Report Summary

## Overview

Phase 6 defined the CI/CD pipeline configuration and deployment strategy for the Hydrated Personal Site. Pipeline uses Forgejo Actions with Bun, Turborepo, and Cloudflare tooling.

## Pipeline Architecture

### ci.yml — 5-Stage Pipeline

```
Stage 1: Format + Lint (parallel)     ← 5min timeout
    ↓
Stage 2: Unit + Property Tests (parallel)  ← 10min timeout
    ↓
Stage 3: WASM + Site Build (parallel)  ← 15min timeout
    ↓
Stage 4: E2E + A11y Tests (parallel)  ← 20min timeout
    ↓
Stage 5: Lighthouse CI                ← 15min timeout
```

**Total max duration**: ~65 minutes (all parallel paths)

### deploy.yml — Build & Deploy

```
Build (sequential):
  1. Checkout + Setup Rust/Bun
  2. Install dependencies
  3. Lint gate
  4. Build WASM widgets
  5. Build Astro site
  6. Build CF Worker

Deploy (parallel):
  ├── CF Pages: wrangler pages deploy
  └── CF Worker: wrangler deploy
```

### uptime.yml — Health Monitoring

```
Every 5 minutes:
  ├── HTTP Probe (homepage, API health, crypto, pages)
  ├── Static Asset Check (favicon, WASM, robots.txt, sitemap)
  └── API Endpoint Health (8 endpoints in matrix)
```

## Quality Gates

| Stage | Gate | Threshold |
|-------|------|-----------|
| Format | Biome exit code | 0 |
| Type Check | TypeScript exit code | 0 |
| Unit Tests | Coverage | >= 80% |
| Property Tests | Exit code | 0 |
| WASM Build | Exit code + wasm files | 0 + >= 1 |
| Site Build | Exit code + dist files | 0 + >= 10 |
| E2E Tests | Exit code | 0 |
| A11y Tests | Exit code | 0 |
| Lighthouse | Performance | >= 95 |
| Lighthouse | Accessibility | >= 100 |
| Lighthouse | SEO | >= 100 |

## Caching Strategy

| Cache | Key | Path | TTL |
|-------|-----|------|-----|
| Bun | `bun-${{ hashFiles('bun.lock') }}` | `~/.bun/install/cache` | Session |
| Turborepo | `turbo-${{ github.sha }}` | `.turbo/cache` | 7 days |
| Rust | `rust-${{ hashFiles('Cargo.lock') }}` | `~/.cargo/registry` | Session |
| WASM | `wasm-${{ hashFiles('src/**') }}` | `packages/widgets/pkg` | Build |
| Site | `site-${{ hashFiles('src/**') }}` | `apps/site/dist` | Build |

## Parallel Execution

| Stage | Parallel Tasks | Speedup |
|-------|---------------|---------|
| Stage 1 | format + lint | 2x |
| Stage 2 | unit + property | 2x |
| Stage 3 | wasm + site | 2x |
| Stage 4 | e2e + a11y | 2x |
| Deploy | pages + worker | 2x |
| Uptime | probe + static + api | 3x |

## Deployment Strategy

### CF Pages
- **Trigger**: Push to `main`
- **Output**: `https://wyattau.com`
- **Config**: Static assets + security headers
- **Rollback**: `wrangler pages deployment rollback`

### CF Worker
- **Trigger**: Push to `main`
- **Output**: `https://wyattau.com/api/*`
- **Config**: API proxying, KV bindings, rate limiting
- **Rollback**: `wrangler rollback`

### Custom Domain
- **DNS**: CNAME to `hydrated-site.pages.dev`
- **SSL**: Auto-provisioned by Cloudflare
- **HSTS**: Enabled with preload

## Rollback Procedures

| Scenario | Action | Downtime |
|----------|--------|----------|
| Site broken | Rollback Pages | < 30s |
| Worker broken | Rollback Worker | < 30s |
| DNS issue | Revert DNS records | < 5min |
| WASM broken | Rollback Pages | < 30s |

## Monitoring

| Monitor | Frequency | Alert |
|---------|-----------|-------|
| Homepage | 5min | Status != 200 |
| API Health | 5min | Status != 200 |
| Crypto Ticker | 5min | Status != 200 |
| Guestbook | 15min | Status != 200 |
| Static Assets | 15min | Status != 200 |
| Lighthouse | Per PR | Score drops > 5 |

## Artifacts Produced

| File | Purpose |
|------|---------|
| `.specs/07_ci_cd/pipeline_config.toml` | Pipeline configuration |
| `.specs/07_ci_cd/deployment_strategy.md` | Deployment strategy |
| `.reports/phase_06_ci_cd_report.md` | This summary |

## Key Decisions

1. **Bun over npm/pnpm**: 10x faster installs, built-in TypeScript
2. **Biome over ESLint+Prettier**: Single tool, Rust-powered, faster
3. **Turborepo for monorepo**: Build caching, parallel execution
4. **Forgejo Actions**: Self-hosted CI, matches existing repo patterns
5. **CF Pages + Worker**: Zero-config deployment, edge CDN
6. **5-stage pipeline**: Progressive quality gates, fast feedback

## Next Steps

1. Implement Forgejo Actions workflows
2. Set up CF Pages and Worker projects
3. Configure DNS and custom domain
4. Set up Uptime Kuma monitoring
5. Configure alerting thresholds
6. Test rollback procedures
7. Run first full pipeline on PR

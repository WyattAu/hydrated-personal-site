# ADR-004: Deployment — Cloudflare Pages + Workers

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001, BP-CF-WORKER-001 |

## Context

The current site uses CF Pages with a custom Worker. The Worker handles API proxying, KV storage, and security headers. The migration must maintain the same deployment model.

## Decision

Keep the same deployment model:
1. **CF Pages** for static HTML/CSS/JS/WASM (pre-rendered by Astro)
2. **CF Worker** for API proxying (framework-agnostic, already works)
3. **CF KV** for guestbook persistence and rate limiting
4. **Astro adapter** for build configuration

## Implementation

```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
});
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Vercel | Great DX, edge functions | Vendor lock-in, cost | Rejected |
| Netlify | Simple, good free tier | Less edge support | Rejected |
| Self-hosted | Full control | Maintenance burden | Rejected |
| CF Pages + Workers | Free, fast, edge-native | CF-specific | **Accepted** |

## Consequences

- No changes to API endpoints (already working)
- No changes to KV bindings (already configured)
- Build produces static HTML + Worker entry point
- Deployment via `wrangler pages deploy`
- Free tier sufficient for personal site

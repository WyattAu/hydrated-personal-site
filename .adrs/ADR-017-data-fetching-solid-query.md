# ADR-017: Data Fetching — Solid Query

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001 |

## Context

The site fetches data from 20+ API endpoints with various caching requirements. Vanilla `fetch` works but doesn't handle caching, deduplication, or background refresh.

## Decision

Use **TanStack Solid Query** for API data fetching:
1. **Automatic caching** — Response cache with configurable TTL
2. **Background refetch** — Keep data fresh without user action
3. **Deduplication** — Multiple components can request same data
4. **Optimistic updates** — Instant UI feedback
5. **Devtools** — Visual debugging of cache state

## Implementation

```tsx
import { createQuery } from '@tanstack/solid-query';

const btcQuery = createQuery(() => ({
  queryKey: ['btc-price'],
  queryFn: () => fetch('/api/crypto-ticker').then(r => r.json()),
  refetchInterval: 10000, // 10s
}));
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Vanilla fetch | Simple | No caching, no dedup | Rejected |
| SWR | Good caching | React-specific | Rejected |
| Apollo Client | Powerful | Overkill for REST | Rejected |
| Solid Query | Solid-native, caching, dedup | Newer | **Accepted** |

## Consequences

- Automatic data freshness
- No manual cache management
- Better UX (loading states, error handling)
- Devtools for debugging

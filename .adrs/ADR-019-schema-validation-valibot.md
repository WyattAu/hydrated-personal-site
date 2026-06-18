# ADR-019: Schema Validation — Valibot

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001 |

## Context

API responses need validation. Zod is popular but heavy (~14KB). Valibot is 10x smaller with the same API.

## Decision

Use **Valibot** for schema validation:
1. **Tiny bundle** — ~1.4KB (vs Zod's ~14KB)
2. **Tree-shakeable** — Only import what you use
3. **TypeScript-first** — Same API as Zod
4. **Runtime validation** — Validate API responses at runtime
5. **Solid Query integration** — Works with TanStack Query

## Implementation

```ts
import * as v from 'valibot';

const CryptoSchema = v.object({
  symbol: v.string(),
  price: v.number(),
  change: v.number(),
});

type CryptoData = v.InferOutput<typeof CryptoSchema>;
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Zod | Popular, mature | Heavy (~14KB) | Rejected |
| Yup | Familiar | Heavier, less type-safe | Rejected |
| Superstruct | Lightweight | Less popular | Considered |
| Valibot | Tiny, Zod API, tree-shakeable | Newer | **Accepted** |

## Consequences

- 90% smaller than Zod
- Same developer experience
- Type-safe API responses
- Catches bugs at runtime

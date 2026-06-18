# ADR-011: Testing Strategy

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | All Blue Papers |

## Context

The current site has minimal testing. The new site needs comprehensive testing to maintain quality across 4 subsystems.

## Decision

Multi-layer testing strategy:
1. **Unit tests** (Vitest) — Component logic, utility functions, API handlers
2. **Integration tests** (Vitest) — Component rendering, API responses
3. **E2E tests** (Playwright) — Full user flows, visual regression
4. **Accessibility tests** (axe-core) — Automated WCAG checks
5. **Performance tests** (Lighthouse CI) — Core Web Vitals on every PR

## Implementation

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Jest only | Familiar | Slower, less Vite-native | Rejected |
| Cypress | Good DX | Heavier, slower | Rejected |
| Vitest + Playwright | Fast, cross-browser, comprehensive | Two tools | **Accepted** |

## Consequences

- Automated testing on every PR
- Visual regression caught before merge
- Performance regressions caught early
- Accessibility maintained

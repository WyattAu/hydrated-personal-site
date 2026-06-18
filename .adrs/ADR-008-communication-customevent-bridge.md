# ADR-008: API Communication — CustomEvent Bridge

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001, BP-WASM-WIDGETS-001 |

## Context

SolidJS, vanilla JS, and WASM widgets need to communicate. They can't share state directly due to different runtime contexts.

## Decision

Use **CustomEvent on document** for cross-layer communication:
1. **SolidJS → Charts**: `document.dispatchEvent(new CustomEvent('chart:update', { data }))`
2. **Charts → SolidJS**: `document.addEventListener('chart:click', handler)`
3. **SolidJS → WASM**: `document.dispatchEvent(new CustomEvent('wasm:update', { data }))`
4. **WASM → SolidJS**: `document.addEventListener('wasm:result', handler)`

## Implementation

```typescript
// SolidJS dispatches
document.dispatchEvent(new CustomEvent('chart:update', {
  detail: { series: [...], timeframe: '1y' }
}));

// Lightweight Charts listens
document.addEventListener('chart:update', (e) => {
  chart.update(e.detail);
});
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Shared global state | Simple | Tight coupling, hard to test | Rejected |
| PostMessage | Isolated | Overkill for same-origin | Rejected |
| RxJS observables | Powerful | Heavy, complex | Rejected |
| CustomEvent bridge | Standard, simple, testable | Manual event management | **Accepted** |

## Consequences

- Clean decoupling between layers
- No shared mutable state
- Easy to test (dispatch events manually)
- Standard DOM API (no framework-specific patterns)

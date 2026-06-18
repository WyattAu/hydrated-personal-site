# ADR-007: State Management — SolidJS Signals

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001 |

## Context

The current site uses Leptos signals for reactive state. SolidJS has a similar but simpler reactivity model.

## Decision

Use **SolidJS signals** for client-side state:
1. **Same mental model** — `createSignal`, `createEffect`, `createMemo`
2. **Fine-grained reactivity** — Only affected DOM nodes update
3. **No virtual DOM** — Direct DOM manipulation
4. **Small runtime** — ~15KB for full SolidJS

## Implementation

```tsx
// SolidJS signal
const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| React useState | Familiar | VDOM overhead, heavier | Rejected |
| Zustand | Simple | Solid has built-in signals | Rejected |
| Jotai | Atomic state | Solid signals are sufficient | Rejected |
| SolidJS signals | Minimal, fast, familiar | Newer ecosystem | **Accepted** |

## Consequences

- Familiar React-like API
- Better performance than React (no VDOM)
- Small bundle size
- Easy to learn for React developers

# ADR-020: State Management — Solid Primitives

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001 |

## Context

SolidJS has good built-in reactivity but needs additional utilities for complex state patterns.

## Decision

Use **Solid Primitives** for advanced state management:
1. **`createStore`** — Nested reactive objects (world monitor state)
2. **`createSignal`** — Simple reactive values (theme, search query)
3. **`createMemo`** — Derived computations (filtered lists)
4. **`createEffect`** — Side effects (API calls, DOM updates)
5. **`createResource`** — Async data fetching (integrated with Solid Query)

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| React Context | Familiar | VDOM overhead | Rejected |
| Zustand | Simple | Solid has built-in signals | Rejected |
| Jotai | Atomic state | Solid signals are sufficient | Rejected |
| Solid Primitives | Solid-native, minimal, fast | Newer | **Accepted** |

## Consequences

- Fine-grained reactivity (only affected DOM nodes update)
- No virtual DOM overhead
- Easy state sharing between components
- Built-in TypeScript support

# YP-WEB-SOLIDJS-REACTIVITY-001: SolidJS Reactivity Model

**Status:** Accepted  
**Domain:** Web / Presentation Layer  
**Date:** 2026-06-17  
**Author:** DeepThought (Researcher)

---

## 1. Fine-Grained Reactivity Theory

### 1.1 Signal-Based Reactivity

SolidJS implements a push-pull reactive system based on signals:

$$\text{Signal}(v) = \{ \text{value}: v, \text{subscribers}: \emptyset, \text{observers}: \emptyset \}$$

$$\text{Read}(\text{signal}) \rightarrow v \text{ (tracks dependency)}$$

$$\text{Write}(\text{signal}, v') \rightarrow \text{notify}(\text{subscribers})$$

### 1.2 Reactive Graph

$$G = (V, E)$$

Where:
- $V = \text{Signals} \cup \text{Effects} \cup \text{Memos}$
- $E = \{ (s, e) \mid s \in \text{Signals}, e \in \text{Effects/Memos}, s \text{ is read by } e \}$

When $\text{Write}(s, v')$ occurs:

$$\text{Update}(G) = \text{BFS}(\text{neighbors}(s)) \rightarrow \text{re-execute affected effects}$$

### 1.3 Execution Model

$$\text{Signal Write} \rightarrow \text{Batch} \rightarrow \text{Topological Sort} \rightarrow \text{Execute Effects}$$

Key properties:
- **Synchronous**: Updates propagate immediately within a batch
- **Batched**: Multiple writes in same microtask are batched
- **Consistent**: Effects see a consistent snapshot of state

---

## 2. Core Primitives

### 2.1 createSignal

$$\text{createSignal}(v_0) \rightarrow [\text{Getter}, \text{Setter}]$$

```typescript
const [count, setCount] = createSignal(0);
// count() reads (tracks dependency)
// setCount(1) writes (notifies subscribers)
// setCount(prev => prev + 1) functional update
```

**Read tracking:** When `count()` is called inside an effect or memo, the effect/memo subscribes to the signal.

**Write notification:** When `setCount()` is called, all subscribed effects re-execute.

### 2.2 createEffect

$$\text{createEffect}(\text{fn}: () \rightarrow \text{void})$$

```typescript
createEffect(() => {
  console.log('Count changed:', count());
  // Re-runs whenever count() changes
});
```

**Execution semantics:**
1. Runs immediately on creation
2. Tracks all signals read during execution
3. Re-runs when any tracked signal changes
4. Cleaned up when component is disposed

### 2.3 createMemo

$$\text{createMemo}(\text{fn}: T \rightarrow U) \rightarrow \text{Getter}$$

```typescript
const doubled = createMemo(() => count() * 2);
// doubled() returns cached value
// Only re-computes when count() changes
```

**Memoization semantics:**
- Cached value returned on subsequent reads
- Re-computed only when dependencies change
- Acts as a derived signal (can be read by other effects)
- Prevents redundant computations in diamond dependencies

### 2.4 createStore

$$\text{createStore}(\text{initial}) \rightarrow [\text{Store}, \text{SetStore}]$$

```typescript
const [state, setState] = createStore({
  metrics: { btc: 0, eth: 0 },
  timeframe: '1d',
});

setState('metrics', 'btc', 65000); // Granular update
```

**Granular tracking:** `state.metrics.btc` tracks only that path, not the entire store.

---

## 3. No Virtual DOM — Direct DOM Updates

### 3.1 Compilation Model

SolidJS compiles JSX to direct DOM operations at build time:

$$\text{JSX} \xrightarrow{\text{compile}} \text{DOM Operations}$$

```jsx
// Source
<div class={active() ? 'active' : 'inactive'}>{count()}</div>

// Compiled (simplified)
$t.className = active() ? 'active' : 'inactive';
$t.textContent = count();
```

### 3.2 Comparison with Virtual DOM

| Aspect | Virtual DOM (React) | Direct DOM (SolidJS) |
|--------|--------------------|--------------------|
| Update mechanism | Diff VDOM tree → patch DOM | Subscribe to signals → update DOM node |
| Memory overhead | $O(n)$ VDOM nodes | $O(1)$ per signal subscription |
| Update granularity | Component-level | Node-level |
| Re-render cost | $O(n)$ diff | $O(k)$ where $k$ = changed signals |
| First render | Create VDOM + DOM | Create DOM only |

### 3.3 Performance Implications

$$\text{Update Cost}_{\text{React}} = O(n_{\text{children}})$$
$$\text{Update Cost}_{\text{SolidJS}} = O(1) \text{ per signal subscriber}$$

For a component tree with 1000 children where only 1 changes:
- **React**: Diffs all 1000 children, patches 1
- **SolidJS**: Updates only the 1 DOM node bound to the changed signal

---

## 4. Component Ownership Model

### 4.1 Ownership Tree

$$\text{Owner}(C) = \text{Parent Component that created } C$$

```
App (root owner)
├── Nav (owned by App)
│   └── ThemeToggle (owned by Nav)
├── Hero (owned by App)
├── WorldPage (owned by App)
│   ├── MetricCards (owned by WorldPage)
│   │   └── createEffect inside MetricCards
│   │       → owned by MetricCards
│   └── PriceChart (owned by WorldPage)
└── Footer (owned by App)
```

### 4.2 Disposal Semantics

$$\text{Dispose}(\text{Owner}) \rightarrow \text{Dispose}(\text{Children}) \cup \text{Cleanup}(\text{Effects})$$

When a component is removed from the DOM:
1. All effects created by that component are cleaned up
2. All child components are disposed recursively
3. Signal subscriptions are removed
4. No memory leaks from orphaned effects

### 4.3 Why This Matters for Islands

In Astro islands, each SolidJS island is an independent ownership tree:

$$\text{Island}_i = \text{Root Owner}_i \cup \text{Children}_i \cup \text{Effects}_i$$

Islands do not share ownership. They communicate via CustomEvents (decoupled).

---

## 5. Hydration Strategy

### 5.1 Astro + SolidJS Hydration

$$\text{Hydrate}(\text{Island}, \text{Directive}) \rightarrow \text{Mounted Component}$$

| Directive | Trigger | Use Case |
|-----------|---------|----------|
| `client:load` | Page load | Above-fold interactive elements |
| `client:visible` | IntersectionObserver | Below-fold islands |
| `client:idle` | requestIdleCallback | Non-urgent interactivity |
| `client:media` | CSS media query | Responsive-only components |

### 5.2 Hydration Cost Model

$$\text{Cost}_{\text{hydration}} = \sum_{i=1}^{k} \text{Cost}(\text{Island}_i) \cdot \mathbb{1}[\text{hydrated}]$$

With `client:visible`, only islands in viewport are hydrated:

$$\text{Cost}_{\text{visible}} = \sum_{i \in \text{viewport}} \text{Cost}(\text{Island}_i)$$

### 5.3 Island Isolation

Each island:
1. Has its own SolidJS runtime instance
2. Does not share signals with other islands
3. Communicates via CustomEvent on `document`
4. Is independently disposable

---

## 6. Comparison with React/Svelte

### 6.1 Reactivity Model Comparison

| Feature | React | SolidJS | Svelte |
|---------|-------|---------|--------|
| Reactivity | Immutable state → re-render | Fine-grained signals | Compiled assignments |
| Update mechanism | VDOM diff → DOM patch | Direct DOM update | Direct DOM update |
| Granularity | Component | Node/attribute | Block |
| Memoization | `useMemo` (manual) | `createMemo` (automatic tracking) | `$:` (compiled) |
| State | `useState` (immutable) | `createSignal` (mutable setter) | `let` (mutable assignment) |
| Effects | `useEffect` (after paint) | `createEffect` (synchronous) | `$effect` (after paint) |
| Bundle size | ~40KB | ~15KB | ~10KB |

### 6.2 React Specifics

React's re-render model:

$$\text{State Change} \rightarrow \text{Component Re-render} \rightarrow \text{VDOM Diff} \rightarrow \text{DOM Patch}$$

- Every state change re-renders the entire component subtree
- VDOM diff is $O(n)$ where $n$ = number of VDOM nodes
- `React.memo` and `useMemo` are manual optimizations
- No automatic dependency tracking

### 6.3 Svelte Specifics

Svelte's compiled model:

$$\text{Assignment} \rightarrow \text{Compiled DOM Update}$$

```svelte
<!-- Svelte -->
<script>
  let count = 0;
</script>

<button on:click={() => count++}>{count}</button>
```

- Assignments trigger DOM updates (compiled, not runtime)
- No signals, no VDOM, no runtime reactivity system
- Smaller bundle (~10KB) but less composable
- Block-level granularity

### 6.4 Why SolidJS Was Chosen

1. **Familiar API**: `createSignal`/`createEffect` mirrors Leptos `create_signal`/`create_effect`
2. **Fine-grained**: Better performance for data-heavy dashboards (world monitor, ETF)
3. **Small runtime**: ~15KB vs React's ~40KB
4. **TypeScript-first**: Better DX than Svelte's compiled approach
5. **No hydration conflicts**: Islands own their DOM subtrees

---

## 7. SolidJS in the Architecture

### 7.1 Island Inventory

| Island | Directive | Purpose |
|--------|-----------|---------|
| ThemeToggle | `client:load` | Theme switching (immediate) |
| CommandPalette | `client:load` | Keyboard shortcut (immediate) |
| TickerBar | `client:visible` | Live price updates (below fold) |
| MetricCards | `client:visible` | Dashboard metrics (below fold) |
| SearchBar | `client:visible` | Search/filter (below fold) |
| ContactForm | `client:idle` | Form submission (non-urgent) |
| GuestbookForm | `client:idle` | Form submission (non-urgent) |
| PortfolioComparison | `client:visible` | ETF comparison (below fold) |
| DocsList | `client:visible` | Filterable list (below fold) |
| ProjectsList | `client:visible` | Filterable list (below fold) |

### 7.2 State Architecture

```
┌─────────────────────────────────────────────────────┐
│  Global State (CustomEvent bridge)                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  theme: Signal<string>                       │    │
│  │  metrics: Store<{ btc, eth, fear_greed }>    │    │
│  │  timeframe: Signal<string>                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Island-local State                                 │
│  ┌─────────────────────────────────────────────┐    │
│  │  ThemeToggle: { current: Signal }            │    │
│  │  SearchBar: { query: Signal, results: Memo } │    │
│  │  MetricCards: { data: Resource }             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 8. References

- [SolidJS Docs: Reactivity](https://www.solidjs.com/tutorial/introduction/signals)
- [SolidJS Docs: Concepts](https://www.solidjs.com/guides/concepts)
- [Astro Docs: Islands](https://docs.astro.build/en/concepts/islands/)
- [Ryan Carniato: SolidJS Reactivity](https://dev.to/ryansolid)

# BP-SOLIDJS-COMPONENTS-001: SolidJS Component Library

**IEEE 1016 Software Design Description**

| Field | Value |
|-------|-------|
| ID | BP-SOLIDJS-COMPONENTS-001 |
| Title | SolidJS Component Library — Reactive UI Islands |
| Status | Approved |
| Version | 1.0.0 |
| Date | 2026-06-17 |
| Author | Construct (Systems Architect) |
| Priority | High |
| Layer | Presentation |

---

## BP-1: Design Overview

### 1.1 System Purpose

The SolidJS Component Library provides all client-side interactivity for the Hydrated Personal Site. Components are hydrated as islands via Astro's `client:load` directive, meaning only specific interactive elements run JavaScript. Static content remains pure HTML with zero JS overhead.

SolidJS 1.9 is chosen for its fine-grained reactivity (no virtual DOM), small runtime (~15KB), and familiar React-like API.

### 1.2 Scope

**In scope:**
- 10+ SolidJS interactive components
- State management (signals, stores, memo)
- Data fetching (TanStack Solid Query)
- Accessibility (Kobalte integration)
- Schema validation (Valibot)
- CustomEvent bridge for WASM/chart communication

**Out of scope:**
- Static HTML components (→ BP-ASTRO-SITE-001)
- WASM widget rendering (→ BP-WASM-WIDGETS-001)
- API proxy layer (→ BP-CF-WORKER-001)

### 1.3 Stakeholders

| Stakeholder | Concern |
|-------------|---------|
| Wyatt Au | Interactive features, UX |
| Browser clients | Fast, responsive UI |
| Developers | Code quality, maintainability |

### 1.4 Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Astro HTML  │───▶│  SolidJS     │───▶│  CF Worker   │       │
│  │  (static)    │    │  (islands)   │    │  /api/*      │       │
│  └──────────────┘    └──────┬───────┘    └──────────────┘       │
│                              │                                    │
│                              ▼                                    │
│                     ┌──────────────────┐                         │
│                     │  CustomEvent     │                         │
│                     │  Bridge          │                         │
│                     │  (WASM, Charts)  │                         │
│                     └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## BP-2: Design Decomposition

### 2.1 Component Inventory

| Component | Purpose | Page(s) | Dependencies |
|-----------|---------|---------|--------------|
| ThemeToggle | Theme switching (6 themes) | All (Nav) | localStorage |
| CommandPalette | Keyboard-driven command palette | All | Kobalte Dialog |
| TickerBar | Live crypto ticker bar | Home | Solid Query |
| ContactForm | Contact form with validation | Home | Valibot |
| GuestbookForm | Guestbook submit form | Guestbook | Valibot, Solid Query |
| MetricCards | Live-updating metric cards | World | Solid Query |
| SearchBar | Autocomplete search | ETF, Docs | Solid Query |
| PortfolioComparison | Side-by-side ETF comparison | ETF | Solid Query, Canvas2D |
| DocsList | Filterable docs list | Docs | Solid Query |
| ProjectsList | Filterable/sortable projects | Projects | Solid Query |
| CountryPanel | Country intelligence panel | World | Solid Query |
| ScatterPlots | LLM scatter plots | World | Canvas2D |
| StaleIndicator | Data freshness display | World | — |

### 2.2 Component Hierarchy

```
components/solid/
├── ThemeToggle.tsx
│   ├── createSignal (currentTheme)
│   └── localStorage persistence
│
├── CommandPalette.tsx
│   ├── Kobalte Dialog
│   ├── createSignal (query, isOpen)
│   ├── createMemo (filtered commands)
│   └── Keyboard shortcut (Ctrl+K, /)
│
├── TickerBar.tsx
│   ├── createQuery (crypto-ticker)
│   ├── createMemo (formatted prices)
│   └── CSS animation (scroll)
│
├── ContactForm.tsx
│   ├── createSignal (form state)
│   ├── Valibot schema validation
│   ├── createMutation (submit)
│   └── Kobalte form components
│
├── GuestbookForm.tsx
│   ├── createSignal (form state)
│   ├── Valibot schema validation
│   ├── createMutation (submit)
│   ├── Honeypot field
│   └── Rate limit handling
│
├── MetricCards.tsx
│   ├── createQuery (multiple endpoints)
│   ├── createMemo (formatted values)
│   └── StaleIndicator integration
│
├── SearchBar.tsx
│   ├── createSignal (query)
│   ├── createMemo (filtered results)
│   ├── Kobalte Combobox
│   └── Debounced input
│
├── PortfolioComparison.tsx
│   ├── createSignal (etfA, etfB)
│   ├── createQuery (ETF data)
│   ├── Canvas2D rendering
│   └── CustomEvent dispatch
│
├── DocsList.tsx
│   ├── createQuery (docs)
│   ├── createSignal (filter, sort)
│   └── createMemo (filtered list)
│
├── ProjectsList.tsx
│   ├── createQuery (projects)
│   ├── createSignal (language, sort, search)
│   └── createMemo (filtered list)
│
├── CountryPanel.tsx
│   ├── createSignal (selectedCountry)
│   ├── createQuery (World Bank, REST Countries)
│   └── Animated enter/exit
│
├── ScatterPlots.tsx
│   ├── createQuery (LLM benchmarks)
│   ├── Canvas2D rendering
│   └── CustomEvent dispatch
│
└── StaleIndicator.tsx
    ├── createSignal (lastUpdated)
    └── CSS animation (pulse)
```

### 2.3 Dependency Graph

```
ThemeToggle ──── (standalone, localStorage)
CommandPalette ── (standalone, keyboard events)
TickerBar ──── Solid Query ──── /api/crypto-ticker
ContactForm ── Valibot ──── (form validation)
GuestbookForm ── Valibot ──── Solid Query ──── /api/guestbook
MetricCards ── Solid Query ──── /api/* (multiple)
SearchBar ──── Kobalte ──── (combobox)
PortfolioComparison ── Solid Query ──── /api/stock-chart
DocsList ──── Solid Query ──── /api/hacker-news
ProjectsList ── Solid Query ──── /api/github-trending
CountryPanel ── Solid Query ──── /api/weather
ScatterPlots ── Solid Query ──── /api/llm-benchmarks
StaleIndicator ── (standalone, timestamp)
```

### 2.4 Coupling Metrics

| Interface | Type | Coupling Level |
|-----------|------|----------------|
| SolidJS → Astro | `client:load` directive | Low |
| SolidJS → CF Worker | fetch() via Solid Query | Low |
| SolidJS → WASM | CustomEvent bridge | Low |
| SolidJS → Charts | CustomEvent bridge | Low |
| SolidJS → Kobalte | Direct import | Medium |
| SolidJS → Valibot | Direct import | Medium |
| SolidJS → Solid Query | Direct import | Medium |

---

## BP-3: Design Rationale

### 3.1 Why SolidJS?

**Decision**: SolidJS 1.9 for client-side interactivity.

**Rationale**:
1. **No virtual DOM** — Direct DOM manipulation, faster than React
2. **Fine-grained reactivity** — Only affected DOM nodes update
3. **Small runtime** — ~15KB for full SolidJS
4. **Familiar API** — `createSignal`, `createEffect`, `createMemo` (React-like)
5. **Islands compatible** — `client:load` hydrates only specific elements
6. **TypeScript** — First-class TypeScript support

### 3.2 Why TanStack Solid Query?

**Decision**: TanStack Solid Query for data fetching.

**Rationale**:
1. **Automatic caching** — Response cache with configurable TTL
2. **Background refetch** — Keep data fresh without user action
3. **Deduplication** — Multiple components can request same data
4. **Loading/error states** — Built-in UI state management
5. **Devtools** — Visual debugging of cache state

### 3.3 Why Kobalte?

**Decision**: Kobalte for accessible UI components.

**Rationale**:
1. **Accessible by default** — WCAG 2.1 AA compliant
2. **Headless** — Unstyled, works with any CSS framework
3. **Solid-native** — Built specifically for SolidJS
4. **Composable** — Mix and match components
5. **Well-documented** — Good API docs and examples

### 3.4 Why Valibot?

**Decision**: Valibot for schema validation.

**Rationale**:
1. **Tiny bundle** — ~1.4KB (vs Zod's ~14KB)
2. **Tree-shakeable** — Only import what you use
3. **TypeScript-first** — Same API as Zod
4. **Runtime validation** — Validate API responses at runtime
5. **Solid Query integration** — Works with TanStack Query

### 3.5 Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| React | Huge ecosystem | Heavy bundle, VDOM overhead | Rejected |
| Vue | Lightweight | Less Solid-native | Rejected |
| Svelte | Compile-time | Different mental model | Considered |
| SolidJS | Minimal, fast, familiar | Newer ecosystem | **Accepted** |
| Zustand (state) | Simple | Solid has built-in signals | Rejected |
| Jotai | Atomic state | Solid signals are sufficient | Rejected |

---

## BP-4: Traceability

### 4.1 Requirements → Design Mapping

| Requirement | Design Element |
|-------------|----------------|
| FR-2.2.1: Theme System | ThemeToggle component |
| FR-2.2.2: Navigation + Command Palette | CommandPalette component |
| FR-2.2.3: World Monitor (metrics, charts) | MetricCards, ScatterPlots, CountryPanel |
| FR-2.2.4: ETF Intelligence (search, comparison) | SearchBar, PortfolioComparison |
| FR-2.2.5: Guestbook (submit, display) | GuestbookForm |
| FR-2.2.6: WASM widgets (loading) | IntersectionObserver (vanilla JS) |
| FR-3.1: FID <50ms | SolidJS fine-grained reactivity |
| FR-3.3: Accessibility (WCAG 2.1 AA) | Kobalte integration |
| FR-3.6: TypeScript for all JS | TypeScript components |

### 4.2 Design → ADR Mapping

| Design Decision | ADR |
|-----------------|-----|
| SolidJS for interactivity | ADR-001 |
| Solid signals for state | ADR-007 |
| CustomEvent bridge | ADR-008 |
| Solid Query for data fetching | ADR-017 |
| Kobalte for UI components | ADR-018 |
| Valibot for validation | ADR-019 |
| Solid Primitives for advanced state | ADR-020 |
| Motion One for transitions | ADR-024 |

---

## BP-5: Interface Design

### 5.1 Component Props

```typescript
// ThemeToggle.tsx
interface ThemeToggleProps {
  class?: string;
}

// CommandPalette.tsx
interface CommandPaletteProps {
  commands: Command[];
}

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  icon?: string;
}

// TickerBar.tsx
interface TickerBarProps {
  symbols?: string[];  // Default: ['BTCUSDT', 'ETHUSDT']
  speed?: number;      // Pixels per second, default: 50
}

// ContactForm.tsx
interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot: string;  // Must be empty
}

// GuestbookForm.tsx
interface GuestbookFormProps {
  onSubmitted?: () => void;
}

interface GuestbookFormData {
  name: string;
  message: string;
  honeypot: string;
}

// MetricCards.tsx
interface MetricCardsProps {
  metrics: MetricConfig[];
}

interface MetricConfig {
  id: string;
  label: string;
  endpoint: string;
  format: 'currency' | 'number' | 'percent';
  decimals?: number;
}

// SearchBar.tsx
interface SearchBarProps {
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
}

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  tags?: string[];
}

// PortfolioComparison.tsx
interface PortfolioComparisonProps {
  etfA: string;
  etfB: string;
}

// CountryPanel.tsx
interface CountryPanelProps {
  countryCode: string;
  onClose?: () => void;
}

// ScatterPlots.tsx
interface ScatterPlotsProps {
  xMetric: string;
  yMetric: string;
  label: string;
}
```

### 5.2 State Management Patterns

```typescript
// Simple signal (ThemeToggle)
const [theme, setTheme] = createSignal<string>(
  localStorage.getItem('theme') || 'midnight-navy'
);

// Store (World Monitor)
const [worldState, setWorldState] = createStore({
  earthquakes: [] as Earthquake[],
  metrics: {} as Record<string, number>,
  selectedCountry: null as string | null,
});

// Memo (derived state)
const filteredETFs = createMemo(() =>
  etfs().filter(etf =>
    etf.name.toLowerCase().includes(searchQuery().toLowerCase())
  )
);

// Effect (side effects)
createEffect(() => {
  localStorage.setItem('theme', theme());
  document.documentElement.className = `theme-${theme()}`;
});
```

### 5.3 Data Fetching Patterns

```typescript
// Simple query
const btcQuery = createQuery(() => ({
  queryKey: ['btc-price'],
  queryFn: () => fetchAPI<CryptoTicker[]>('/crypto-ticker'),
  refetchInterval: 10000,  // 10s
}));

// Query with dependent data
const stockChartQuery = createQuery(() => ({
  queryKey: ['stock-chart', selectedSymbol(), timeframe()],
  queryFn: () => fetchAPI<StockChart>(`/stock-chart?symbol=${selectedSymbol()}&range=${timeframe()}`),
  enabled: !!selectedSymbol(),
}));

// Mutation
const guestbookMutation = createMutation(() => ({
  mutationFn: (data: GuestbookFormData) =>
    fetchAPI<GuestbookEntry>('/guestbook', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['guestbook'] });
  },
}));
```

### 5.4 CustomEvent Bridge

```typescript
// SolidJS → WASM (dispatch)
function sendToWASM(widgetId: string, data: unknown) {
  document.dispatchEvent(new CustomEvent('wasm:update', {
    detail: { widgetId, data }
  }));
}

// WASM → SolidJS (listen)
function onWASMResult(handler: (widgetId: string, data: unknown) => void) {
  const listener = (e: CustomEvent) => {
    handler(e.detail.widgetId, e.detail.data);
  };
  document.addEventListener('wasm:result', listener as EventListener);
  onCleanup(() => document.removeEventListener('wasm:result', listener as EventListener));
}

// SolidJS → Charts (dispatch)
function sendToChart(chartId: string, data: unknown) {
  document.dispatchEvent(new CustomEvent('chart:update', {
    detail: { chartId, data }
  }));
}

// Charts → SolidJS (listen)
function onChartEvent(handler: (chartId: string, data: unknown) => void) {
  const listener = (e: CustomEvent) => {
    handler(e.detail.chartId, e.detail.data);
  };
  document.addEventListener('chart:click', listener as EventListener);
  onCleanup(() => document.removeEventListener('chart:click', listener as EventListener));
}
```

---

## BP-6: Data Design

### 6.1 Query Cache Configuration

| Query Key | Endpoint | TTL | Refetch Interval | Stale Time |
|-----------|----------|-----|------------------|------------|
| `btc-price` | `/api/crypto-ticker` | 10s | 10s | 5s |
| `coingecko-global` | `/api/coingecko-global` | 5min | 60s | 2min |
| `earthquakes` | `/api/earthquakes` | 5min | 300s | 2min |
| `fear-greed` | `/api/fear-greed` | 5min | 300s | 2min |
| `kp-index` | `/api/kp-index` | 10min | 600s | 5min |
| `mempool` | `/api/mempool` | 1min | 60s | 30s |
| `stock-chart` | `/api/stock-chart` | 2min-2h | On demand | 1min |
| `hacker-news` | `/api/hacker-news` | 5min | 300s | 2min |
| `github-trending` | `/api/github-trending` | 30min | 1800s | 10min |
| `llm-benchmarks` | `/api/llm-benchmarks` | 6h | None | 1h |
| `guestbook` | `/api/guestbook` | None | None | 0 |
| `weather` | `/api/weather` | 5min | 300s | 2min |
| `exchange-rates` | `/api/exchange-rates` | 1h | 3600s | 15min |

### 6.2 Valibot Schemas

```typescript
import * as v from 'valibot';

const ContactFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  email: v.pipe(v.string(), v.email()),
  subject: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  message: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
  honeypot: v.literal(''),  // Must be empty
});

const GuestbookFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  message: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
  honeypot: v.literal(''),
});

const CryptoTickerSchema = v.array(v.object({
  symbol: v.string(),
  price: v.number(),
  change: v.number(),
  changePercent: v.number(),
  volume: v.number(),
  timestamp: v.number(),
}));

const EarthquakeSchema = v.object({
  id: v.string(),
  magnitude: v.number(),
  place: v.string(),
  time: v.number(),
  lat: v.number(),
  lng: v.number(),
  depth: v.number(),
});

const GuestbookEntrySchema = v.object({
  id: v.string(),
  name: v.string(),
  message: v.string(),
  timestamp: v.number(),
});
```

### 6.3 TypeScript Types

```typescript
// All component props (see 5.1)
// All API response types (see BP-CF-WORKER-001)
// All schema types inferred from Valibot

// Shared types
type Theme = 'midnight-navy' | 'tokyo-night' | 'arctic-dawn' | 'solaris' | 'light';

interface AppError {
  code: string;
  message: string;
  status: number;
}
```

---

## BP-7: Component Design

### 7.1 ThemeToggle

**Purpose**: Switch between 6 themes with persistence.

**Behavior**:
1. On mount, read theme from localStorage
2. If no theme, detect system preference (`prefers-color-scheme`)
3. Apply theme class to `<html>` element
4. On toggle, cycle through themes
5. Persist to localStorage
6. Smooth transition via CSS custom properties

**ARIA**: `role="switch"`, `aria-checked`, `aria-label="Toggle theme"`

### 7.2 CommandPalette

**Purpose**: Keyboard-driven command palette (Ctrl+K or `/`).

**Behavior**:
1. Listen for keyboard shortcut
2. Open modal with search input
3. Filter commands as user types
4. Execute command on Enter
5. Close on Escape or click outside

**ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`

**Commands**:
- Navigate to page (/, /projects, /dossier, /world, /docs, /etf, /guestbook, /uses)
- Toggle theme
- Scroll to section

### 7.3 TickerBar

**Purpose**: Live crypto price ticker with scrolling animation.

**Behavior**:
1. Fetch crypto prices on mount
2. Refetch every 10 seconds
3. Animate scrolling (CSS `translateX` + `animation`)
4. Pause on hover
5. Format prices with locale-aware formatting

### 7.4 ContactForm

**Purpose**: Contact form with validation and honeypot spam protection.

**Behavior**:
1. Validate fields on blur (Valibot)
2. Show error messages below fields
3. Submit on button click
4. Honeypot field (hidden, must be empty)
5. Show success/error state
6. Rate limit: 1 submission per 30 seconds

### 7.5 GuestbookForm

**Purpose**: Guestbook submission with rate limiting.

**Behavior**:
1. Similar to ContactForm
2. Rate limit: 5 submissions per 10 minutes per IP
3. Honeypot spam protection
4. Optimistic update on submit
5. Refetch guestbook list after submit

### 7.6 MetricCards

**Purpose**: Live-updating metric cards for World Monitor.

**Behavior**:
1. Fetch multiple endpoints on mount
2. Refetch at per-metric intervals
3. Format values (currency, number, percent)
4. Show stale indicator when data is old
5. Animate value changes

### 7.7 SearchBar

**Purpose**: Autocomplete search for ETFs and docs.

**Behavior**:
1. Debounced input (300ms)
2. Filter items by label and tags
3. Show dropdown with results
4. Navigate with keyboard (arrow keys, Enter)
5. Select item on click

**ARIA**: `role="combobox"`, `aria-expanded`, `aria-activedescendant`

### 7.8 PortfolioComparison

**Purpose**: Side-by-side ETF allocation comparison.

**Behavior**:
1. Select two ETFs
2. Fetch allocation data for both
3. Render comparison chart (Canvas2D)
4. Show sector/region breakdown
5. Dispatch CustomEvent for chart interaction

### 7.9 CountryPanel

**Purpose**: Country intelligence panel for World Monitor.

**Behavior**:
1. Fetch World Bank + REST Countries data
2. Show country metrics (GDP, population, etc.)
3. Animated enter/exit (Motion One)
4. Close button to dismiss

### 7.10 ScatterPlots

**Purpose**: LLM scatter plots for World Monitor.

**Behavior**:
1. Fetch LLM benchmark data
2. Render scatter plot (Canvas2D)
3. Axes: Intelligence vs Price, Intelligence vs Speed
4. Hover for model details
5. Dispatch CustomEvent for interaction

### 7.11 StaleIndicator

**Purpose**: Show data freshness.

**Behavior**:
1. Accept `lastUpdated` timestamp
2. Calculate age (seconds/minutes/hours)
3. Show colored indicator (green <5min, yellow <30min, red >30min)
4. Pulse animation when stale

---

## BP-8: Deployment

### 8.1 Build Configuration

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import solid from '@astrojs/solidjs';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
  integrations: [solid()],
});
```

### 8.2 Bundle Analysis

| Component | Estimated Size | Notes |
|-----------|---------------|-------|
| SolidJS runtime | ~15KB | Shared across all islands |
| ThemeToggle | ~1KB | Simple signal + localStorage |
| CommandPalette | ~3KB | Kobalte Dialog + filtering |
| TickerBar | ~2KB | Query + animation |
| ContactForm | ~2KB | Form + validation |
| GuestbookForm | ~2KB | Form + validation + mutation |
| MetricCards | ~3KB | Multiple queries |
| SearchBar | ~2KB | Kobalte Combobox |
| PortfolioComparison | ~4KB | Canvas2D rendering |
| DocsList | ~2KB | Query + filtering |
| ProjectsList | ~2KB | Query + filtering |
| CountryPanel | ~3KB | Query + animation |
| ScatterPlots | ~3KB | Canvas2D rendering |
| StaleIndicator | ~1KB | Timestamp calc |
| **Total** | **~45KB** | Shared runtime + components |

### 8.3 Hydration Strategy

| Component | Hydration | Rationale |
|-----------|-----------|-----------|
| ThemeToggle | `client:load` | Needed immediately (prevents FOUC) |
| CommandPalette | `client:load` | Keyboard shortcut must work immediately |
| TickerBar | `client:load` | Visible on home page |
| ContactForm | `client:load` | Only on home page |
| GuestbookForm | `client:load` | Only on guestbook page |
| MetricCards | `client:load` | Only on world page |
| SearchBar | `client:load` | Only on ETF/docs pages |
| PortfolioComparison | `client:load` | Only on ETF page |
| DocsList | `client:load` | Only on docs page |
| ProjectsList | `client:load` | Only on projects page |
| CountryPanel | `client:load` | Only on world page |
| ScatterPlots | `client:load` | Only on world page |
| StaleIndicator | `client:load` | Only on world page |

---

## BP-9: Compliance

### 9.1 Accessibility (WCAG 2.1 AA)

| Component | ARIA Pattern | Keyboard Support |
|-----------|--------------|------------------|
| ThemeToggle | `role="switch"` | Enter/Space to toggle |
| CommandPalette | `role="dialog"` | Escape to close, arrows to navigate |
| TickerBar | `role="marquee"` (if needed) | Pause on hover |
| ContactForm | Form labels, error messages | Tab to fields, Enter to submit |
| GuestbookForm | Form labels, error messages | Tab to fields, Enter to submit |
| MetricCards | `role="status"` | Read-only (no interaction) |
| SearchBar | `role="combobox"` | Arrows to navigate, Enter to select |
| PortfolioComparison | `role="img"` (chart) | Read-only (no interaction) |
| DocsList | List with links | Tab to items, Enter to select |
| ProjectsList | List with links | Tab to items, Enter to select |
| CountryPanel | `role="region"` | Escape to close |
| ScatterPlots | `role="img"` (chart) | Read-only (no interaction) |
| StaleIndicator | `role="status"` | Read-only (no interaction) |

### 9.2 Reduced Motion

```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// In components
createEffect(() => {
  if (prefersReducedMotion.matches) {
    // Disable animations
  }
});
```

### 9.3 Error Handling

```typescript
// Error boundary pattern
<ErrorBoundary fallback={(err) => <div class="error">Something went wrong</div>}>
  <MetricCards />
</ErrorBoundary>

// Query error handling
const query = createQuery(() => ({
  queryKey: ['data'],
  queryFn: fetchAPI,
  retry: 3,
  retryDelay: 1000,
  throwOnError: false,
}));
```

---

## BP-10: Quality Checklist

- [ ] All 13+ components render correctly
- [ ] ThemeToggle works (6 themes, persistence, FOUC prevention)
- [ ] CommandPalette opens with Ctrl+K and /
- [ ] CommandPalette filters commands
- [ ] CommandPalette executes commands
- [ ] TickerBar shows live prices
- [ ] TickerBar animates scrolling
- [ ] ContactForm validates fields
- [ ] ContactForm shows error messages
- [ ] ContactForm submits successfully
- [ ] GuestbookForm validates fields
- [ ] GuestbookForm handles rate limiting
- [ ] GuestbookForm shows success/error state
- [ ] MetricCards fetch and display data
- [ ] MetricCards refresh at correct intervals
- [ ] SearchBar filters results
- [ ] SearchBar navigates with keyboard
- [ ] PortfolioComparison renders chart
- [ ] DocsList filters and sorts
- [ ] ProjectsList filters and sorts
- [ ] CountryPanel shows country data
- [ ] ScatterPlots render correctly
- [ ] StaleIndicator shows correct freshness
- [ ] All components have ARIA labels
- [ ] All components support keyboard navigation
- [ ] Reduced motion respected
- [ ] Error boundaries catch failures
- [ ] Solid Query caching works correctly
- [ ] Valibot validation works
- [ ] CustomEvent bridge works (SolidJS ↔ WASM)
- [ ] Bundle size <50KB total
- [ ] No console errors
- [ ] TypeScript compiles without errors

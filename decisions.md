# Architecture Decision Records: Hydrated Personal Site

## ADR-001: Framework Choice — Astro + SolidJS

### Status
Accepted

### Context
The current site uses Leptos 0.8 islands architecture. The Leptos islands fight vanilla JS for DOM ownership, causing:
- Price time scale labels missing
- ETF allocations/holdings broken
- World chart not loading
- SSG build fragile (WASM hash mismatches)
- Deployment requires manual HTML injection

### Decision
Migrate to **Astro 5.x + SolidJS 1.9** for the following reasons:
1. **Astro** provides native SSG, file-based routing, and content collections without WASM overhead
2. **SolidJS** provides reactive UI without fighting vanilla JS (uses `client:load` for specific elements)
3. **No hydration conflicts** — SolidJS only touches elements it owns, vanilla JS handles the rest
4. **Better DX** — TypeScript, instant HMR, normal browser DevTools
5. **Smaller bundle** — No 1.1MB hydrate WASM on every page

### Alternatives Considered
| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Leptos (current) | Rust type-safety, WASM performance | Fights vanilla JS, fragile SSG, complex debugging | Rejected |
| Next.js + React | Huge ecosystem, great DX | Heavier bundle, React overhead for simple site | Rejected |
| SvelteKit | Lightweight, fast | Less mature ecosystem | Considered |
| Astro + Solid | Native SSG, lightweight, no conflicts | Newer ecosystem | **Accepted** |

### Consequences
- All interactive UI in SolidJS (no WASM for UI)
- Vanilla JS handles chart libraries (Lightweight Charts, Leaflet)
- Rust WASM only for compute-heavy widgets (correlation, FFT, optimization)
- Clear ownership boundaries between layers

---

## ADR-002: Chart Library — uPlot

### Status
Accepted

### Context
The current site uses custom Canvas2D chart rendering that conflicts between Leptos WASM and vanilla JS. Charts are the primary source of bugs. TradingView's Lightweight Charts has a watermark we don't want.

### Decision
Use **uPlot** for all financial visualizations:
1. **No watermark** — MIT license, no branding
2. **Smallest bundle** — 48KB gzipped (vs 45KB lightweight-charts, but more features)
3. **Fastest rendering** — Benchmarked as fastest JS chart library
4. **Financial features** — Candlestick, line, area charts with crosshair
5. **No Canvas2D conflicts** — uPlot owns its container div
6. **Active maintenance** — Last updated March 2025

### Alternatives Considered
| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Lightweight Charts | Popular, financial-focused | Watermark, TradingView branding | Rejected |
| Apache ECharts | Feature-rich, no watermark | 800KB bundle (too large) | Rejected |
| KLineChart | Purpose-built, no watermark | 40KB, smaller community | Considered |
| Chart.js + Financial | Popular, good plugins | Heavier, less financial-focused | Rejected |
| D3.js | Maximum flexibility | Very complex, overkill | Rejected |
| Custom Canvas2D | Full control | Conflicts between systems | Rejected |
| uPlot | Fastest, smallest, no watermark | Needs custom candlestick extension | **Accepted** |

### Consequences
- All financial charts use uPlot (price, ETF, correlation)
- Canvas2D only for scatter plots and WASM widgets
- No watermark on any chart
- 48KB gzipped bundle
- Fastest chart rendering in the stack

---

## ADR-003: Rust WASM — Standalone Widgets Only

### Status
Accepted

### Context
The current site uses Leptos WASM for islands, which requires the full Leptos framework (reactive runtime, hydration context). This adds ~200-400KB per widget.

### Decision
Use **standalone Rust + web-sys + wasm-bindgen** for WASM widgets:
1. **Smaller bundle** — 70-100KB per widget (vs 200-400KB with Leptos)
2. **No framework dependency** — Pure Canvas2D rendering, no reactive runtime
3. **Simple build** — `wasm-pack build --target web`
4. **Easy loading** — `import init, { create_chart } from './widget.js'; await init(); create_chart(canvas);`
5. **Clean boundaries** — WASM owns its `<div>` subtree, nothing else touches it

### Alternatives Considered
| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Leptos framework widgets | Reactive signals, type-safe | Heavy (200-400KB), complex build | Rejected |
| Plain JS (no WASM) | Simple, fast | No Rust showcase | Rejected |
| Plain Rust + web-sys | Lightweight, simple | No reactive signals | **Accepted** |

### Consequences
- WASM widgets are pure Canvas2D renderers
- No Leptos framework dependency in widgets
- Simple `wasm-pack build --target web` pipeline
- Each widget is 70-100KB gzipped

---

## ADR-004: Deployment — Cloudflare Pages + Workers

### Status
Accepted

### Context
The current site uses CF Pages with a custom Worker. The Worker handles API proxying, KV storage, and security headers.

### Decision
Keep the same deployment model:
1. **CF Pages** for static HTML/CSS/JS/WASM (pre-rendered by Astro)
2. **CF Worker** for API proxying (framework-agnostic, already works)
3. **CF KV** for guestbook persistence and rate limiting
4. **Astro adapter** for build configuration

### Implementation
```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
});
```

### Consequences
- No changes to API endpoints (already working)
- No changes to KV bindings (already configured)
- Build produces static HTML + Worker entry point
- Deployment via `wrangler pages deploy`

---

## ADR-005: Styling — Tailwind CSS 4 + Custom Properties

### Status
Accepted

### Context
The current site uses Tailwind 3.4 with 4488 lines of custom CSS. The design system is brutalist with 6 themes.

### Decision
Port to **Tailwind CSS 4** with the same design tokens:
1. **Same visual identity** — No design changes, just technology migration
2. **Same 6 themes** — CSS custom properties ported directly
3. **Same animations** — CSS keyframes ported directly
4. **Better tree-shaking** — Tailwind 4 purges unused classes
5. **Smaller output** — Target <80KB CSS (from 103KB)

### Implementation
```css
/* themes.css - Same custom properties */
:root {
  --bg-primary: #050505;
  --accent: #00e5ff;
  /* ... same tokens ... */
}
```

### Consequences
- Zero visual changes
- Same design system
- Smaller CSS bundle
- Easier maintenance

---

## ADR-006: Content Management — Astro Content Collections

### Status
Accepted

### Context
The current site has static content hardcoded in Leptos components. Projects, expertise, and employment data should be in structured content.

### Decision
Use **Astro Content Collections** for structured content:
1. **Projects** — Markdown files with frontmatter (name, description, language, repo URL)
2. **Expertise** — Structured data for each skill category
3. **Employment** — Timeline entries with dates and descriptions
4. **Benefits** — Type-safe content, easy updates, future MDX support

### Implementation
```yaml
# content/projects/aileron.md
---
title: Aileron
description: Keyboard-driven web environment
language: Rust
repo: https://github.com/WyattAu/aileron
featured: true
---
```

### Consequences
- Content updates via git commits (no CMS needed)
- Type-safe content access in components
- Easy to add new projects/pages
- Future-proof for blog/docs migration

---

## ADR-007: State Management — SolidJS Signals

### Status
Accepted

### Context
The current site uses Leptos signals for reactive state. SolidJS has a similar but simpler reactivity model.

### Decision
Use **SolidJS signals** for client-side state:
1. **Same mental model** — `createSignal`, `createEffect`, `createMemo`
2. **Fine-grained reactivity** — Only affected DOM nodes update
3. **No virtual DOM** — Direct DOM manipulation
4. **Small runtime** — ~15KB for full SolidJS

### Implementation
```tsx
// SolidJS signal
const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);
```

### Consequences
- Familiar React-like API
- Better performance than React (no VDOM)
- Small bundle size
- Easy to learn for React developers

---

## ADR-008: API Communication — CustomEvent Bridge

### Status
Accepted

### Context
SolidJS, vanilla JS, and WASM widgets need to communicate. They can't share state directly.

### Decision
Use **CustomEvent on document** for cross-layer communication:
1. **SolidJS → Charts**: `document.dispatchEvent(new CustomEvent('chart:update', { data }))`
2. **Charts → SolidJS**: `document.addEventListener('chart:click', handler)`
3. **SolidJS → WASM**: `document.dispatchEvent(new CustomEvent('wasm:update', { data }))`
4. **WASM → SolidJS**: `document.addEventListener('wasm:result', handler)`

### Implementation
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

### Consequences
- Clean decoupling between layers
- No shared mutable state
- Easy to test (dispatch events manually)
- Standard DOM API (no framework-specific patterns)

---

## ADR-009: WASM Loading — IntersectionObserver

### Status
Accepted

### Context
WASM widgets should only load when visible to avoid wasting bandwidth and CPU.

### Decision
Use **IntersectionObserver** for lazy WASM loading:
1. **Trigger**: When widget enters viewport (200px margin)
2. **Loading**: Dynamic `import()` of WASM module
3. **Rendering**: Canvas2D in widget's `<div>` subtree
4. **Cleanup**: Observer disconnects after load
5. **Fallback**: Skeleton loading indicator

### Implementation
```astro
<!-- Widget embed component -->
<div id="widget-1" class="wasm-embed" data-widget="fourier">
  <div class="wasm-loading">Loading...</div>
</div>
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        import('/wasm/widget.js').then(async (mod) => {
          await mod.default();
          mod.create_fourier_viz(entry.target.id, 800, 400);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('.wasm-embed').forEach(el => observer.observe(el));
</script>
```

### Consequences
- WASM only loads when visible
- No wasted bandwidth on page load
- Smooth user experience (skeleton → widget)
- Easy to add new widgets (just add HTML + WASM file)

---

## ADR-010: Monorepo Structure — Turborepo

### Status
Accepted

### Context
The project has multiple packages (Astro site, CF Worker, WASM widgets). They need to be managed together.

### Decision
Use **Turborepo** for monorepo orchestration:
1. **Single repository** — All code in one repo
2. **Workspace packages** — `apps/site`, `worker/`, `packages/widgets/`
3. **Shared dependencies** — pnpm workspaces
4. **Build caching** — Turborepo caches WASM builds separately
5. **Parallel execution** — Independent tasks run in parallel

### Structure
```
hydrated_personal_site/
├── apps/site/          # Astro + SolidJS
├── worker/             # CF Worker
├── packages/widgets/   # Rust WASM
├── turbo.json          # Pipeline config
└── pnpm-workspace.yaml
```

### Consequences
- Single `pnpm install` for all dependencies
- `turbo build` builds everything in correct order
- WASM builds cached separately from site builds
- Easy to add new packages

---

## ADR-011: Testing Strategy

### Status
Accepted

### Context
The current site has minimal testing. The new site needs comprehensive testing.

### Decision
Multi-layer testing strategy:
1. **Unit tests** (Vitest) — Component logic, utility functions, API handlers
2. **Integration tests** (Vitest) — Component rendering, API responses
3. **E2E tests** (Playwright) — Full user flows, visual regression
4. **Accessibility tests** (axe-core) — Automated WCAG checks
5. **Performance tests** (Lighthouse CI) — Core Web Vitals on every PR

### Implementation
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

### Consequences
- Automated testing on every PR
- Visual regression caught before merge
- Performance regressions caught early
- Accessibility maintained

---

## ADR-012: SEO Strategy

### Status
Accepted

### Context
The current site has good SEO (structured data, OG tags, sitemap). The new site must maintain or improve this.

### Decision
**Astro-native SEO** with structured data:
1. **Meta tags** — Per-page via `RouteMeta` component
2. **Structured data** — JSON-LD for WebSite + Person
3. **Open Graph** — Per-page with custom images
4. **Twitter Cards** — Summary large image
5. **Sitemap** — Auto-generated by Astro
6. **RSS** — Auto-generated from content collections
7. **Canonical URLs** — Per-page

### Implementation
```astro
---
// RouteMeta component
const { title, description, ogImage } = Astro.props;
---
<title>{title}</title>
<meta name="description" content={description} />
<meta property="og:title" content={title} />
<meta property="og:image" content={ogImage} />
```

### Consequences
- SEO validated on every PR (Lighthouse CI)
- Structured data validated with Google Rich Results Test
- Sitemap auto-updated on build
- RSS auto-generated from content

---

## ADR-021: Animation Library — GSAP

### Status
Accepted

### Context
The site needs cinematic animations: parallax scrolling, scroll reveals, hover effects, page transitions. CSS animations alone can't handle complex sequences.

### Decision
Use **GSAP (GreenSock Animation Platform)** for complex animations:
1. **ScrollTrigger** — Parallax effects, scroll-based reveals
2. **Spring physics** — Organic, amoebic hover states
3. **Timeline** — Sequenced animations (hero intro, section reveals)
4. **MorphSVG** — Shape morphing (future: card hover effects)
5. **Performance** — Hardware-accelerated, 60fps guaranteed

### Consequences
- Cinematic parallax on hero section
- Smooth scroll-triggered reveals
- Organic hover states with spring physics
- Professional-grade animation quality

---

## ADR-022: Organic Graphics — Rough.js

### Status
Accepted

### Context
The design calls for "amoebic UI" — organic shapes that contrast with the brutalist grid. Pure CSS can't create hand-drawn, sketchy effects.

### Decision
Use **Rough.js** for organic graphics:
1. **Hand-drawn borders** — Project cards, section dividers
2. **Sketchy fills** — Background textures, accent elements
3. **Organic lines** — Connection lines, flow paths
4. **Roughness parameter** — Control organic feel (0=clean, 3=very rough)
5. **Canvas2D rendering** — No DOM overhead

### Implementation
```javascript
import rough from 'roughjs';
const rc = rough.canvas(canvasElement);
rc.rectangle(10, 10, 200, 120, {
  fill: 'rgba(0, 229, 255, 0.1)',
  stroke: '#00e5ff',
  roughness: 1.5,
  bowing: 1.0,
});
```

### Consequences
- Organic, hand-drawn feel on brutalist grid
- Visual contrast between rigid structure and fluid art
- Adds personality without sacrificing performance
- Works with Canvas2D (no WebGL required)

---

## ADR-023: Data Visualization — D3.js

### Status
Accepted

### Context
The correlation network graph requires force-directed layout, edge rendering, and interactive node manipulation. Canvas2D alone can't handle this efficiently.

### Decision
Use **D3.js** for network/data visualizations:
1. **Force-directed layout** — Automatic node positioning
2. **Edge rendering** — Curved/straight lines with labels
3. **Zoom/pan** — Interactive exploration
4. **Tooltips** — Hover information
5. **Animation** — Smooth transitions on data updates

### Consequences
- Interactive correlation network on ETF page
- Force-directed graph for network topology
- Data-driven visualizations that update reactively

---

## ADR-024: Motion & Transitions — Motion One

### Status
Accepted

### Context
The site needs lightweight, performant transitions between states. GSAP is for complex sequences; Motion One is for simple state changes.

### Decision
Use **Motion One** (Solid-native) for simple transitions:
1. **Enter/exit** — Component mount/unmount animations
2. **Hover states** — Button/card hover effects
3. **Page transitions** — Astro View Transitions integration
4. **5KB bundle** — Much lighter than GSAP for simple cases
5. **Solid-native** — Works with Solid's reactive model

### Consequences
- Fast, lightweight transitions for most UI interactions
- GSAP reserved for complex cinematic sequences
- No animation framework conflict

---

## ADR-015: Package Manager — Bun

### Status
Accepted

### Context
The project needs fast package installs and builds. pnpm is good but Bun is significantly faster.

### Decision
Use **Bun** for package management and runtime:
1. **10x faster installs** — Content-addressable store with native binary
2. **Built-in bundler** — No need for separate esbuild/Vite config
3. **Native TypeScript** — No ts-node or tsx needed
4. **Built-in test runner** — Can replace Vitest for simple tests
5. **Node.js compatible** — Drop-in replacement for npm/pnpm

### Consequences
- `bun install` instead of `pnpm install`
- `bun run dev` instead of `pnpm dev`
- Faster CI/CD pipelines
- Same lockfile format (bun.lock)

---

## ADR-016: Code Quality — Biome

### Status
Accepted

### Context
The project needs consistent code formatting and linting. ESLint + Prettier is the traditional choice but Biome is faster and simpler.

### Decision
Use **Biome** for linting + formatting:
1. **Rust-powered** — 10-35x faster than ESLint + Prettier combined
2. **Single tool** — Replaces both ESLint and Prettier
3. **Zero config** — Works out of the box for TypeScript
4. **Better diagnostics** — Clear error messages with fix suggestions
5. **Consistent** — Same rules for formatting and linting

### Consequences
- No `.eslintrc` or `.prettierrc` files
- `biome check .` replaces `eslint . && prettier --check .`
- Faster CI/CD (linting in <100ms)
- Same code style across all files

---

## ADR-017: Data Fetching — Solid Query

### Status
Accepted

### Context
The site fetches data from 20+ API endpoints with various caching requirements. Vanilla `fetch` works but doesn't handle caching, deduplication, or background refresh.

### Decision
Use **TanStack Solid Query** for API data fetching:
1. **Automatic caching** — Response cache with configurable TTL
2. **Background refetch** — Keep data fresh without user action
3. **Deduplication** — Multiple components can request same data
4. **Optimistic updates** — Instant UI feedback
5. **Devtools** — Visual debugging of cache state

### Implementation
```tsx
import { createQuery } from '@tanstack/solid-query';

const btcQuery = createQuery(() => ({
  queryKey: ['btc-price'],
  queryFn: () => fetch('/api/crypto-ticker').then(r => r.json()),
  refetchInterval: 10000, // 10s
}));
```

### Consequences
- Automatic data freshness
- No manual cache management
- Better UX (loading states, error handling)
- Devtools for debugging

---

## ADR-018: UI Components — Kobalte

### Status
Accepted

### Context
The site needs accessible UI components (dropdowns, modals, tabs). Building from scratch is time-consuming and error-prone.

### Decision
Use **Kobalte** for headless UI components:
1. **Accessible** — WCAG 2.1 AA compliant out of the box
2. **Headless** — Unstyled, works with any CSS framework
3. **Solid-native** — Built specifically for SolidJS
4. **Composable** — Mix and match components
5. **Well-documented** — Good API docs and examples

### Components to Use
- `Dialog` — Command palette, modals
- `DropdownMenu` — Navigation menus
- `Tabs` — World monitor sections
- `Select` — ETF timeframe selector
- `Popover` — Tooltips, popovers

### Consequences
- Accessible by default
- Consistent behavior across components
- Less custom code to maintain
- Better keyboard navigation

---

## ADR-019: Schema Validation — Valibot

### Status
Accepted

### Context
API responses need validation. Zod is popular but heavy (~14KB). Valibot is 10x smaller with the same API.

### Decision
Use **Valibot** for schema validation:
1. **Tiny bundle** — ~1.4KB (vs Zod's ~14KB)
2. **Tree-shakeable** — Only import what you use
3. **TypeScript-first** — Same API as Zod
4. **Runtime validation** — Validate API responses at runtime
5. **Solid Query integration** — Works with TanStack Query

### Implementation
```ts
import * as v from 'valibot';

const CryptoSchema = v.object({
  symbol: v.string(),
  price: v.number(),
  change: v.number(),
});

type CryptoData = v.InferOutput<typeof CryptoSchema>;
```

### Consequences
- 90% smaller than Zod
- Same developer experience
- Type-safe API responses
- Catches bugs at runtime

---

## ADR-020: State Management — Solid Primitives

### Status
Accepted

### Context
SolidJS has good built-in reactivity but needs additional utilities for complex state patterns.

### Decision
Use **Solid Primitives** for advanced state management:
1. **`createStore`** — Nested reactive objects (world monitor state)
2. **`createSignal`** — Simple reactive values (theme, search query)
3. **`createMemo`** — Derived computations (filtered lists)
4. **`createEffect`** — Side effects (API calls, DOM updates)
5. **`createResource`** — Async data fetching (integrated with Solid Query)

### Consequences
- Fine-grained reactivity (only affected DOM nodes update)
- No virtual DOM overhead
- Easy state sharing between components
- Built-in TypeScript support

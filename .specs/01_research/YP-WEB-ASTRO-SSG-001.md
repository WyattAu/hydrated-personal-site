# YP-WEB-ASTRO-SSG-001: Astro SSG Architecture

**Status:** Accepted  
**Domain:** Web / Presentation Layer  
**Date:** 2026-06-17  
**Author:** DeepThought (Researcher)

---

## 1. Static Site Generation Theory

### 1.1 Definition

SSG pre-renders all pages at build time into static HTML, CSS, and JS assets. No server runs at request time.

$$\text{SSG: } \forall p \in \text{Pages}, \text{HTML}_p = \text{Build}(\text{Source}_p, \text{Data}_p)$$

### 1.2 Tradeoff Matrix

| Dimension | SSG | SSR | CSR |
|-----------|-----|-----|-----|
| Time to First Byte | $O(1)$ CDN hit | $O(\text{compute})$ | $O(\text{parse} + \text{exec})$ |
| SEO | Excellent (pre-rendered) | Excellent | Poor (JS-dependent) |
| Interactivity | Post-hydration | Immediate | Immediate |
| Server Cost | Zero (static) | Per-request | Zero |
| Data Freshness | Build-time snapshot | Request-time | Request-time |
| Complexity | Low | High | Medium |

### 1.3 When SSG is Optimal

SSG is optimal when:
1. Content changes infrequently (build-time snapshots are acceptable)
2. SEO is critical (pre-rendered HTML for crawlers)
3. Traffic is high (CDN serves from edge, no origin compute)
4. Budget is constrained (zero server cost)

**For this project:** 7 of 8 pages are static. Only `/guestbook` writes data (via CF Worker). SSG covers 87.5% of routes with zero runtime cost.

---

## 2. Astro Islands Architecture

### 2.1 Partial Hydration Theory

Traditional frameworks hydrate the entire page:

$$\text{Hydration Cost}_{\text{traditional}} = \sum_{i=1}^{n} \text{Cost}(\text{Component}_i)$$

Astro islands hydrate only interactive elements:

$$\text{Hydration Cost}_{\text{astro}} = \sum_{i=1}^{k} \text{Cost}(\text{Island}_i), \quad k \ll n$$

Where $k$ is the number of interactive components and $n$ is total components.

### 2.2 Island Boundary Model

```
┌─────────────────────────────────────────────┐
│  Static HTML (Astro)                        │
│  ┌─────────────────────────────────────┐    │
│  │  Static HTML (Astro)                │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Island (SolidJS)           │    │    │
│  │  │  Hydrated on: client:load   │    │    │
│  │  │  Owns: <div> subtree        │    │    │
│  │  └─────────────────────────────┘    │    │
│  │  Static HTML (Astro)                │    │
│  └─────────────────────────────────────┘    │
│  Static HTML (Astro)                        │
└─────────────────────────────────────────────┘
```

### 2.3 Hydration Directives

| Directive | Behavior | Use Case |
|-----------|----------|----------|
| `client:load` | Hydrate immediately | Navigation, theme toggle |
| `client:visible` | Hydrate on IntersectionObserver | Below-fold islands |
| `client:idle` | Hydrate on requestIdleCallback | Non-urgent interactivity |
| `client:media` | Hydrate on CSS media query match | Responsive-only components |
| `client:only` | Never hydrate (SSR only) | N/A |

**For this project:**
- `client:load`: ThemeToggle, Nav, CommandPalette (above-fold)
- `client:visible`: TickerBar, MetricCards, SearchBar (below-fold)
- `client:idle`: ContactForm, GuestbookForm (non-urgent)

---

## 3. Content Collections Data Model

### 3.1 Schema Definition

Astro Content Collections provide type-safe, schema-validated content:

$$\text{Collection} = \{ \text{entries}: [\text{Entry}_1, \ldots, \text{Entry}_n], \text{schema}: \text{ZodSchema} \}$$

$$\text{Entry} = \{ \text{id}: \text{String}, \text{data}: \text{SchemaOutput}, \text{body}: \text{String} \}$$

### 3.2 Project Collection Schema

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    language: z.string(),
    repo: z.string().url(),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});
```

### 3.3 Benefits Over Hardcoded Data

| Aspect | Hardcoded (Leptos) | Content Collections (Astro) |
|--------|-------------------|---------------------------|
| Type Safety | Runtime only | Build-time + runtime |
| Validation | Manual | Schema-enforced |
| Updates | Edit component code | Add/edit markdown file |
| Querying | Filter in component | Collection API |
| Future-proof | N/A | MDX, RSS, sitemap ready |

---

## 4. File-Based Routing Mechanics

### 4.1 Route Mapping

$$\text{Route}(f) = \frac{\text{Path}(f) - \text{Prefix}(\text{src/pages})}{\text{Extension}(f)}$$

| File | Route |
|------|-------|
| `src/pages/index.astro` | `/` |
| `src/pages/projects.astro` | `/projects` |
| `src/pages/world.astro` | `/world` |
| `src/pages/etf.astro` | `/etf` |
| `src/pages/docs.astro` | `/docs` |
| `src/pages/dossier.astro` | `/dossier` |
| `src/pages/guestbook.astro` | `/guestbook` |
| `src/pages/uses.astro` | `/uses` |
| `src/pages/404.astro` | `404` |

### 4.2 Static Generation Mode

$$\text{Output} = \text{static}$$

All pages are pre-rendered at build time. No server-side rendering at request time. This is the optimal mode for:
- Portfolio sites (content changes on deploy)
- High-traffic pages (CDN-cached)
- SEO-critical pages (pre-rendered for crawlers)

### 4.3 Dynamic Routes (Not Used)

Astro supports dynamic routes via `[param].astro`, but this project uses static routes only. Dynamic data (projects, ETFs) comes from Content Collections or API calls at runtime.

---

## 5. Build Pipeline

### 5.1 Pipeline Stages

```
Source Code
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 1: Dependency Installation           │
│  bun install (content-addressable store)    │
│  Time: ~2s (10x faster than npm)           │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 2: WASM Compilation (parallel)       │
│  wasm-pack build --target web --release     │
│  Output: packages/widgets/pkg/*.wasm        │
│  Time: ~30s (cached by Turborepo)          │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 3: CSS Processing                    │
│  Tailwind CSS 4 purge + minify              │
│  Output: styles.css (<80KB)                 │
│  Time: ~1s                                 │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 4: Astro SSG Build                   │
│  Pre-render all pages to HTML               │
│  Bundle SolidJS islands (tree-shaken)       │
│  Output: dist/client/                       │
│  Time: ~5s                                 │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 5: Asset Optimization                │
│  WASM → public/wasm/ (immutable cache)      │
│  Fonts → public/fonts/ (immutable cache)    │
│  Images → public/images/ (daily cache)      │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 6: Deployment                        │
│  wrangler pages deploy dist/client/         │
│  wrangler deploy (CF Worker)                │
│  Time: ~10s (edge propagation: ~30s)       │
└─────────────────────────────────────────────┘
```

### 5.2 CF Pages Deployment Model

$$\text{Deploy}(f) = \text{CF Pages}(\text{dist/client/}) + \text{CF Worker}(\text{worker/src/index.ts})$$

- **Static assets** served from CF Pages edge network (200+ locations)
- **API requests** routed to CF Worker (V8 isolate)
- **KV writes** from Worker persisted globally

### 5.3 Build Cache Strategy

| Artifact | Cache Key | TTL |
|----------|-----------|-----|
| WASM binaries | Content hash | Immutable |
| CSS | Content hash | Immutable |
| HTML | Build timestamp | `max-age=0, must-revalidate` |
| JS bundles | Content hash | Immutable |
| Fonts | Content hash | Immutable |
| Images | Content hash | 86400 (1 day) |

---

## 6. Performance Characteristics

### 6.1 Core Web Vitals

| Metric | Target | Mechanism |
|--------|--------|-----------|
| LCP | $< 1.5\text{s}$ | SSG + critical CSS + font preload |
| FID | $< 50\text{ms}$ | SolidJS hydration (no WASM on load) |
| CLS | $< 0.01$ | Fixed dimensions + `font-display: swap` |
| TTI | $< 1.5\text{s}$ | Lazy WASM via IntersectionObserver |
| INP | $< 200\text{ms}$ | Fine-grained SolidJS reactivity |

### 6.2 Bundle Size Budget

$$\text{Total}_{\text{initial}} = \text{HTML} + \text{CSS} + \text{JS}_{\text{critical}} < 400\text{KB}$$

| Component | Budget | Actual (estimated) |
|-----------|--------|--------------------|
| HTML | <20KB | ~15KB |
| CSS | <80KB | ~65KB |
| SolidJS runtime | <15KB | ~12KB |
| SolidJS islands | <20KB | ~15KB |
| Alpine.js | <16KB | ~16KB |
| Fonts (Inter + JetBrains) | <80KB | ~78KB |
| **Total first load** | **<400KB** | **~201KB** |

### 6.3 LCP Optimization

$$\text{LCP} = \max(\text{LCP}_{\text{image}}, \text{LCP}_{\text{text}}, \text{LCP}_{\text{font}})$$

Strategies:
1. **Hero image preload**: `<link rel="preload" as="image">` for LCP element
2. **Critical CSS inline**: Eliminates render-blocking CSS
3. **Font preload**: `<link rel="preload" as="font">` with `font-display: swap`
4. **No layout shift**: Fixed dimensions on all elements

### 6.4 FCP Optimization

$$\text{FCP} = \text{TTFB} + \text{Parse}(\text{HTML}) + \text{Render}(\text{first paint})$$

Strategies:
1. **SSG**: TTFB = CDN edge latency (~10-50ms)
2. **Minimal JS**: No framework hydration overhead
3. **Critical CSS**: Inline styles for above-fold content
4. **No render-blocking resources**: Async/defer all scripts

---

## 7. Migration from Leptos 0.8

### 7.1 Pain Points Resolved

| Leptos Issue | Astro Solution |
|--------------|---------------|
| WASM hash mismatches in SSG | No WASM in SSG pipeline |
| DOM ownership conflicts | SolidJS islands own their subtrees |
| Manual HTML injection | Astro handles all HTML |
| 1.1MB hydrate WASM on every page | ~12KB SolidJS runtime |
| Fragile build pipeline | Stable Astro SSG |

### 7.2 Migration Mapping

| Leptos Concept | Astro Equivalent |
|----------------|-----------------|
| `#[component]` | `.astro` component or SolidJS `.tsx` |
| `view! { }` | JSX/HTML template |
| `create_signal` | `createSignal` (SolidJS) |
| `create_effect` | `createEffect` (SolidJS) |
| `#[slot]` | `<slot />` (Astro) or children (SolidJS) |
| `leptos_router` | Astro file-based routing |
| `ServerFn` | CF Worker API endpoint |

---

## 8. References

- [Astro Docs: SSG](https://docs.astro.build/en/concepts/islands/)
- [Astro Docs: Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Web.dev: SSG](https://web.dev/learn/pwa/architecture#static-site-generation)
- [Core Web Vitals](https://web.dev/vitals/)

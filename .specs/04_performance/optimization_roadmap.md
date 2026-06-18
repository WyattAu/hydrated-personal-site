# Optimization Roadmap

## Phase 4: Performance Engineering

### 1. Critical Rendering Path Optimization

#### 1.1 Inline Critical CSS

**Target:** First paint within 1s on 4G.

**Strategy:**
- Extract above-the-fold CSS at build time using `critters` (Astro integration)
- Inline critical CSS in `<style>` tag in `<head>` (<8KB)
- Load full CSS asynchronously via `<link rel="preload" as="style">`

**Critical CSS includes:**
- CSS reset (border-radius: 0, box-sizing, margin reset)
- Theme variable definitions (all 6 themes via `data-theme`)
- Spatial tokens (z-index, shadow system)
- Navigation layout (fixed top bar, glassmorphism)
- Hero section (100vh, parallax container)
- Font-face declarations (Inter, JetBrains Mono)
- Base typography (body, headings, code)

**Implementation:**
```html
<head>
  <style>
    /* Critical CSS inlined (<8KB) */
    :root { --bg-primary: #050505; /* ... */ }
    [data-theme="midnight-navy"] { /* ... */ }
    *, *::before, *::after { box-sizing: border-box; border-radius: 0; }
    body { margin: 0; font-family: 'Inter', sans-serif; }
    .nav { position: fixed; top: 0; z-index: 100; /* ... */ }
    .hero { height: 100vh; /* ... */ }
  </style>
  <link rel="preload" href="/assets/main.css" as="style" onload="this.rel='stylesheet'">
</head>
```

#### 1.2 Preload Hints

```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/main.css" as="style">

<!-- DNS prefetch for API domains -->
<link rel="dns-prefetch" href="https://api.coingecko.com">
<link rel="dns-prefetch" href="https://api.binance.com">
<link rel="dns-prefetch" href="https://query1.finance.yahoo.com">
```

#### 1.3 Resource Hints

| Resource | Hint | Timing |
|----------|------|--------|
| Fonts | `<link rel="preload">` | Document head |
| Critical CSS | Inline `<style>` | Document head |
| Full CSS | `<link rel="preload" onload>` | Document head |
| SolidJS islands | `<script type="module">` | End of body |
| GSAP | `<script defer>` | Head |
| Hero images | `fetchpriority="high"` | Hero section |
| Below-fold images | `loading="lazy"` | Content sections |

---

### 2. Font Loading Strategy

#### 2.1 Font Stack

| Font | Weights | File | Size | Subsets |
|------|---------|------|------|---------|
| Inter | 400, 700, 900 | `inter-latin.woff2` | 47KB | Latin, Latin Extended |
| JetBrains Mono | 500, 700 | `jetbrains-mono-latin.woff2` | 31KB | Latin, Latin Extended |

#### 2.2 Font Loading Implementation

```css
/* fonts.css */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-weight: 400 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono-latin.woff2') format('woff2');
  font-weight: 500 700;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}

/* Fallback stack */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

code, pre, .mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
```

#### 2.3 Font Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Font load (local) | <50ms | Self-hosted, same origin |
| Font swap delay | <100ms | `font-display: swap` |
| FOUT duration | <200ms | Fallback → web font |
| CLS from fonts | 0 | `size-adjust` on fallback |

#### 2.4 Font Fallback Metrics

```css
/* Match fallback metrics to reduce CLS */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 107%;
}
```

---

### 3. Image Optimization

#### 3.1 Image Formats

| Image | Format | Dimensions | Budget | Lazy |
|-------|--------|-----------|--------|------|
| `london_night` | WebP + AVIF | 1920×1080 | <150KB WebP, <100KB AVIF | No (hero) |
| `hong_kong_twilight` | WebP + AVIF | 1920×1080 | <150KB WebP, <100KB AVIF | No (hero) |
| `my_face` | WebP + AVIF | 400×400 | <30KB WebP, <20KB AVIF | No (above-fold) |
| OG images (9) | PNG | 1200×630 | <200KB each | Yes |
| Project thumbnails | WebP | 600×400 | <50KB each | Yes |
| Favicon | SVG + ICO + PNG | Various | <5KB total | No |

#### 3.2 Image Implementation

```html
<!-- Hero images: AVIF with WebP fallback, responsive -->
<picture>
  <source srcset="/images/london_night.avif" type="image/avif">
  <source srcset="/images/london_night.webp" type="image/webp">
  <img
    src="/images/london_night.jpg"
    alt="London night skyline"
    width="1920"
    height="1080"
    fetchpriority="high"
    decoding="async"
  >
</picture>

<!-- Below-fold images: lazy loaded -->
<img
  src="/images/project-thumbnail.webp"
  alt="Project screenshot"
  width="600"
    height="400"
  loading="lazy"
  decoding="async"
>
```

#### 3.3 Build-Time Image Processing

```javascript
// astro.config.mjs - Image optimization
import { defineConfig } from 'astro/config';
import sharp from 'sharp';

export default defineConfig({
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: 268402767,
      },
    },
  },
});
```

---

### 4. Code Splitting Strategy

#### 4.1 Route-Level Splitting

| Route | Initial Chunk | Lazy Chunks | Trigger |
|-------|--------------|-------------|---------|
| `/` | Home shell (30KB) | GSAP (28KB), Rough.js (40KB) | Route load, scroll |
| `/world` | World shell (20KB) | uPlot (48KB), Leaflet (40KB), D3 (230KB) | Route load |
| `/etf` | ETF shell (20KB) | uPlot (48KB) | Route load |
| `/projects` | Projects shell (20KB) | — | — |
| `/dossier` | Dossier shell (15KB) | GSAP (28KB) | Route load |
| `/docs` | Docs shell (15KB) | — | — |
| `/guestbook` | Guestbook shell (15KB) | — | — |
| `/uses` | Uses shell (10KB) | — | — |

#### 4.2 Component-Level Splitting (SolidJS)

```typescript
// Lazy load non-critical components
const TickerBar = lazy(() => import('./components/solid/TickerBar'));
const CommandPalette = lazy(() => import('./components/solid/CommandPalette'));
const MetricCards = lazy(() => import('./components/solid/MetricCards'));

// IntersectionObserver-based lazy loading
function LazyWidget({ component, fallback }: Props) {
  const [ref, setRef] = createSignal<HTMLElement>();
  const [visible, setVisible] = createSignal(false);

  createEffect(() => {
    const el = ref();
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div ref={setRef}>
      <Suspense fallback={fallback}>
        <Show when={visible()} fallback={fallback}>
          {component()}
        </Show>
      </Suspense>
    </div>
  );
}
```

#### 4.3 Dynamic Import Strategy

```typescript
// Page-specific dynamic imports
// Home page
const loadGSAP = () => import('gsap');
const loadRough = () => import('roughjs');

// World page
const loadUplot = () => import('uplot');
const loadLeaflet = () => import('leaflet');
const loadD3 = () => import('d3');

// ETF page
const loadUplotETF = () => import('uplot');

// WASM widgets (all lazy via IntersectionObserver)
const loadWasm = (name: string) =>
  import(`../../public/wasm/${name}_bg.wasm`);
```

---

### 5. WASM Lazy Loading

#### 5.1 IntersectionObserver Implementation

```typescript
// components/wasm/WasmWidget.astro
---
interface Props {
  name: string;
  width: number;
  height: number;
  label: string;
}

const { name, width, height, label } = Astro.props;
---

<div
  class="wasm-container"
  data-widget={name}
  data-width={width}
  data-height={height}
  role="img"
  aria-label={label}
>
  <!-- Skeleton shown while WASM loads -->
  <div class="wasm-skeleton" style={`width:${width}px;height:${height}px`}>
    <div class="skeleton-pulse"></div>
    <span class="skeleton-label">Loading {label}...</span>
  </div>
  <canvas class="wasm-canvas" width={width} height={height} style="display:none"></canvas>
</div>

<script>
  const container = document.querySelector(`[data-widget="${name}"]`);
  const canvas = container.querySelector('.wasm-canvas');
  const skeleton = container.querySelector('.wasm-skeleton');

  const observer = new IntersectionObserver(
    async ([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();

        // Dynamic import WASM module
        const { init } = await import(`/wasm/${name}_bg.wasm`);

        // Initialize
        const startTime = performance.now();
        await init(canvas);
        const loadTime = performance.now() - startTime;

        // Show canvas, hide skeleton
        skeleton.style.display = 'none';
        canvas.style.display = 'block';

        // Report metrics
        navigator.sendBeacon('/api/vitals', JSON.stringify({
          type: 'wasm_load',
          widget: name,
          loadTime,
        }));
      }
    },
    {
      rootMargin: '200px', // Start loading 200px before visible
      threshold: 0.1,
    }
  );

  observer.observe(container);
</script>
```

#### 5.2 WASM Loading Strategy

| Phase | Action | Timing |
|-------|--------|--------|
| Page load | Show skeleton | Immediate |
| 200px from viewport | Start fetching .wasm | IntersectionObserver |
| WASM fetched | Compile module | <100ms |
| Module compiled | Instantiate | <50ms |
| Instance ready | Initialize widget | <100ms |
| Widget ready | Show canvas, hide skeleton | Immediate |

#### 5.3 WASM Preloading

```html
<!-- Preload WASM for above-the-fold widgets -->
<link rel="preload" href="/wasm/fourier_bg.wasm" as="fetch" type="application/wasm" crossorigin>
<link rel="preload" href="/wasm/generative_bg.wasm" as="fetch" type="application/wasm" crossorigin>
```

---

### 6. Cache Strategy Optimization

#### 6.1 CF Worker Cache Headers

```typescript
// worker/src/cache.ts
function getCacheHeaders(dataType: string): Headers {
  const headers = new Headers();

  switch (dataType) {
    case 'realtime':
      // Crypto prices, mempool
      headers.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
      headers.set('X-Cache-TTL', '10s');
      break;

    case 'frequent':
      // Weather, earthquakes, fear/greed
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
      headers.set('X-Cache-TTL', '5min');
      break;

    case 'moderate':
      // Exchange rates, FRED data
      headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=14400');
      headers.set('X-Cache-TTL', '1h');
      break;

    case 'reference':
      // LLM benchmarks, GitHub trending
      headers.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
      headers.set('X-Cache-TTL', '6h');
      break;

    case 'static':
      // ETF database, world data
      headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      headers.set('X-Cache-TTL', '24h');
      break;

    case 'no-cache':
      // Guestbook, health check
      headers.set('Cache-Control', 'no-store');
      break;
  }

  return headers;
}
```

#### 6.2 CF Pages Cache Headers (Static Assets)

```toml
# wrangler.toml
[[headers]]
  [headers.values]
    # HTML: always revalidate
    "Cache-Control" = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/assets/*"
  [headers.values]
    # CSS/JS: immutable (content-hashed)
    "Cache-Control" = "public, max-age=31536000, immutable"

[[headers]]
  for = "/fonts/*"
  [headers.values]
    # Fonts: immutable (self-hosted)
    "Cache-Control" = "public, max-age=31536000, immutable"

[[headers]]
  for = "/wasm/*"
  [headers.values]
    # WASM: immutable (content-hashed)
    "Cache-Control" = "public, max-age=31536000, immutable"

[[headers]]
  for = "/images/*"
  [headers.values]
    # Images: 1 day cache
    "Cache-Control" = "public, max-age=86400"
```

#### 6.3 CDN Cache Strategy

| Resource | CDN TTL | Browser TTL | Revalidation |
|----------|---------|-------------|--------------|
| HTML | 60s | 0 (always) | `must-revalidate` |
| CSS/JS | 1 year | 1 year | None (immutable) |
| Fonts | 1 year | 1 year | None (immutable) |
| WASM | 1 year | 1 year | None (immutable) |
| Images | 1 day | 1 day | None |
| API (realtime) | 10s | 10s | `stale-while-revalidate=30` |
| API (frequent) | 5min | 5min | `stale-while-revalidate=15min` |
| API (moderate) | 1h | 1h | `stale-while-revalidate=4h` |
| API (reference) | 6h | 6h | `stale-while-revalidate=24h` |
| API (static) | 24h | 24h | `stale-while-revalidate=7d` |

---

### 7. Service Worker Strategy

#### 7.1 Service Worker Implementation

```javascript
// public/sw.js
const CACHE_NAME = 'hydrated-site-v1';
const STATIC_ASSETS = [
  '/',
  '/projects',
  '/dossier',
  '/world',
  '/docs',
  '/etf',
  '/guestbook',
  '/uses',
  '/assets/main.css',
  '/assets/solid-islands.js',
  '/fonts/inter-latin.woff2',
  '/fonts/jetbrains-mono-latin.woff2',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch: stale-while-revalidate for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.destination === 'document') {
    // HTML: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else if (request.destination === 'style' || request.destination === 'script') {
    // CSS/JS: cache-first (immutable)
    event.respondWith(cacheFirst(request));
  } else if (request.destination === 'font') {
    // Fonts: cache-first (immutable)
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API: network-first with timeout
    event.respondWith(networkFirst(request, 3000));
  } else {
    // Everything else: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}

async function networkFirst(request, timeout) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), timeout)),
    ]);
    return response;
  } catch {
    return caches.match(request);
  }
}
```

---

### 8. Animation Performance

#### 8.1 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .vignette, .film-grain { display: none; }
  .parallax-bg, .parallax-mid { transform: none; }
  .reveal { opacity: 1; transform: none; }
}
```

#### 8.2 GPU-Accelerated Animations

```css
/* Only animate transform and opacity for 60fps */
.amoeba-hover {
  will-change: transform, opacity;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.4s ease;
}

/* Avoid animating: width, height, top, left, margin, padding */
```

#### 8.3 Scroll Performance

```typescript
// Throttled scroll handler for parallax
const throttledScroll = throttle((scrollY: number) => {
  const parallaxBg = document.querySelector('.parallax-bg');
  const parallaxMid = document.querySelector('.parallax-mid');

  if (parallaxBg) {
    parallaxBg.style.transform = `translateY(${scrollY * 0.3}px)`;
  }
  if (parallaxMid) {
    parallaxMid.style.transform = `translateY(${scrollY * 0.15}px)`;
  }
}, 16); // ~60fps

window.addEventListener('scroll', throttledScroll, { passive: true });
```

---

### 9. Monitoring & Continuous Optimization

#### 9.1 Real User Monitoring (RUM)

```typescript
// Collect Core Web Vitals from real users
import { onLCP, onFID, onCLS, onINP } from 'web-vitals';

function sendToAnalytics(metric) {
  navigator.sendBeacon('/api/vitals', JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  }));
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

#### 9.2 Performance Budget Alerts

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| LCP | >1.5s | >2.5s | Investigate hero load |
| CLS | >0.01 | >0.05 | Fix layout shifts |
| INP | >200ms | >500ms | Optimize handlers |
| Bundle size | >400KB | >500KB | Audit dependencies |
| WASM size | >100KB/widget | >140KB/widget | Optimize Rust code |
| API latency | >100ms p95 | >200ms p95 | Check upstream/cache |

#### 9.3 Continuous Optimization Process

1. **Weekly:** Review RUM dashboard, identify regressions
2. **Monthly:** Run full Lighthouse audit, compare to baseline
3. **Quarterly:** Audit bundle sizes, remove unused dependencies
4. **Per release:** Run benchmark suite, verify no regressions

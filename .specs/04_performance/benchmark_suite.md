# Benchmark Suite Design

## 1. Lighthouse CI Configuration

### 1.1 lhci Configuration (`.lighthouserc.js`)

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/projects',
        'http://localhost:4321/dossier',
        'http://localhost:4321/world',
        'http://localhost:4321/docs',
        'http://localhost:4321/etf',
        'http://localhost:4321/guestbook',
        'http://localhost:4321/uses',
      ],
      numberOfRuns: 5,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-gpu',
      },
      // Mobile runs (simulate 4G throttle)
      mobileSettings: {
        preset: 'perf',
        throttling: {
          rttMs: 50,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.01 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'interactive': ['error', { maxNumericValue: 1500 }],
        'speed-index': ['error', { maxNumericValue: 2000 }],
      },
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: process.env.LHCI_BASE_URL,
    },
  },
};
```

### 1.2 Lighthouse CI Budget (`performance-budget.json`)

```json
{
  "path": "/",
  "timings": [
    { "metric": "first-contentful-paint", "budget": 1000 },
    { "metric": "largest-contentful-paint", "budget": 1500 },
    { "metric": "cumulative-layout-shift", "budget": 0.01 },
    { "metric": "total-blocking-time", "budget": 200 },
    { "metric": "interactive", "budget": 1500 },
    { "metric": "speed-index", "budget": 2000 }
  ],
  "resourceSizes": [
    { "resourceType": "script", "budget": 50000 },
    { "resourceType": "stylesheet", "budget": 80000 },
    { "resourceType": "font", "budget": 80000 },
    { "resourceType": "image", "budget": 200000 },
    { "resourceType": "wasm", "budget": 100000 },
    { "resourceType": "total", "budget": 400000 }
  ],
  "resourceCounts": [
    { "resourceType": "script", "budget": 5 },
    { "resourceType": "stylesheet", "budget": 2 },
    { "resourceType": "font", "budget": 2 },
    { "resourceType": "image", "budget": 10 }
  ]
}
```

## 2. Vitest Performance Tests

### 2.1 Bundle Size Tests (`tests/performance/bundle-size.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(__dirname, '../../dist/client');

const BUDGETS = {
  'index.html': 5_000,
  'assets/**/*.css': 80_000,
  'assets/**/*.js': 50_000,
  'assets/**/*.woff2': 80_000,
  'wasm/*.wasm': 140_000, // largest widget
};

describe('Bundle Size Budgets', () => {
  it('HTML files under budget', () => {
    const htmlFiles = getFiles(DIST_DIR, '.html');
    for (const file of htmlFiles) {
      const size = statSync(join(DIST_DIR, file)).size;
      expect(size).toBeLessThan(BUDGETS['index.html']);
    }
  });

  it('CSS under budget', () => {
    const cssFiles = getFiles(DIST_DIR, '.css');
    for (const file of cssFiles) {
      const size = statSync(join(DIST_DIR, file)).size;
      expect(size).toBeLessThan(BUDGETS['assets/**/*.css']);
    }
  });

  it('JS under budget', () => {
    const jsFiles = getFiles(DIST_DIR, '.js');
    for (const file of jsFiles) {
      const size = statSync(join(DIST_DIR, file)).size;
      expect(size).toBeLessThan(BUDGETS['assets/**/*.js']);
    }
  });

  it('WASM under budget', () => {
    const wasmFiles = getFiles(join(DIST_DIR, '../..', 'public'), '.wasm');
    for (const file of wasmFiles) {
      const size = statSync(join(DIST_DIR, '../..', 'public', file)).size;
      expect(size).toBeLessThan(BUDGETS['wasm/*.wasm']);
    }
  });

  it('total first load under 400KB', () => {
    const totalSize = calculateFirstLoadSize(DIST_DIR);
    expect(totalSize).toBeLessThan(400_000);
  });
});
```

### 2.2 API Response Time Tests (`tests/performance/api-latency.test.ts`)

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.API_URL || 'http://localhost:8787';
const TIMEOUT = 5000;

const ENDPOINTS = [
  { path: '/api/health', maxMs: 10, cache: false },
  { path: '/api/crypto-ticker', maxMs: 50, cache: true, ttl: 10_000 },
  { path: '/api/mempool', maxMs: 50, cache: true, ttl: 60_000 },
  { path: '/api/weather?lat=51.5&lon=-0.12', maxMs: 80, cache: true, ttl: 300_000 },
  { path: '/api/earthquakes', maxMs: 80, cache: true, ttl: 300_000 },
  { path: '/api/coingecko-global', maxMs: 80, cache: true, ttl: 300_000 },
  { path: '/api/fear-greed', maxMs: 80, cache: true, ttl: 300_000 },
  { path: '/api/hacker-news', maxMs: 80, cache: true, ttl: 300_000 },
  { path: '/api/kp-index', maxMs: 80, cache: true, ttl: 600_000 },
  { path: '/api/exchange-rates', maxMs: 100, cache: true, ttl: 3_600_000 },
  { path: '/api/llm-benchmarks', maxMs: 120, cache: true, ttl: 21_600_000 },
  { path: '/api/github-trending', maxMs: 120, cache: true, ttl: 1_800_000 },
];

describe('API Response Times', () => {
  for (const endpoint of ENDPOINTS) {
    it(`${endpoint.path} responds within ${endpoint.maxMs}ms`, async () => {
      const start = performance.now();
      const res = await fetch(`${API_BASE}${endpoint.path}`, { signal: AbortSignal.timeout(TIMEOUT) });
      const duration = performance.now() - start;

      expect(res.ok).toBe(true);
      expect(duration).toBeLessThan(endpoint.maxMs);
    }, TIMEOUT);

    if (endpoint.cache) {
      it(`${endpoint.path} cache works (second request faster)`, async () => {
        // First request populates cache
        await fetch(`${API_BASE}${endpoint.path}`);
        // Second request should be cached
        const start = performance.now();
        await fetch(`${API_BASE}${endpoint.path}`);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(endpoint.maxMs * 0.5);
      }, TIMEOUT);
    }
  }
});
```

### 2.3 WASM Load Time Tests (`tests/performance/wasm-load.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { statSync } from 'fs';
import { join } from 'path';

const WASM_DIR = join(__dirname, '../../public/wasm');

const WIDGETS = [
  { name: 'order_book', maxDecompressed: 100_000, maxGzipped: 60_000 },
  { name: 'correlation', maxDecompressed: 130_000, maxGzipped: 80_000 },
  { name: 'backtest', maxDecompressed: 140_000, maxGzipped: 85_000 },
  { name: 'treemap', maxDecompressed: 100_000, maxGzipped: 60_000 },
  { name: 'btc_health', maxDecompressed: 110_000, maxGzipped: 70_000 },
  { name: 'fourier', maxDecompressed: 75_000, maxGzipped: 45_000 },
  { name: 'climate', maxDecompressed: 120_000, maxGzipped: 75_000 },
  { name: 'cellular', maxDecompressed: 65_000, maxGzipped: 40_000 },
  { name: 'physics', maxDecompressed: 85_000, maxGzipped: 55_000 },
  { name: 'generative', maxDecompressed: 95_000, maxGzipped: 60_000 },
  { name: 'colorblind', maxDecompressed: 55_000, maxGzipped: 35_000 },
  { name: 'regex', maxDecompressed: 45_000, maxGzipped: 30_000 },
  { name: 'network', maxDecompressed: 75_000, maxGzipped: 50_000 },
];

describe('WASM Widget Sizes', () => {
  for (const widget of WIDGETS) {
    it(`${widget.name}.wasm under decompressed budget`, () => {
      const size = statSync(join(WASM_DIR, `${widget.name}_bg.wasm`)).size;
      expect(size).toBeLessThan(widget.maxDecompressed);
    });

    it(`${widget.name}_bg.wasm.gz under gzip budget`, () => {
      const size = statSync(join(WASM_DIR, `${widget.name}_bg.wasm.gz`)).size;
      expect(size).toBeLessThan(widget.maxGzipped);
    });
  }

  it('total WASM under budget (all 13 widgets)', () => {
    const totalSize = WIDGETS.reduce((acc, w) => {
      return acc + statSync(join(WASM_DIR, `${w.name}_bg.wasm`)).size;
    }, 0);
    expect(totalSize).toBeLessThan(1_300_000); // 1.3MB total
  });
});
```

## 3. Bundle Size Gates (CI Integration)

### 3.1 Size Limit Configuration (`.size-limit.json`)

```json
[
  {
    "name": "Critical CSS (inline)",
    "path": "dist/assets/critical.css",
    "limit": "8 KB",
    "gzip": true
  },
  {
    "name": "Full CSS",
    "path": "dist/assets/*.css",
    "limit": "80 KB",
    "gzip": true
  },
  {
    "name": "SolidJS Islands JS",
    "path": "dist/assets/solid-*.js",
    "limit": "50 KB",
    "gzip": true
  },
  {
    "name": "GSAP Bundle",
    "path": "dist/assets/gsap-*.js",
    "limit": "28 KB",
    "gzip": true
  },
  {
    "name": "Fonts (Inter + JetBrains Mono)",
    "path": "dist/fonts/*.woff2",
    "limit": "80 KB"
  },
  {
    "name": "Largest WASM Widget",
    "path": "public/wasm/backtest_bg.wasm",
    "limit": "140 KB",
    "gzip": true
  }
]
```

### 3.2 CI Gate Script (`scripts/check-budgets.sh`)

```bash
#!/bin/bash
set -e

echo "=== Performance Budget Check ==="

# Check total dist size
TOTAL_SIZE=$(du -sb dist/client | cut -f1)
MAX_TOTAL=400000

if [ "$TOTAL_SIZE" -gt "$MAX_TOTAL" ]; then
  echo "FAIL: Total dist size ${TOTAL_SIZE} exceeds ${MAX_TOTAL} bytes"
  exit 1
fi

# Check individual WASM files
for wasm in public/wasm/*.wasm; do
  SIZE=$(stat -f%z "$wasm" 2>/dev/null || stat -c%s "$wasm")
  if [ "$SIZE" -gt 140000 ]; then
    echo "FAIL: $wasm size ${SIZE} exceeds 140000 bytes"
    exit 1
  fi
done

echo "PASS: All budgets within limits"
```

## 4. API Response Time Monitoring

### 4.1 Performance Monitoring Worker Middleware

```typescript
// worker/src/middleware/performance.ts
export interface PerfMetric {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  cacheHit: boolean;
}

export async function measurePerformance(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = performance.now();
  const url = new URL(request.url);

  const response = await handler();
  const duration = performance.now() - start;

  const metric: PerfMetric = {
    endpoint: url.pathname,
    method: request.method,
    status: response.status,
    duration,
    timestamp: Date.now(),
    cacheHit: response.headers.get('X-Cache') === 'HIT',
  };

  // Store in KV for dashboard aggregation
  // Aggregate hourly: P50, P95, P99, error rate
  return response;
}
```

### 4.2 Monitoring Dashboard Metrics

| Metric | Collection | Aggregation | Alert Threshold |
|--------|-----------|-------------|-----------------|
| API response time | Per-request | P50, P95, P99 per endpoint | P95 > 200ms |
| Cache hit ratio | Per-request | Hourly % | <80% for cached endpoints |
| Error rate | Per-request | Hourly % | >5% |
| Upstream failures | Per-request | Hourly count | >10/hour |
| WASM load time | RUM (browser) | P75 per widget | >3s |
| Total page weight | RUM (browser) | P75 per page | >400KB |

## 5. WASM Load Time Measurement

### 5.1 Browser-Side WASM Timing (`lib/wasm-loader.ts`)

```typescript
interface WasmLoadMetrics {
  widget: string;
  fetchTime: number;      // Time to download .wasm file
  compileTime: number;    // Time to compile WASM module
  instantiateTime: number; // Time to instantiate
  totalTime: number;      // End-to-end
}

export async function loadWasmWithMetrics(
  name: string,
  wasmUrl: string
): Promise<{ module: WebAssembly.Module; instance: WebAssembly.Instance; metrics: WasmLoadMetrics }> {
  const fetchStart = performance.now();

  const response = await fetch(wasmUrl);
  const fetchTime = performance.now() - fetchStart;

  const bytes = await response.arrayBuffer();

  const compileStart = performance.now();
  const module = await WebAssembly.compile(bytes);
  const compileTime = performance.now() - compileStart;

  const instantiateStart = performance.now();
  const instance = await WebAssembly.instantiate(module);
  const instantiateTime = performance.now() - instantiateStart;

  const totalTime = performance.now() - fetchStart;

  const metrics: WasmLoadMetrics = {
    widget: name,
    fetchTime,
    compileTime,
    instantiateTime,
    totalTime,
  };

  // Send to /api/vitals via sendBeacon
  navigator.sendBeacon('/api/vitals', JSON.stringify({ type: 'wasm', ...metrics }));

  return { module, instance, metrics };
}
```

### 5.2 WASM Load Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Fetch time (4G) | <500ms | 100KB @ 30Mbps |
| Compile time | <100ms | V8 optimized compilation |
| Instantiate time | <50ms | Linear memory init |
| Total load time | <700ms | End-to-end |
| Time to first render | <1s | Including Canvas2D setup |

## 6. Memory Usage Profiling

### 6.1 Memory Profiling Tests

```typescript
// tests/performance/memory.test.ts
import { describe, it, expect } from 'vitest';

describe('Memory Usage', () => {
  it('WASM widgets do not leak memory after unmount', async () => {
    // Simulate mounting and unmounting WASM widgets
    // Measure memory delta
    const initialMemory = (performance as any).memory?.usedJSHeapSize;

    for (let i = 0; i < 10; i++) {
      // Mount widget
      await mountWidget('fourier');
      // Unmount widget
      unmountWidget('fourier');
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize;
    const delta = finalMemory - initialMemory;

    // Should not grow more than 5MB after 10 mount/unmount cycles
    expect(delta).toBeLessThan(5 * 1024 * 1024);
  });

  it('total WASM memory stays under 100MB', () => {
    // Load all 13 WASM widgets simultaneously (worst case)
    const totalWasmMemory = 13 * 8 * 1024 * 1024; // 13 widgets × 8MB default memory
    expect(totalWasmMemory).toBeLessThan(100 * 1024 * 1024);
  });
});
```

### 6.2 Memory Budgets

| Component | Budget | Measurement |
|-----------|--------|-------------|
| Single WASM widget | <16MB | Peak heap after init |
| All WASM (simultaneous) | <100MB | Peak heap, all mounted |
| SolidJS app state | <10MB | Heap after full page load |
| Chart data (uPlot) | <5MB | 1Y daily OHLCV data |
| Leaflet.js map | <20MB | Full world map tiles |
| Total page memory | <200MB | Peak heap, all features |

### 6.3 Memory Leak Detection (CI)

```typescript
// tests/performance/memory-leak.test.ts
import { test, expect } from '@playwright/test';

test.describe('Memory Leaks', () => {
  test('navigating between pages does not leak memory', async ({ page }) => {
    await page.goto('/');
    const initialMemory = await page.evaluate(() =>
      (performance as any).memory?.usedJSHeapSize
    );

    // Navigate through all pages 3 times
    const routes = ['/', '/projects', '/dossier', '/world', '/docs', '/etf', '/guestbook', '/uses'];
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
      }
    }

    const finalMemory = await page.evaluate(() =>
      (performance as any).memory?.usedJSHeapSize
    );

    const delta = finalMemory - initialMemory;
    // Should not grow more than 20MB after 24 navigations
    expect(delta).toBeLessThan(20 * 1024 * 1024);
  });
});
```

## 7. CI Performance Pipeline

### 7.1 GitHub Actions Workflow

```yaml
name: Performance Tests
on: [pull_request, push]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build site
        run: pnpm build

      - name: Budget check
        run: bash scripts/check-budgets.sh

      - name: Size Limit
        run: pnpm size-limit

      - name: Unit tests (bundle + API)
        run: pnpm vitest run tests/performance/

      - name: Start server
        run: pnpm preview &
        env:
          PORT: 4321

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: .lighthouserc.js

      - name: Playwright memory tests
        run: pnpm playwright test tests/performance/memory-leak.test.ts
```

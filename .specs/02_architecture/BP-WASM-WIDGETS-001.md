# BP-WASM-WIDGETS-001: Rust WASM Widget System

**IEEE 1016 Software Design Description**

| Field | Value |
|-------|-------|
| ID | BP-WASM-WIDGETS-001 |
| Title | Rust WASM Widget System — 13 Showcase Widgets |
| Status | Approved |
| Version | 1.0.0 |
| Date | 2026-06-17 |
| Author | Construct (Systems Architect) |
| Priority | High |
| Layer | Compute |

---

## BP-1: Design Overview

### 1.1 System Purpose

The Rust WASM Widget System provides 13 standalone computational widgets that showcase Rust-to-WASM compilation using plain `web-sys` + `wasm-bindgen` (no framework). Each widget owns its `<div>` subtree, renders via Canvas2D, and is lazy-loaded via IntersectionObserver when visible.

The primary goal is demonstrating Rust/WASM capabilities while maintaining small bundle sizes (70-130KB per widget) and zero framework overhead.

### 1.2 Scope

**In scope:**
- 13 WASM widgets across 4 categories (Finance, Science, Creative, DevTools)
- wasm-pack build pipeline (`wasm-pack build --target web`)
- IntersectionObserver-based lazy loading
- Skeleton loading indicators
- Error boundaries for WASM failures
- Canvas2D rendering per widget
- CustomEvent bridge for SolidJS communication
- Memory management per widget

**Out of scope:**
- UI framework integration (→ BP-SOLIDJS-COMPONENTS-001)
- API data fetching (→ BP-CF-WORKER-001)
- Site routing (→ BP-ASTRO-SITE-001)

### 1.3 Stakeholders

| Stakeholder | Concern |
|-------------|---------|
| Wyatt Au | Rust showcase, technical demonstration |
| Developers | WASM compilation, web-sys patterns |
| Browser clients | Fast loading, no jank |

### 1.4 Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  SolidJS     │───▶│  CustomEvent │───▶│  WASM Widget │       │
│  │  (host page) │◀───│  Bridge      │◀───│  (Canvas2D)  │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│                                                   │                │
│                                                   ▼                │
│                                          ┌──────────────┐        │
│                                          │  CF Worker   │        │
│                                          │  /api/*      │        │
│                                          └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## BP-2: Design Decomposition

### 2.1 Widget Inventory

#### Finance (5 widgets)

| ID | Widget | Data Source | WASM Size | Page | Complexity |
|----|--------|-------------|-----------|------|------------|
| A1 | Order Book Depth | Binance WebSocket | ~80KB | World | High |
| A2 | Correlation Network | Yahoo Finance | ~120KB | ETF | High |
| A3 | Strategy Backtester | Yahoo Finance | ~130KB | ETF | Very High |
| A4 | Market Treemap | CoinGecko | ~90KB | World | Medium |
| A5 | BTC Health Dashboard | mempool.space + blockchain.info | ~100KB | World | Medium |

#### Science (3 widgets)

| ID | Widget | Data Source | WASM Size | Page | Complexity |
|----|--------|-------------|-----------|------|------------|
| B1 | Fourier Transform | None (pure computation) | ~70KB | Home | Medium |
| B2 | Climate Data Explorer | NASA GISS CSV | ~110KB | Dossier | High |
| B3 | Physics Sandbox | None (pure computation) | ~80KB | Dossier | Medium |

#### Creative (2 widgets)

| ID | Widget | Data Source | WASM Size | Page | Complexity |
|----|--------|-------------|-----------|------|------------|
| C1 | Generative Art Studio | None (pure computation) | ~90KB | Home | Medium |
| C2 | Color Blindness Simulator | User image | ~50KB | Dossier | Low |

#### DevTools (2 widgets)

| ID | Widget | Data Source | WASM Size | Page | Complexity |
|----|--------|-------------|-----------|------|------------|
| D1 | Regex Playground | None (Rust regex crate) | ~40KB | Home | Low |
| D2 | Network Topology Mapper | User input | ~70KB | Projects | Medium |

**Total WASM**: ~1.05MB (all 13 widgets, lazy-loaded per page)

### 2.2 Component Hierarchy

```
packages/widgets/
├── Cargo.toml
├── src/
│   ├── lib.rs                 # Exports all widget functions
│   ├── finance/
│   │   ├── mod.rs
│   │   ├── order_book.rs      # Binance order book depth
│   │   ├── correlation.rs     # Asset correlation network
│   │   ├── backtest.rs        # Strategy backtesting
│   │   ├── treemap.rs         # Crypto market treemap
│   │   └── btc_health.rs      # BTC network health gauges
│   ├── science/
│   │   ├── mod.rs
│   │   ├── fourier.rs         # FFT visualization
│   │   ├── climate.rs         # Temperature anomaly chart
│   │   └── physics.rs         # 2D particle simulation
│   ├── creative/
│   │   ├── mod.rs
│   │   ├── generative.rs      # Perlin noise + particles
│   │   └── colorblind.rs      # Color vision deficiency
│   └── devtools/
│       ├── mod.rs
│       ├── regex.rs           # Regex matching
│       ├── network.rs         # Force-directed graph
│       └── cellular.rs        # Game of Life
├── pkg/                       # wasm-pack output (gitignored)
└── scripts/
    └── build.sh
```

### 2.3 Dependency Graph

```
lib.rs
├── finance/mod.rs
│   ├── order_book.rs ──── web-sys (WebSocket, Canvas2D)
│   ├── correlation.rs ─── web-sys (Canvas2D) + external data
│   ├── backtest.rs ────── web-sys (Canvas2D) + external data
│   ├── treemap.rs ─────── web-sys (Canvas2D) + external data
│   └── btc_health.rs ──── web-sys (Canvas2D) + external data
├── science/mod.rs
│   ├── fourier.rs ──────── web-sys (Canvas2D)
│   ├── climate.rs ──────── web-sys (Canvas2D) + external data
│   └── physics.rs ──────── web-sys (Canvas2D)
├── creative/mod.rs
│   ├── generative.rs ───── web-sys (Canvas2D)
│   └── colorblind.rs ───── web-sys (Canvas2D, ImageData)
└── devtools/mod.rs
    ├── regex.rs ─────────── web-sys (Canvas2D) + regex crate
    ├── network.rs ────────── web-sys (Canvas2D)
    └── cellular.rs ──────── web-sys (Canvas2D)
```

### 2.4 Coupling Metrics

| Interface | Type | Coupling Level |
|-----------|------|----------------|
| WASM → Canvas2D | Direct API | Tight (web-sys binding) |
| WASM → SolidJS | CustomEvent | Loose (document events) |
| WASM → CF Worker | fetch() HTTP | Loose |
| WASM → WASM module | Dynamic import | Loose |
| Astro → WASM | IntersectionObserver | Loose |

---

## BP-3: Design Rationale

### 3.1 Why Plain Rust + web-sys?

**Decision**: Use standalone Rust + `web-sys` + `wasm-bindgen` (no Leptos framework).

**Rationale**:
1. **Smaller bundle** — 70-130KB per widget (vs 200-400KB with Leptos)
2. **No framework dependency** — Pure Canvas2D rendering, no reactive runtime
3. **Simple build** — `wasm-pack build --target web`
4. **Easy loading** — `import init, { create_widget } from './widget.js'; await init(); create_widget(canvas);`
5. **Clean boundaries** — WASM owns its `<div>` subtree, nothing else touches it

### 3.2 Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Leptos framework widgets | Reactive signals, type-safe | Heavy (200-400KB), complex build | Rejected |
| Plain JS (no WASM) | Simple, fast | No Rust showcase | Rejected |
| Plain Rust + web-sys | Lightweight, simple | No reactive signals | **Accepted** |
| Yew framework | Component model | Heavy, complex | Rejected |
| Sycamore | Lightweight reactive | Less mature | Considered |

### 3.3 Why Canvas2D?

Canvas2D provides:
- Direct pixel control for visualizations
- No DOM overhead (fast rendering)
- Consistent cross-browser behavior
- Natural fit for mathematical visualizations
- WASM can directly manipulate pixel data

### 3.4 Why IntersectionObserver?

Lazy loading via IntersectionObserver:
- Reduces initial page load (WASM only loads when visible)
- Saves bandwidth (user may never scroll to widget)
- Provides natural loading state (skeleton → widget)
- Standard browser API (no polyfill needed)

---

## BP-4: Traceability

### 4.1 Requirements → Design Mapping

| Requirement | Design Element |
|-------------|----------------|
| FR-2.2.6: 13 WASM widgets | 13 widget modules in `src/` |
| FR-3.1: WASM <100KB per widget | Plain web-sys, no framework |
| FR-3.1: TTI <1.5s | IntersectionObserver lazy loading |
| FR-3.5: Error boundaries | WASM error handlers |
| FR-4.4: wasm-pack build | Build pipeline |

### 4.2 Widget → Page Mapping

| Widget | Page | Section |
|--------|------|---------|
| A1: Order Book | `/world` | Market data |
| A2: Correlation Network | `/etf` | ETF analysis |
| A3: Strategy Backtester | `/etf` | Strategy testing |
| A4: Market Treemap | `/world` | Market overview |
| A5: BTC Health | `/world` | Bitcoin metrics |
| B1: Fourier Transform | `/` | Home showcase |
| B2: Climate Data Explorer | `/dossier` | Science showcase |
| B3: Physics Sandbox | `/dossier` | Science showcase |
| C1: Generative Art | `/` | Creative showcase |
| C2: Color Blindness | `/dossier` | Accessibility tool |
| D1: Regex Playground | `/` | DevTools showcase |
| D2: Network Topology | `/projects` | DevTools showcase |

---

## BP-5: Interface Design

### 5.1 WASM Module Interface

Each widget exports the same interface pattern:

```rust
// lib.rs for each widget
use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn init(canvas_id: &str) -> Result<JsValue, JsValue> {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx = canvas.get_context("2d")?.unwrap().dyn_into::<CanvasRenderingContext2d>()?;
    Ok(JsValue::from(ctx))
}

#[wasm_bindgen]
pub fn render(ctx: &CanvasRenderingContext2d, width: f64, height: f64, data: &JsValue) -> Result<(), JsValue> {
    // Canvas2D rendering logic
    Ok(())
}

#[wasm_bindgen]
pub fn cleanup() {
    // Free resources, cancel animation frames
}
```

### 5.2 JavaScript Loading Pattern

```javascript
// Widget loader (vanilla JS, runs in Astro page)
async function loadWasmWidget(containerId, widgetName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Show skeleton
  container.innerHTML = '<div class="wasm-skeleton">Loading...</div>';

  try {
    const module = await import(`/wasm/${widgetName}.js`);
    await module.default();

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.innerHTML = '';
    container.appendChild(canvas);

    module.init(canvas.id);
    module.render(canvas.getContext('2d'), canvas.width, canvas.height, new JsValue());
  } catch (error) {
    container.innerHTML = '<div class="wasm-error">Failed to load widget</div>';
    console.error(`WASM widget ${widgetName} failed:`, error);
  }
}
```

### 5.3 CustomEvent Bridge

```typescript
// SolidJS → WASM communication
document.dispatchEvent(new CustomEvent('wasm:update', {
  detail: { widgetId: 'correlation', data: { symbols: ['BTC', 'ETH'] } }
}));

// WASM → SolidJS communication
document.addEventListener('wasm:result', (e) => {
  if (e.detail.widgetId === 'correlation') {
    // Update SolidJS state
  }
});
```

### 5.4 Astro Embed Component

```astro
---
// components/wasm/Fourier.astro
interface Props {
  width?: number;
  height?: number;
}
const { width = 800, height = 400 } = Astro.props;
---

<div id="widget-fourier" class="wasm-embed" data-widget="fourier" style={`width:${width}px;height:${height}px`}>
  <div class="wasm-skeleton">
    <div class="skeleton-pulse"></div>
    <span>Loading Fourier Transform...</span>
  </div>
</div>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadWasmWidget(entry.target.id, 'fourier');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('.wasm-embed[data-widget="fourier"]').forEach(el => {
    observer.observe(el);
  });
</script>
```

---

## BP-6: Data Design

### 6.1 Widget Data Models

```typescript
// Finance widgets
interface OrderBookData {
  bids: [number, number][];  // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

interface CorrelationData {
  symbols: string[];
  matrix: number[][];  // NxN correlation matrix
  timeframe: string;
}

interface BacktestData {
  symbol: string;
  strategy: string;
  signals: { time: number; action: 'buy' | 'sell' }[];
  equity: number[];
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
}

interface TreemapData {
  sectors: {
    name: string;
    marketCap: number;
    change24h: number;
    children?: TreemapData['sectors'];
  }[];
}

interface BTCHealthData {
  mempoolSize: number;
  hashRate: number;
  difficulty: number;
  blockTime: number;
  fees: { fastest: number; halfHour: number; hour: number };
}

// Science widgets
interface FourierData {
  timeDomain: number[];
  sampleRate: number;
}

interface ClimateData {
  year: number[];
  temperatureAnomaly: number[];
  source: string;
}

interface PhysicsData {
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    mass: number;
    charge: number;
  }[];
  forces: string[];
}

// Creative widgets
interface GenerativeConfig {
  seed: number;
  particleCount: number;
  noiseScale: number;
  speed: number;
  palette: string[];
}

interface ColorBlindnessData {
  imageData: ImageData;
  type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
}

// DevTools widgets
interface RegexData {
  pattern: string;
  flags: string;
  testStrings: string[];
}

interface NetworkData {
  nodes: { id: string; label: string; x: number; y: number }[];
  edges: { source: string; target: string; label?: string }[];
}
```

### 6.2 Memory Management

Each widget follows this lifecycle:

```
1. init()    → Allocate canvas context, set up state
2. render()  → Draw to Canvas2D (no DOM allocation)
3. update()  → Receive new data via CustomEvent, re-render
4. cleanup() → Free resources, cancel animation frames, drop Rust data
```

**Memory budgets per widget**:

| Widget | Heap Limit | Notes |
|--------|------------|-------|
| A1: Order Book | 5MB | WebSocket buffer |
| A2: Correlation | 8MB | NxN matrix |
| A3: Backtest | 10MB | Equity curve data |
| A4: Treemap | 6MB | Sector hierarchy |
| A5: BTC Health | 5MB | Multiple data sources |
| B1: Fourier | 4MB | FFT arrays |
| B2: Climate | 6MB | CSV parsing |
| B3: Physics | 8MB | Particle positions |
| C1: Generative | 4MB | Particle system |
| C2: Color Blindness | 10MB | ImageData manipulation |
| D1: Regex | 2MB | String matching |
| D2: Network | 6MB | Force-directed layout |

---

## BP-7: Component Design

### 7.1 Widget Category: Finance

#### A1: Order Book Depth
- **Input**: Binance WebSocket `depth20` stream
- **Rendering**: Horizontal bar chart (bid/ask depth)
- **Colors**: Green (bids) / Red (asks) with theme awareness
- **Update**: Real-time WebSocket updates
- **Memory**: Sliding window of 200 updates

#### A2: Correlation Network
- **Input**: Yahoo Finance historical prices
- **Rendering**: Force-directed graph with D3-like layout
- **Colors**: Edge width = |correlation|, color = positive (cyan) / negative (red)
- **Interaction**: Hover to highlight connections
- **Memory**: 10x10 correlation matrix

#### A3: Strategy Backtester
- **Input**: Yahoo Finance historical prices + strategy parameters
- **Rendering**: Equity curve line chart with buy/sell markers
- **Colors**: Line = accent, markers = green (buy) / red (sell)
- **Interaction**: Parameter sliders (SolidJS bridge)
- **Memory**: Equity curve array (max 1000 points)

#### A4: Market Treemap
- **Input**: CoinGecko market cap data
- **Rendering**: Treemap rectangles (squarified algorithm)
- **Colors**: Green (positive) / Red (negative) 24h change
- **Interaction**: Hover for details, click to drill down
- **Memory**: Sector hierarchy tree

#### A5: BTC Health Dashboard
- **Input**: mempool.space + blockchain.info APIs
- **Rendering**: Multiple gauges (mempool size, hash rate, difficulty, block time)
- **Colors**: Gauge fill based on threshold (green/yellow/red)
- **Update**: 1-minute refresh
- **Memory**: 4 gauge objects

### 7.2 Widget Category: Science

#### B1: Fourier Transform
- **Input**: User-defined waveform (sine, square, sawtooth, custom)
- **Rendering**: Split view — time domain (top) + frequency spectrum (bottom)
- **Colors**: Waveform = accent, spectrum = gradient
- **Interaction**: Frequency/amplitude sliders
- **Memory**: FFT arrays (1024 samples)

#### B2: Climate Data Explorer
- **Input**: NASA GISS CSV (temperature anomaly data)
- **Rendering**: Line chart with trend line
- **Colors**: Line = accent, trend = warm accent
- **Interaction**: Time range selector, smoothing toggle
- **Memory**: 150+ year data points

#### B3: Physics Sandbox
- **Input**: User-defined particle configuration
- **Rendering**: 2D particle simulation with gravity, collisions
- **Colors**: Particles = accent, trails = faded
- **Interaction**: Add/remove particles, adjust gravity
- **Memory**: 500 particles max

### 7.3 Widget Category: Creative

#### C1: Generative Art Studio
- **Input**: User-defined parameters (seed, particle count, noise scale)
- **Rendering**: Perlin noise particle flow field
- **Colors**: Multi-color palette from theme
- **Interaction**: Regenerate button, parameter sliders
- **Memory**: 1000 particles max

#### C2: Color Blindness Simulator
- **Input**: User-uploaded image
- **Rendering**: Side-by-side comparison (original + simulated)
- **Colors**: Simulated color matrices (protanopia, deuteranopia, tritanopia)
- **Interaction**: Type selector, image upload
- **Memory**: ImageData copy (max 2MP)

### 7.4 Widget Category: DevTools

#### D1: Regex Playground
- **Input**: User-entered regex pattern + test strings
- **Rendering**: Highlighted matches in test strings
- **Colors**: Match = accent, group = warm accent
- **Interaction**: Live matching as user types
- **Memory**: Minimal (string operations)

#### D2: Network Topology Mapper
- **Input**: User-defined nodes and connections
- **Rendering**: Force-directed graph layout
- **Colors**: Nodes = accent, edges = border color
- **Interaction**: Add/remove nodes, drag to reposition
- **Memory**: 100 nodes max

---

## BP-8: Deployment

### 8.1 Build Pipeline

```
packages/widgets/
    ↓
wasm-pack build --target web --release
    ↓
packages/widgets/pkg/
    ├── widget_name.js     # JavaScript glue
    ├── widget_name_bg.wasm # WASM binary
    └── package.json
    ↓
Copy to apps/site/public/wasm/
    ↓
Astro build includes in dist/client/wasm/
    ↓
CF Pages serves as static assets
```

### 8.2 Build Script

```bash
#!/bin/bash
# packages/widgets/scripts/build.sh

set -e

echo "Building WASM widgets..."

# Build all widgets
wasm-pack build --target web --release

# Copy output to site public directory
mkdir -p ../../apps/site/public/wasm
cp pkg/*.js ../../apps/site/public/wasm/
cp pkg/*.wasm ../../apps/site/public/wasm/

echo "WASM widgets built successfully"
```

### 8.3 Asset Configuration

| Asset | Cache-Control | Strategy |
|-------|---------------|----------|
| `.wasm` files | `max-age=31536000, immutable` | Content-hashed by wasm-pack |
| `.js` glue | `max-age=31536000, immutable` | Content-hashed |
| Total per widget | 70-130KB | Lazy-loaded on demand |

### 8.4 Error Handling

```
WASM Load Failure
├── Show skeleton with error message
├── Log to console
├── Widget remains non-functional
└── Page continues to work (no crash)

WASM Runtime Error
├── Catch via try/catch in JavaScript
├── Show error state in widget container
├── Log to console
└── Widget remains non-functional

Canvas2D Context Loss
├── Detect via webglcontextlost event
├── Attempt to restore context
├── If restore fails → show error
└── Re-render on next animation frame
```

---

## BP-9: Compliance

### 9.1 Security

| Concern | Mitigation |
|---------|------------|
| WASM code execution | Loaded from same origin (no external WASM) |
| eval() / Function() | Not used (wasm-bindgen doesn't require them) |
| unsafe Rust code | None in widget code (memory-safe) |
| Memory limits | Each widget has heap budget (see 6.2) |
| Canvas2D manipulation | No data exfiltration (render-only) |

### 9.2 Accessibility

| Concern | Implementation |
|---------|---------------|
| Widget description | `aria-label` on container div |
| Keyboard interaction | Limited (Canvas2D doesn't support keyboard natively) |
| Screen reader | Static fallback text describing widget purpose |
| Reduced motion | Respect `prefers-reduced-motion` (disable animation) |
| Color contrast | Theme-aware colors, WCAG AA contrast ratios |

### 9.3 Performance

| Metric | Target | Strategy |
|--------|--------|----------|
| WASM download | <130KB per widget | Plain web-sys, no framework |
| WASM compile | <100ms | Stream compilation, lazy loading |
| Initial render | <16ms | Canvas2D direct rendering |
| Animation frame | <16ms (60fps) | requestAnimationFrame loop |
| Memory per widget | <10MB | Fixed budgets, cleanup on unmount |

---

## BP-10: Quality Checklist

- [ ] All 13 widgets compile with `wasm-pack build`
- [ ] All widgets load via IntersectionObserver
- [ ] Skeleton loading shows before WASM loads
- [ ] Error boundary catches WASM failures
- [ ] Canvas2D renders correctly in all themes
- [ ] Memory cleanup works on widget unmount
- [ ] CustomEvent bridge works (SolidJS ↔ WASM)
- [ ] Each widget is <130KB gzipped
- [ ] No unsafe Rust code in widgets
- [ ] No external WASM dependencies
- [ ] 60fps animation on all widgets
- [ ] Responsive sizing (320px-2560px)
- [ ] `prefers-reduced-motion` respected
- [ ] ARIA labels on all widget containers
- [ ] Build pipeline works (`wasm-pack build`)
- [ ] WASM files copied to `public/wasm/`
- [ ] No console errors on widget load
- [ ] No memory leaks on widget unmount

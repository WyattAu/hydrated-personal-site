# YP-VISUALIZATION-FINANCE-001: Financial Data Visualization

**Status:** Accepted  
**Domain:** Visualization / Presentation Layer  
**Date:** 2026-06-17  
**Author:** DeepThought (Researcher)

---

## 1. uPlot Architecture

### 1.1 Rendering Model

uPlot uses a retained-mode Canvas2D renderer:

$$\text{uPlot} = \text{Data} \rightarrow \text{Transform} \rightarrow \text{Canvas2D Primitives}$$

No VDOM, no DOM manipulation for data updates. Pure canvas rendering.

### 1.2 Core Architecture

```
┌─────────────────────────────────────────────────┐
│  uPlot Instance                                 │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Data     │  │  Scales  │  │  Axes/Labels │  │
│  │  Store    │  │  X/Y     │  │  Rendering   │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│       │              │              │           │
│       ▼              ▼              ▼           │
│  ┌──────────────────────────────────────────┐   │
│  │  Canvas2D Rendering Pipeline             │   │
│  │  1. Clear canvas                         │   │
│  │  2. Draw grid lines                      │   │
│  │  3. Draw series (line/area/candlestick)  │   │
│  │  4. Draw axes labels                     │   │
│  │  5. Draw crosshair (if hovering)         │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 1.3 Data Format

$$\text{Data} = [\text{timestamps}: [t_1, \ldots, t_n], [\text{values}_1, \ldots, \text{values}_m]]$$

```javascript
const data = [
  [1625097600, 1625184000, ...],  // timestamps (Unix seconds)
  [65000, 66000, ...],            // series 1 (e.g., open)
  [65500, 67000, ...],            // series 2 (e.g., high)
  [64500, 65000, ...],            // series 3 (e.g., low)
  [66000, 66500, ...],            // series 4 (e.g., close)
];
```

### 1.4 Why uPlot

| Feature | uPlot | Lightweight Charts | ECharts |
|---------|-------|-------------------|---------|
| Bundle size | 48KB | 45KB | 800KB |
| Watermark | None | TradingView | None |
| License | MIT | Apache 2.0 | Apache 2.0 |
| Render speed | Fastest | Fast | Medium |
| Candlestick | Via plugin | Native | Native |
| Custom axes | Yes | Limited | Yes |
| Canvas2D | Yes | Yes | Yes (also SVG) |

---

## 2. Candlestick Chart Construction

### 2.1 OHLCV Data Model

$$\text{Candle}_i = (t_i, o_i, h_i, l_i, c_i, v_i)$$

Where:
- $t_i$ = timestamp
- $o_i$ = open price
- $h_i$ = high price
- $l_i$ = low price
- $c_i$ = close price
- $v_i$ = volume

### 2.2 Visual Encoding

```
         ┌─ High (wick top)
         │
    ┌────┴────┐
    │         │ ← Body top (max(open, close))
    │         │
    │         │ ← Body bottom (min(open, close))
    └────┬────┘
         │
         └─ Low (wick bottom)
```

**Color encoding:**
- Bullish (close > open): `var(--accent)` or green
- Bearish (close < open): `var(--accent-warm)` or red

### 2.3 Rendering Algorithm

$$\text{Body}(c_i) = \begin{cases} \text{Bullish} & \text{if } c_i > o_i \\ \text{Bearish} & \text{if } c_i < o_i \\ \text{Doji} & \text{if } c_i = o_i \end{cases}$$

```javascript
function drawCandle(ctx, x, o, h, l, c, bodyWidth) {
  const bodyTop = Math.min(o, c);
  const bodyBottom = Math.max(o, c);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1); // Min 1px
  
  // Wick
  ctx.beginPath();
  ctx.moveTo(x + bodyWidth / 2, h);
  ctx.lineTo(x + bodyWidth / 2, l);
  ctx.stroke();
  
  // Body
  const color = c > o ? '#00e5ff' : '#ff6b35';
  ctx.fillStyle = color;
  ctx.fillRect(x, bodyTop, bodyWidth, bodyHeight);
}
```

### 2.4 Volume Bars

$$\text{Volume}_i = v_i \rightarrow \text{Bar Height}_i = \frac{v_i}{v_{\max}} \times h_{\text{volume}}$$

Volume bars rendered below the price chart with low opacity: `rgba(0, 229, 255, 0.1)`

---

## 3. D3.js Force-Directed Graph Layout

### 3.1 Force Simulation

$$\text{Force}(n_i) = \text{Charge}(n_i) + \text{Link}(n_i) + \text{Center}(n_i) + \text{Collide}(n_i)$$

Where:
- **Charge**: $F_{\text{charge}} = -\frac{k}{d^2}$ (Coulomb's law, repulsion)
- **Link**: $F_{\text{link}} = k_{\text{link}} \cdot (d - l_0)$ (Hooke's law, spring)
- **Center**: $F_{\text{center}} = k_{\text{center}} \cdot (\text{center} - \text{position})$ (gravity to center)
- **Collide**: $F_{\text{collide}} = \begin{cases} \text{push apart} & \text{if } d < r_i + r_j \\ 0 & \text{otherwise} \end{cases}$

### 3.2 Correlation Network

$$\text{Edge Weight}_{ij} = |\rho_{ij}|$$

Where $\rho_{ij}$ = Pearson correlation coefficient between assets $i$ and $j$.

**Visual encoding:**
- Node size $\propto$ market cap
- Edge width $\propto$ $|\rho_{ij}|$
- Edge color: positive = cyan, negative = red

### 3.3 Implementation

```javascript
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';

const simulation = forceSimulation(nodes)
  .force('link', forceLink(links).distance(100))
  .force('charge', forceManyBody().strength(-200))
  .force('center', forceCenter(width / 2, height / 2))
  .force('collide', forceCollide().radius(d => d.size + 10));

simulation.on('tick', () => {
  // Re-render canvas
  ctx.clearRect(0, 0, width, height);
  drawLinks(ctx, links);
  drawNodes(ctx, nodes);
});
```

### 3.4 Performance Considerations

| Nodes | Edges | FPS | Strategy |
|-------|-------|-----|----------|
| <50 | <100 | 60 | Direct render |
| 50-200 | 100-400 | 30-60 | Canvas2D (not SVG) |
| >200 | >400 | <30 | Decimate + throttle |

**For this project:** Max 10 ETFs in correlation matrix → ~45 edges → 60fps trivially.

---

## 4. Rough.js Organic Rendering

### 4.1 Hand-Drawn Algorithm

Rough.js creates organic, hand-drawn graphics by:
1. Computing ideal geometric shape
2. Adding noise to vertices ($\sigma$ = roughness parameter)
3. Drawing multiple passes with slight variation

$$\text{Roughness}(p) = p + \mathcal{N}(0, \sigma^2)$$

### 4.2 Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| `roughness` | 0-3 | Noise amplitude (0 = perfect, 3 = very rough) |
| `bowing` | 0-2 | Line curvature (0 = straight, 2 = very curved) |
| `stroke` | Color | Line color |
| `fill` | Color | Fill color |
| `fillStyle` | hachure/solid | Fill pattern |
| `strokeWidth` | px | Line width |

### 4.3 Usage in Project

```javascript
import rough from 'roughjs';

const rc = rough.canvas(canvasElement);

// Hand-drawn project card border
rc.rectangle(x, y, width, height, {
  fill: 'rgba(0, 229, 255, 0.05)',
  stroke: '#00e5ff',
  strokeWidth: 1,
  roughness: 1.5,
  bowing: 1.0,
});

// Organic connection line between sections
rc.line(x1, y1, x2, y2, {
  stroke: 'rgba(255, 255, 255, 0.1)',
  strokeWidth: 1,
  roughness: 2,
});
```

### 4.4 Performance

- Rough.js renders to Canvas2D (not DOM)
- Static render (draw once, no animation)
- ~40KB gzipped bundle
- Loaded via IntersectionObserver (lazy)

---

## 5. Canvas2D Scatter Plots

### 5.1 Data Model

$$\text{Point}_i = (x_i, y_i, \text{label}_i, \text{size}_i, \text{color}_i)$$

### 5.2 Rendering

```javascript
function drawScatterPlot(ctx, points, scales) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Grid lines
  drawGrid(ctx, scales);
  
  // Points
  points.forEach(p => {
    const x = scales.x(p.x);
    const y = scales.y(p.y);
    const r = scales.size(p.size);
    
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
  });
  
  // Labels
  points.forEach(p => {
    ctx.fillText(p.label, scales.x(p.x), scales.y(p.y) - r - 4);
  });
}
```

### 5.3 Axis Scaling

$$\text{Linear Scale}: y = \frac{(v - v_{\min})}{(v_{\max} - v_{\min})} \times (y_{\max} - y_{\min}) + y_{\min}$$

$$\text{Log Scale}: y = \frac{\log(v) - \log(v_{\min})}{\log(v_{\max}) - \log(v_{\min})} \times (y_{\max} - y_{\min}) + y_{\min}$$

### 5.4 World Monitor Scatter Plots

| Plot | X Axis | Y Axis | Points |
|------|--------|--------|--------|
| Intelligence vs Price | Intelligence score | Price | LLMs |
| Intelligence vs Speed | Intelligence score | Tokens/sec | LLMs |

---

## 6. 60fps Rendering with Large Datasets

### 6.1 Performance Budget

$$\text{Frame Budget} = \frac{1000\text{ms}}{60\text{fps}} = 16.67\text{ms}$$

$$\text{Render Cost} = \text{Data Transform} + \text{Canvas Draw} + \text{Layout}$$

### 6.2 Optimization Strategies

| Strategy | Mechanism | Impact |
|----------|-----------|--------|
| Canvas2D (not SVG) | Single bitmap, no DOM nodes | 10x faster for >100 points |
| Data decimation | Show every Nth point when zoomed out | Linear with visible data |
| requestAnimationFrame | Sync with display refresh | No dropped frames |
| Offscreen canvas | Pre-render in background thread | Zero main-thread cost |
| Throttling | Limit re-renders to 60fps max | Prevent over-rendering |

### 6.3 Data Decimation Algorithm

$$\text{Visible Data} = \begin{cases} \text{All points} & \text{if } n \leq 500 \\ \text{Every } \lceil n/500 \rceil \text{th point} & \text{if } n > 500 \end{cases}$$

```javascript
function decimateData(data, maxPoints = 500) {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}
```

### 6.4 uPlot Performance

uPlot benchmarks (from author's tests):
- 16 series × 10,000 points = **60fps** on mid-range hardware
- Initial render: **<5ms** for 10K points
- Pan/zoom: **<8ms** per frame

### 6.5 Canvas2D Performance

| Operation | Time (10K points) |
|-----------|-------------------|
| Clear canvas | ~0.1ms |
| Draw circles | ~2ms |
| Draw labels | ~3ms |
| Total | ~5ms (well within 16.67ms budget) |

---

## 7. Chart Library Usage Map

| Page | Library | Use Case | Size |
|------|---------|----------|------|
| Home | Rough.js | Hero sketch, project cards | 40KB |
| Home | GSAP | Hero parallax, scroll reveals | 28KB |
| World | uPlot | Price charts, candlestick | 48KB |
| World | Canvas2D | Scatter plots, sparklines | Native |
| World | D3.js | Correlation network | 230KB |
| ETF | uPlot | ETF price chart | 48KB |
| ETF | Canvas2D | Allocation donut charts | Native |
| Projects | Rough.js | Repository cards | 40KB |
| Dossier | GSAP | Timeline animation | 28KB |
| All | Motion One | Micro-interactions | 5KB |

### 7.1 Lazy Loading Priority

| Library | Load Trigger | Priority |
|---------|-------------|----------|
| uPlot | IntersectionObserver | Low |
| D3.js | IntersectionObserver | Low |
| Rough.js | IntersectionObserver | Low |
| GSAP | `<script>` (high) | High |
| Motion One | SolidJS import | Medium |
| Canvas2D | Native API | Immediate |

---

## 8. References

- [uPlot GitHub](https://github.com/leeoniya/uPlot)
- [D3.js Force Layout](https://d3js.org/d3-force)
- [Rough.js GitHub](https://github.com/rough-stuff/rough)
- [Canvas Performance](https://web.dev/canvas-performance/)

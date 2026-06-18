# YP-WASM-WIDGET-ARCH-001: WASM Widget Architecture

**Status:** Accepted  
**Domain:** WASM / Compute Layer  
**Date:** 2026-06-17  
**Author:** DeepThought (Researcher)

---

## 1. Standalone Rust + wasm-pack + web-sys Model

### 1.1 Architecture

$$\text{Widget} = \text{Rust}(\text{wasm-pack}, \text{web-sys}, \text{wasm-bindgen})$$

No framework dependency. Pure Canvas2D rendering via `web-sys` bindings.

### 1.2 Build Pipeline

```
Rust Source (src/*.rs)
    │
    ▼
wasm-pack build --target web --release
    │
    ▼
pkg/
├── widget_bg.wasm    # Binary (70-130KB)
├── widget.js         # JS glue code
└── widget.d.ts       # TypeScript types
```

### 1.3 Module Loading

```javascript
import init, { create_fourier_viz } from './pkg/widget.js';

async function loadWidget(containerId) {
  await init();                          // Initialize WASM
  create_fourier_viz(containerId, 800, 400);  // Create widget
}
```

**Loading semantics:**
1. `init()` — Load and instantiate WASM binary
2. `create_*()` — Create widget in specified container
3. Widget owns the container `<div>` subtree
4. No external DOM manipulation

---

## 2. Canvas2D Rendering Pipeline

### 2.1 Rendering Model

$$\text{Render Loop}: \text{Input} \rightarrow \text{Compute} \rightarrow \text{Canvas2D} \rightarrow \text{Frame}$$

```
┌─────────────────────────────────────────────────┐
│  WASM Widget                                    │
│                                                 │
│  ┌───────────┐    ┌───────────┐    ┌─────────┐ │
│  │  Compute   │───▶│  Canvas   │───▶│  Frame  │ │
│  │  (Rust)    │    │  2D API   │    │  Buffer │ │
│  └───────────┘    └───────────┘    └─────────┘ │
│       ▲                                        │
│       │                                        │
│  ┌───────────┐                                 │
│  │  Input     │                                 │
│  │  (Events)  │                                 │
│  └───────────┘                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 Canvas2D Bindings (web-sys)

```rust
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_chart(canvas_id: &str, width: u32, height: u32) {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into().unwrap();
    
    canvas.set_width(width);
    canvas.set_height(height);
    
    let ctx = canvas
        .get_context("2d").unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>().unwrap();
    
    // Draw operations
    ctx.set_fill_style(&"#00e5ff".into());
    ctx.fill_rect(0.0, 0.0, width as f64, height as f64);
}
```

### 2.3 Widget Rendering Patterns

| Pattern | Description | Widgets |
|---------|-------------|---------|
| Static render | Draw once, no updates | Fourier (after computation) |
| Animated render | `requestAnimationFrame` loop | Physics Sandbox, Cellular Automata |
| Data-driven render | Re-render on data update | Order Book, Treemap |
| Interactive render | Mouse/keyboard → re-render | Regex Playground, Network Mapper |

---

## 3. IntersectionObserver Lazy Loading

### 3.1 Loading Strategy

$$\text{Load}(w) = \begin{cases} \text{defer} & \text{if } \text{viewport}(w) = \emptyset \\ \text{load} & \text{if } \text{viewport}(w) \neq \emptyset \end{cases}$$

### 3.2 Implementation

```astro
<div id="widget-fourier" class="wasm-embed" data-widget="fourier">
  <div class="wasm-skeleton">
    <div class="skeleton-pulse"></div>
  </div>
</div>

<script>
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const widget = entry.target.dataset.widget;
          import(`/wasm/${widget}.js`).then(async (mod) => {
            await mod.default();
            mod[`create_${widget}`](entry.target.id, 800, 400);
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '200px' }
  );

  document.querySelectorAll('.wasm-embed').forEach((el) => {
    observer.observe(el);
  });
</script>
```

### 3.3 Loading Phases

```
Phase 1: Skeleton
┌─────────────────────┐
│  ████░░░░░░░░░░░░░  │  ← Pulsing skeleton
│  ░░░░░░░░░░░░░░░░░  │
└─────────────────────┘

Phase 2: WASM Loading
┌─────────────────────┐
│  Loading WASM...    │  ← Status indicator
│  ████████████░░░░░  │
└─────────────────────┘

Phase 3: Rendered Widget
┌─────────────────────┐
│  ╱╲  ╱╲  ╱╲  ╱╲    │  ← Actual widget
│  ╲  ╲╱  ╲╱  ╲╱     │
└─────────────────────┘
```

---

## 4. CustomEvent Bridge Pattern

### 4.1 Communication Model

$$\text{SolidJS} \xleftrightarrow{\text{CustomEvent}} \text{WASM Widget}$$

No shared state. No direct function calls. Decoupled via DOM events.

### 4.2 Event Protocol

| Event Name | Direction | Payload | Purpose |
|------------|-----------|---------|---------|
| `wasm:update` | SolidJS → WASM | `{ data: any }` | Send data to widget |
| `wasm:result` | WASM → SolidJS | `{ result: any }` | Widget result back |
| `wasm:error` | WASM → SolidJS | `{ error: string }` | Widget error |
| `wasm:ready` | WASM → SolidJS | `{}` | Widget initialized |

### 4.3 SolidJS Dispatch

```typescript
// SolidJS component sends data to WASM widget
function updateOrderBook(data: OrderBookData) {
  document.dispatchEvent(
    new CustomEvent('wasm:update', {
      detail: { widget: 'order-book', data },
    })
  );
}
```

### 4.4 WASM Receive (via wasm-bindgen)

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn listen_for_updates() {
    let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
        let event = event.dyn_into::<web_sys::CustomEvent>().unwrap();
        let data = event.detail();
        // Process data from SolidJS
    }) as Box<dyn FnMut(_)>);

    web_sys::window()
        .unwrap()
        .document()
        .unwrap()
        .add_event_listener_with_callback(
            "wasm:update",
            closure.as_ref().unchecked_ref(),
        )
        .unwrap();

    closure.forget(); // Prevent drop (leak is intentional for long-lived listeners)
}
```

### 4.5 WASM Dispatch (to SolidJS)

```rust
use web_sys::CustomEvent;

#[wasm_bindgen]
pub fn send_result(result: &str) {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    
    let event = CustomEvent::new("wasm:result").unwrap();
    event.set_detail(&result.into());
    document.dispatch_event(&event).unwrap();
}
```

---

## 5. Bundle Size Analysis

### 5.1 Per-Widget Size

| Widget | WASM Binary | JS Glue | Total (gzipped) |
|--------|-------------|---------|-----------------|
| A1: Order Book | ~70KB | ~5KB | ~75KB |
| A2: Correlation Network | ~110KB | ~8KB | ~118KB |
| A3: Strategy Backtester | ~120KB | ~10KB | ~130KB |
| A4: Market Treemap | ~80KB | ~7KB | ~87KB |
| A5: BTC Health Dashboard | ~90KB | ~8KB | ~98KB |
| B1: Fourier Transform | ~60KB | ~5KB | ~65KB |
| B2: Climate Data Explorer | ~100KB | ~8KB | ~108KB |
| B3: Physics Sandbox | ~70KB | ~6KB | ~76KB |
| B4: Cellular Automata | ~50KB | ~4KB | ~54KB |
| C1: Generative Art Studio | ~80KB | ~7KB | ~87KB |
| C2: Color Blindness Simulator | ~40KB | ~4KB | ~44KB |
| D1: Regex Playground | ~35KB | ~3KB | ~38KB |
| D2: Network Topology Mapper | ~60KB | ~5KB | ~65KB |

### 5.2 Comparison: Standalone vs Leptos Framework

$$\text{Size}_{\text{standalone}} = \text{Rust}(\text{web-sys}) + \text{wasm-bindgen}$$
$$\text{Size}_{\text{leptos}} = \text{Rust}(\text{leptos}) + \text{Reactive Runtime} + \text{Hydration}$$

| Metric | Standalone | Leptos Framework | Savings |
|--------|-----------|------------------|---------|
| Per widget | 70-130KB | 200-400KB | 55-70% |
| 13 widgets total | ~1.1MB | ~3.4MB | 68% |
| Load time (per widget) | ~50ms | ~150ms | 67% |

### 5.3 Monolith vs Widget Model

$$\text{Monolith}: \text{Load}(\text{all WASM}) = 1.4\text{MB}$$
$$\text{Widget}: \text{Load}(\text{visible widgets}) \approx 70\text{-}130\text{KB}$$

**Average visible widgets per page:** 1-2  
**Average load:** ~150KB (vs 1.4MB monolith = 89% reduction)

---

## 6. Memory Safety in WASM Context

### 6.1 Rust Ownership Model

$$\text{Ownership}: \forall x \in \text{Values}, \text{Owner}(x) = \text{exactly one variable}$$

$$\text{Borrowing}: \text{Borrow}(x) = \text{at most one mutable XOR many immutable}$$

### 6.2 WASM Memory Model

$$\text{WASM Memory} = \text{Linear Memory}(\text{growable})$$

- Rust compiles to WASM with no garbage collector
- Memory is linear (single contiguous buffer)
- No null pointer exceptions (Rust's `Option<T>`)
- No buffer overflows (Rust's bounds checking)

### 6.3 Safety Guarantees

| Property | Mechanism | Benefit |
|----------|-----------|---------|
| Memory safety | Ownership + borrowing | No use-after-free, no double-free |
| Thread safety | `Send` + `Sync` traits | No data races (single-threaded WASM) |
| Null safety | `Option<T>` | No null pointer exceptions |
| Bounds checking | Runtime checks | No buffer overflows |
| No unsafe | `unsafe` blocks avoided | No undefined behavior |

### 6.4 WASM-Specific Considerations

1. **No DOM access from WASM directly**: Must use `web-sys` bindings
2. **Single-threaded**: No shared memory concerns
3. **Linear memory**: Fixed-size heap, grows in 64KB pages
4. **No GC**: Memory managed by Rust's ownership system
5. **Export/Import boundary**: JS ↔ WASM communication is explicit

### 6.5 Error Boundaries

```typescript
// SolidJS error boundary for WASM widgets
function WASMWidget({ src, containerId }) {
  let containerRef;
  
  onMount(async () => {
    try {
      const mod = await import(src);
      await mod.default();
      mod[`create_${containerId}`](containerRef, 800, 400);
    } catch (error) {
      // Graceful degradation: show error message
      containerRef.innerHTML = `
        <div class="wasm-error">
          Widget failed to load. Please refresh.
        </div>
      `;
    }
  });
  
  return <div ref={containerRef} class="wasm-embed" />;
}
```

---

## 7. Widget Inventory Summary

### 7.1 By Category

| Category | Count | Total WASM | Data Source |
|----------|-------|-----------|-------------|
| Finance | 5 | ~478KB | APIs (Binance, Yahoo, CoinGecko) |
| Science | 4 | ~303KB | Computation / CSV |
| Creative | 2 | ~131KB | Computation / User input |
| DevTools | 2 | ~103KB | User input |
| **Total** | **13** | **~1.1MB** | — |

### 7.2 By Page

| Page | Widgets | Combined WASM |
|------|---------|---------------|
| Home | B1 (Fourier), C1 (Generative Art), D1 (Regex) | ~168KB |
| World | A1 (Order Book), A4 (Treemap), A5 (BTC Health) | ~260KB |
| ETF | A2 (Correlation), A3 (Backtester) | ~248KB |
| Dossier | B2 (Climate), B3 (Physics), C2 (Color Blindness) | ~228KB |
| Projects | D2 (Network Mapper) | ~65KB |

---

## 8. References

- [wasm-pack Docs](https://rustwasm.github.io/wasm-pack/)
- [web-sys Docs](https://docs.rs/web-sys/)
- [wasm-bindgen Docs](https://rustwasm.github.io/wasm-bindgen/)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)

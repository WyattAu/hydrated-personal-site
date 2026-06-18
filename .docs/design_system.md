# Design System: Hydrated Personal Site

## Philosophy

**Cinematic Brutalism with Spatial Materialism + Amoebic UI**

Not minimalism. Not decoration. **Structured drama.**

Three tensions coexist:
1. **Brutalist grid** — zero border-radius, monospace, exposed structure
2. **Cinematic layer** — vignettes, film grain, parallax depth, dramatic lighting
3. **Amoebic UI** — organic shapes that break the grid at interaction points

---

## Color System

### 6 Themes

All themes use CSS custom properties. Persisted to `localStorage`, toggled via `data-theme` attribute on `<html>`.

| Theme | `--bg-primary` | `--accent` | Cinematic Grade | Amoebic Feel |
|-------|---------------|-----------|-----------------|--------------|
| midnight-navy (default) | `#050505` | `#00e5ff` | Teal/orange split-tone | Cold, digital |
| tokyo-night | `#1a1b26` | `#7aa2f7` | Warm purple haze | Soft, neon |
| arctic-dawn | `#f0f4f8` | `#0055ee` | Cool blue wash | Clean, crystalline |
| solaris | `#0d1117` | `#f0883e` | Amber warmth | Organic, fiery |
| light | `#f5f5f5` | `#00838f` | Desaturated film | Neutral, paper |

### Midnight Navy Token Set (Default)

```css
:root {
  --bg-primary: #050505;
  --bg-secondary: #0a0a0a;
  --bg-card: #0c0c0c;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --accent: #00e5ff;
  --accent-warm: #ff6b35;
  --border: #1a1a1a;
  --shadow-depth: 0 4px 24px rgba(0,0,0,0.5);
}
```

### Amoebic Accent Colors

```css
:root {
  --amoeba-primary: #00e5ff;
  --amoeba-secondary: #69f0ae;
  --amoeba-tertiary: #b388ff;
  --amoeba-gradient: linear-gradient(135deg, #00e5ff 0%, #69f0ae 50%, #b388ff 100%);
}
```

---

## Typography

### Font Stack

| Role | Font | Fallback |
|------|------|----------|
| Display | Inter | system-ui, sans-serif |
| Mono/Data | JetBrains Mono | monospace |

### Type Scale

| Element | Font | Size | Weight | Letter Spacing | Treatment |
|---------|------|------|--------|----------------|-----------|
| Hero name | Inter | `clamp(3.5rem, 8vw, 7rem)` | 900 | -0.04em | `text-shadow: 0 0 40px rgba(0,229,255,0.3)` |
| Section labels | JetBrains Mono | 9px | 700 | 0.3em | Uppercase, dimmed |
| Navigation | JetBrains Mono | 10px | 500 | 0.15em | Uppercase |
| Body text | Inter | 15px | 400 | normal | Line-height: 1.7 |
| Code/data | JetBrains Mono | 11px | 500 | normal | Monospace |
| Stat values | JetBrains Mono | `clamp(2rem, 4vw, 3rem)` | 900 | -0.02em | `text-shadow` glow |

### Font Loading

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Variable.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 800;
}
```

Both fonts self-hosted. No external requests. `font-display: swap` prevents FOIT.

---

## Spatial Materialism Tokens

### Z-Index Layers

```css
--z-bg: 0;           /* Background texture */
--z-content: 10;     /* Main content */
--z-card: 20;        /* Floating cards */
--z-overlay: 30;     /* Overlays, modals */
--z-nav: 100;        /* Fixed navigation */
--z-modal: 1000;     /* Command palette */
--z-vignette: 9999;  /* Vignette overlay */
```

### Shadow System

Single light source: top-left. All shadows fall down-right.

```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
--shadow-md: 0 4px 12px rgba(0,0,0,0.5);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.6);
--shadow-xl: 0 16px 48px rgba(0,0,0,0.7);
--shadow-glow: 0 0 40px rgba(0,229,255,0.15);
```

### Material Textures

```css
--texture-concrete: url("data:image/svg+xml,...feTurbulence noise...");
--texture-metal: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%);
--texture-glass: backdrop-filter: blur(12px) saturate(180%);
```

| Texture | Use Case | Effect |
|---------|----------|--------|
| Concrete grain | Background surfaces | Subtle noise, tactile feel |
| Brushed metal | Card surfaces | Metallic sheen on hover |
| Frosted glass | Navigation, overlays | Glassmorphism blur |

### Depth Principle

Cards float above background. Modals float above cards. Navigation floats above everything. Shadows communicate physical stacking — not decoration.

---

## Amoebic Interaction Patterns

### Amoeba Hover

Elements morph from brutalist (zero border-radius) to organic shapes on hover.

```css
.amoeba-hover {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 0;
}

.amoeba-hover:hover {
  border-radius: 20% 40% 30% 50%;
  transform: scale(1.02) translateY(-2px);
  box-shadow: var(--shadow-glow);
}
```

### Breathe Animation

Subtle organic pulse on idle elements.

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.01); opacity: 0.95; }
}
```

### Flow Field

Particles follow cursor. Used on hero section.

```css
.flow-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.3;
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### Morph Keyframe

Continuous organic shape-shifting for background elements.

```css
@keyframes morph {
  0% { border-radius: 0; }
  25% { border-radius: 20% 0 30% 0; }
  50% { border-radius: 0 30% 0 20%; }
  75% { border-radius: 30% 0 20% 0; }
  100% { border-radius: 0; }
}
```

---

## Cinematic Effects

### Vignette Overlay

Dark edges, bright center. Creates depth and focus.

```css
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
  z-index: 9999;
}
```

### Film Grain Texture

Subtle noise overlay. Adds texture without distraction.

```css
.film-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,...feTurbulence...");
  z-index: 9998;
}
```

### Letterboxing

Ultra-wide screens (>1800px) get black bars on sides. Creates cinematic framing.

```css
@media (min-width: 1800px) {
  body::before, body::after {
    content: '';
    position: fixed;
    top: 0;
    bottom: 0;
    width: calc((100vw - 1400px) / 2);
    background: #000;
    z-index: 9997;
  }
  body::before { left: 0; }
  body::after { right: 0; }
}
```

### Cinematic Fade

Entry animation with blur + brightness.

```css
@keyframes cinematic-fade {
  0% { opacity: 0; filter: blur(4px) brightness(0.5); }
  100% { opacity: 1; filter: blur(0) brightness(1); }
}
```

---

## Animation System

### Easing Functions

```css
--ease-brutal: cubic-bezier(0.16, 1, 0.3, 1);          /* Sharp, decisive */
--ease-amoeba: cubic-bezier(0.34, 1.56, 0.64, 1);      /* Bouncy, organic */
--ease-cinematic: cubic-bezier(0.25, 0.1, 0.25, 1);    /* Slow, dramatic */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Spring physics */
```

| Easing | Use Case | Feel |
|--------|----------|------|
| `--ease-brutal` | Navigation, buttons | Instant, snappy |
| `--ease-amoeba` | Card hover, morph | Playful, organic |
| `--ease-cinematic` | Scroll reveals, fades | Dramatic, deliberate |
| `--ease-spring` | Modal open, popovers | Bouncy, physical |

### Scroll Reveal

```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s var(--ease-cinematic);
}

.revealed {
  opacity: 1;
  transform: translateY(0);
}
```

Triggered via `IntersectionObserver` with 200px root margin.

### Parallax Layers

```css
.parallax-bg { transform: translateZ(-2px) scale(3); }
.parallax-mid { transform: translateZ(-1px) scale(2); }
.parallax-fg { transform: translateZ(0); }
```

3-5 depth layers. Background moves slowest, foreground stays fixed.

### Animation Library Stack

| Library | Size | Use Case |
|---------|------|----------|
| CSS Keyframes | 0KB | All micro-interactions |
| Motion One | 5KB | Component enter/exit, simple transitions |
| GSAP | 28KB | Complex cinematic sequences, parallax, scroll triggers |

GSAP loaded on-demand. Motion One is the default. CSS keyframes preferred when possible.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .vignette, .film-grain { display: none; }
  .parallax-bg, .parallax-mid { transform: none; }
}
```

---

## Component Patterns

### Navigation Bar

- Fixed top, glassmorphism (`backdrop-filter: blur(12px) saturate(180%)`)
- `border: 1px solid var(--border)` — structural, not decorative
- `z-index: 100`
- Active item: amoebic underline (not straight line)
- Hover: subtle scale + glow

### Hero Section

- Full viewport height (`100vh`)
- 3-5 parallax layers (images, overlay, content)
- Vignette gradient overlay
- Film grain texture (subtle, `opacity: 0.03`)
- Text-shadow glow on name
- Slow fade-in on scroll (800ms)
- Breathing scroll indicator

### Card System

- **Brutalist base:** Zero border-radius, monospace, grid alignment
- **Amoebic hover:** Border-radius morphs to organic shape, scale + glow
- **Rough.js border:** Hand-drawn border adds organic texture
- **Spatial depth:** Cards float with `shadow-lg`

### Data Visualization

| Element | Library | Style |
|---------|---------|-------|
| Price charts | uPlot | `var(--bg-card)` bg, `var(--accent)` line, dashed crosshair |
| Correlation network | D3.js | Force-directed, edge width = |correlation|, cyan/red edges |
| Scatter plots | Canvas2D | Point color = category, size = magnitude |
| Allocation donuts | Canvas2D | Segment colors from theme accent palette |
| WASM widgets | Canvas2D | Each widget owns its `<div>` subtree |

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Layout | Spatial |
|------------|-------|--------|---------|
| Mobile | <768px | Single column | Flat, no parallax |
| Tablet | 768-1024px | 2-column grid | Reduced depth |
| Desktop | 1024-1400px | Full layout | Full parallax |
| Ultra-wide | >1400px | Max-width + letterbox | Cinematic letterbox |

### Mobile Adjustments

- Parallax disabled
- Film grain and vignette removed
- Cards stack vertically
- Navigation becomes hamburger menu
- WASM widgets full-width

---

## Accessibility

### ARIA Patterns

| Component | Role | Attributes |
|-----------|------|------------|
| Navigation | `navigation` | `aria-label="Main navigation"` |
| Command palette | `dialog` | `aria-modal="true"`, `aria-label="Command palette"` |
| Metric cards | `status` | `aria-label` with metric name |
| Charts | `img` | `aria-label` describing chart content |
| Map | `region` | `aria-label="Interactive world map"` |
| WASM widgets | `img` | `aria-label` describing widget content |

### Focus Management

- Skip-to-content link (first focusable element)
- Focus trap in modals (command palette)
- Visible focus indicators (`outline: 2px solid var(--accent)`)
- `tabindex="-1"` on non-interactive elements with click handlers

### Color Contrast

All text meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text). Verified against each of the 6 themes.

---

## Performance Budgets

| Asset | Budget | Loading Strategy |
|-------|--------|-----------------|
| Critical CSS | <5KB | Inline in `<head>` |
| Full CSS | <80KB | `<link>` with `media="all"` |
| Fonts | 78KB total | Self-hosted, `font-display: swap` |
| SolidJS runtime | ~4KB | `<script>` high priority |
| Alpine.js | ~16KB | `<script>` high priority |
| GSAP | 28KB | On-demand (scroll triggers) |
| uPlot | 48KB gzipped | IntersectionObserver |
| Rough.js | 40KB gzipped | IntersectionObserver |
| D3.js | 230KB gzipped | IntersectionObserver |
| WASM (per widget) | <130KB | IntersectionObserver |
| Total first load | <400KB | — |

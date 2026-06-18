# Design Document: Hydrated Personal Site

## 1. Design Philosophy

### 1.1 Aesthetic: Cinematic Brutalism with Spatial Materialism

This is not minimalism. This is not decoration. This is **structured drama**.

**Brutalist Foundation:**
- Zero border-radius on all elements (`border-radius: 0 !important`)
- Monospace typography for data, labels, navigation
- Exposed grid structure — the skeleton is visible
- High contrast: deep blacks against electric accents
- No soft shadows, no rounded corners, no friendly shapes

**Cinematic Layer:**
- Dramatic lighting: vignette overlays, god-ray gradients, film-grain texture
- Slow, deliberate animations (800ms ease-in-out, spring physics)
- Color grading: teal/orange split-tone on hero, desaturated backgrounds
- Parallax depth with 3-5 layers creating parallax scroll illusion
- Letterboxing effect on ultra-wide screens (>1800px)

**Spatial Materialism:**
- Physical depth through layered shadows (not decorative — they suggest stacking)
- Material textures: concrete grain, brushed metal, frosted glass
- Z-axis layering: cards float above background, modals float above cards
- Light source consistency: all shadows fall down-right (single light source)
- Perspective transforms on scroll (subtle rotateX on cards)

**Amoebic UI:**
- Organic shapes that **break** the brutalist grid at interaction points
- Amoeba-like hover states: elements morph and breathe on hover
- Biological patterns: cellular noise backgrounds, neural network connections
- Flowing animations: particles follow cursor, data flows along paths
- Asymmetric layouts within rigid grid constraints
- Natural easing: cubic-bezier(0.34, 1.56, 0.64, 1) for bouncy interactions

### 1.2 The Tension: Grid vs. Organics

The core visual tension:
```
┌─────────────────────────────────────────────┐
│  RIGID GRID (brutalist)                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │     │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘          │
│                                             │
│  ORGANIC FLOW (amoebic)                     │
│       ╭──────────╮                          │
│      ╱  amoeba    ╲  ← breaks grid          │
│     ╱   shape      ╲   at hover/interaction │
│    ╰────────────────╯                       │
│                                             │
│  CINEMATIC DRAMA                            │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ^ vignette gradient adds depth             │
└─────────────────────────────────────────────┘
```

### 1.3 Color System

#### Theme: Midnight Navy (Default)
```css
--bg-primary: #050505;        /* Near-black, film-like */
--bg-secondary: #0a0a0a;      /* Slightly lighter for depth */
--bg-card: #0c0c0c;           /* Card background */
--text-primary: #ffffff;      /* Pure white for contrast */
--text-secondary: #888888;    /* Muted for secondary info */
--accent: #00e5ff;            /* Electric cyan — cold, technical */
--accent-warm: #ff6b35;       /* Warm orange — for contrast */
--border: #1a1a1a;            /* Subtle structural lines */
--shadow-depth: 0 4px 24px rgba(0,0,0,0.5);  /* Spatial depth */
```

#### Amoebic Accent Colors (for organic elements)
```css
--amoeba-primary: #00e5ff;    /* Cyan — matches accent */
--amoeba-secondary: #69f0ae;  /* Mint green */
--amoeba-tertiary: #b388ff;   /* Lavender */
--amoeba-gradient: linear-gradient(135deg, #00e5ff 0%, #69f0ae 50%, #b388ff 100%);
```

#### All 6 Themes
| Theme | Background | Accent | Cinematic Grade | Amoebic Feel |
|-------|-----------|--------|-----------------|--------------|
| midnight-navy | #050505 | #00e5ff | Teal/orange split-tone | Cold, digital |
| tokyo-night | #1a1b26 | #7aa2f7 | Warm purple haze | Soft, neon |
| arctic-dawn | #f0f4f8 | #0055ee | Cool blue wash | Clean, crystalline |
| solaris | #0d1117 | #f0883e | Amber warmth | Organic, fiery |
| light | #f5f5f5 | #00838f | Desaturated film | Neutral, paper |

### 1.4 Typography

| Element | Font | Size | Weight | Letter Spacing | Treatment |
|---------|------|------|--------|----------------|-----------|
| Hero name | Inter | clamp(3.5rem, 8vw, 7rem) | 900 | -0.04em | Text-shadow: 0 0 40px rgba(0,229,255,0.3) |
| Section labels | JetBrains Mono | 9px | 700 | 0.3em | Uppercase, dimmed |
| Navigation | JetBrains Mono | 10px | 500 | 0.15em | Uppercase |
| Body text | Inter | 15px | 400 | normal | Line-height: 1.7 |
| Code/data | JetBrains Mono | 11px | 500 | normal | Monospace for data |
| Stat values | JetBrains Mono | clamp(2rem, 4vw, 3rem) | 900 | -0.02em | Text-shadow glow |

### 1.5 Spatial Materialism Tokens

```css
/* Depth layers (z-index stacking) */
--z-bg: 0;           /* Background texture */
--z-content: 10;     /* Main content */
--z-card: 20;        /* Floating cards */
--z-overlay: 30;     /* Overlays, modals */
--z-nav: 100;        /* Fixed navigation */
--z-modal: 1000;     /* Command palette */

/* Shadow system (single light source: top-left) */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
--shadow-md: 0 4px 12px rgba(0,0,0,0.5);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.6);
--shadow-xl: 0 16px 48px rgba(0,0,0,0.7);
--shadow-glow: 0 0 40px rgba(0,229,255,0.15);

/* Material textures */
--texture-concrete: url("data:image/svg+xml,...noise...");
--texture-metal: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%);
--texture-glass: backdrop-filter: blur(12px) saturate(180%);
```

### 1.6 Amoebic Interaction Patterns

```css
/* Amoeba hover — organic morph */
.amoeba-hover {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 0;  /* Brutalist base */
}
.amoeba-hover:hover {
  border-radius: 20% 40% 30% 50%;  /* Organic morph on hover */
  transform: scale(1.02) translateY(-2px);
  box-shadow: var(--shadow-glow);
}

/* Breathe animation — subtle organic pulse */
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.01); opacity: 0.95; }
}

/* Flow field — particles follow cursor */
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

### 1.7 Cinematic Effects

```css
/* Vignette overlay */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
  z-index: 9999;
}

/* Film grain texture */
.film-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,...feTurbulence...");
  z-index: 9998;
}

/* Letterboxing on ultra-wide */
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

### 1.8 Animation System

```css
/* Core easing */
--ease-brutal: cubic-bezier(0.16, 1, 0.3, 1);        /* Sharp, decisive */
--ease-amoeba: cubic-bezier(0.34, 1.56, 0.64, 1);    /* Bouncy, organic */
--ease-cinematic: cubic-bezier(0.25, 0.1, 0.25, 1);  /* Slow, dramatic */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Spring physics */

/* Scroll reveal */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s var(--ease-cinematic);
}
.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Parallax layers */
.parallax-bg { transform: translateZ(-2px) scale(3); }
.parallax-mid { transform: translateZ(-1px) scale(2); }
.parallax-fg { transform: translateZ(0); }

/* Amoebic hover */
@keyframes morph {
  0% { border-radius: 0; }
  25% { border-radius: 20% 0 30% 0; }
  50% { border-radius: 0 30% 0 20%; }
  75% { border-radius: 30% 0 20% 0; }
  100% { border-radius: 0; }
}

/* Cinematic fade */
@keyframes cinematic-fade {
  0% { opacity: 0; filter: blur(4px) brightness(0.5); }
  100% { opacity: 1; filter: blur(0) brightness(1); }
}
```

---

## 2. Graphics & Visualization Libraries

### 2.1 Recommended Libraries

| Library | Purpose | Size | Why |
|---------|---------|------|-----|
| **uPlot** | Financial charts | 48KB | Fastest, no watermark, MIT |
| **Rough.js** | Hand-drawn/sketchy graphics | 40KB | Creates organic, hand-drawn feel |
| **GSAP** | Professional animations | 28KB | Spring physics, morphing, timelines |
| **Motion One** | Lightweight animations | 5KB | Web Animations API, Solid-native |
| **PixiJS** | 2D WebGL rendering | 200KB | Particle systems, GPU acceleration |
| **D3.js** | Data visualization | 230KB | Network graphs, force layouts |
| **Paper.js** | Vector graphics | 120KB | Path animation, boolean operations |

### 2.2 Library Usage Map

| Page | Library | Use Case |
|------|---------|----------|
| Home | Rough.js | Hero sketch animation, project cards |
| Home | GSAP | Hero parallax, scroll reveals |
| World | uPlot | Price charts, candlestick |
| World | Canvas2D | Scatter plots, metric sparklines |
| World | D3.js | Correlation network graph |
| ETF | uPlot | ETF price chart |
| ETF | Canvas2D | Allocation donut charts |
| Projects | Rough.js | Repository cards, language dots |
| Dossier | GSAP | Timeline animation |
| All | Motion One | Micro-interactions, transitions |

### 2.3 Rough.js for Amoebic Feel

Rough.js creates hand-drawn, sketchy graphics that add organic texture to the brutalist grid:

```javascript
import rough from 'roughjs';

const canvas = document.getElementById('project-card');
const rc = rough.canvas(canvas);

// Draw a "hand-drawn" rectangle for project cards
rc.rectangle(10, 10, 200, 120, {
  fill: 'rgba(0, 229, 255, 0.1)',
  stroke: '#00e5ff',
  strokeWidth: 1,
  roughness: 1.5,  // Organic roughness
  bowing: 1.0,     // Curve the lines
});

// Draw organic connecting lines between sections
rc.line(0, height/2, width, height/2, {
  stroke: 'rgba(255,255,255,0.1)',
  strokeWidth: 1,
  roughness: 2,
});
```

### 2.4 GSAP for Cinematic Animations

```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Cinematic parallax on hero
gsap.to('.hero-bg', {
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  },
  y: 100,
  scale: 1.1,
  ease: 'none',
});

// Amoebic card hover
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      borderRadius: '20% 40% 30% 50%',
      scale: 1.02,
      y: -4,
      duration: 0.4,
      ease: 'elastic.out(1, 0.3)',
    });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      borderRadius: '0',
      scale: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
  });
});
```

---

## 3. Component Design

### 3.1 Navigation Bar

```
┌──────────────────────────────────────────────────────────────┐
│  WYATT_AU          PROJECTS  DOSSIER  WORLD  DOCS  ETF  ⇄  │
└──────────────────────────────────────────────────────────────┘
```

**Spatial Materialism:**
- Glassmorphism: `backdrop-filter: blur(12px) saturate(180%)`
- Border: `1px solid var(--border)` — visible structural element
- Shadow: `var(--shadow-md)` — floats above content
- Z-index: 100 (above content, below modals)

**Amoebic Touch:**
- Active nav item has amoebic underline (not straight line)
- Hover: subtle scale + glow on nav links

### 3.2 Hero Section

```
┌──────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░ [Parallax: london_night]  [Parallax: hong_kong] ░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓▓ Overlay gradient (cinematic vignette)          ▓▓▓▓▓▓▓▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                                              │
│  Backend Engineer & Systems Architect                        │
│                                                              │
│  WYATT AU                        ← text-shadow: glow         │
│                                                              │
│  Building deterministic infrastructure and high-performance  │
│  systems. Currently bootstrapping QuestHive.                 │
│                                                              │
│  United Kingdom // wyatt_au@protonmail.com                   │
│                                                              │
│  [GH] [FJ] [X]    ← buttons with amoebic hover              │
│                                                              │
│                              SCROLL ↓    ← breathing animation│
└──────────────────────────────────────────────────────────────┘
```

**Cinematic Elements:**
- 3-5 parallax layers (images, overlay, content)
- Vignette gradient overlay
- Film grain texture (subtle)
- Text-shadow glow on name
- Slow fade-in on scroll (800ms)

**Spatial Materialism:**
- Images have depth via parallax (translateZ)
- Overlay creates depth separation
- Content floats above with shadow

### 3.3 Card System (Amoebic)

```
┌─────────────────────────────────────┐
│  PROJECT CARD                       │
│  ┌─────────────────────────────┐    │
│  │  ░░ Rough.js border ░░░░░░ │    │  ← hand-drawn border
│  │                             │    │
│  │  AILERON                     │    │  ← monospace title
│  │  Keyboard-driven web env    │    │
│  │  Rust · Servo · Lua         │    │  ← language dots
│  │                             │    │
│  └─────────────────────────────┘    │
│                                      │
│  On hover:                           │
│  ┌─╮                                │
│  │ ╰──╮  ← organic morph            │
│  │    │     border-radius changes    │
│  │ ╭──╯     scale: 1.02             │
│  └─╯        shadow: glow            │
└─────────────────────────────────────┘
```

**Brutalist Base:** Zero border-radius, monospace, grid alignment
**Amoebic Hover:** Border-radius morphs to organic shape, scale + glow
**Rough.js Border:** Hand-drawn border adds organic texture

---

## 4. Data Visualization Design

### 4.1 Price Chart (uPlot)

```
┌──────────────────────────────────────────────────┐
│  PRICE HISTORY                          [1M][3M]  │
│  ──────────────────────────────────────────────  │
│                                                   │
│  $65,814 ──────────────────────────────────────  │
│           ╱╲    ╱╲                               │
│          ╱  ╲  ╱  ╲    ╱╲                        │
│  $60,000 ╲  ╲╱    ╲  ╱  ╲                       │
│           ╲        ╲╱    ╲  ╱╲                  │
│  $55,000   ╲              ╲╱  ╲                 │
│                                                   │
│  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug         │
│                                                   │
│  ┌─ Volume bars (subtle, below chart) ────────┐  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Styling:**
- Chart background: `var(--bg-card)`
- Grid lines: `rgba(255,255,255,0.04)` — barely visible
- Price line: `var(--accent)` with 2px width
- Crosshair: Dashed lines, label with price + date
- Volume bars: `rgba(0,229,255,0.1)` — very subtle

### 4.2 Correlation Network (D3.js)

```
┌──────────────────────────────────────────────────┐
│  CORRELATION NETWORK                              │
│                                                   │
│       BTC ──── 0.85 ──── ETH                      │
│      ╱ ╲                    ╱ ╲                   │
│   0.25  0.72            0.68  0.35              │
│    ╱      ╲              ╱      ╲                │
│  S&P500 ────── -0.15 ────── Gold                  │
│                                                   │
│  Edge width = |correlation|                       │
│  Edge color = positive (cyan) / negative (red)    │
│  Node size = market cap                           │
└──────────────────────────────────────────────────┘
```

### 4.3 WASM Widget Container

```
┌──────────────────────────────────────────────────┐
│  FOURIER TRANSFORM                               │
│  ─────────────────────────────────────────────── │
│                                                   │
│  TIME DOMAIN          FREQUENCY SPECTRUM          │
│  ╱╲  ╱╲  ╱╲          ▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌       │
│  ╲  ╲╱  ╲╱           ▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌       │
│                       ▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌       │
│                       ▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌       │
│                       ▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌       │
│  0 Hz    110 Hz    220 Hz    440 Hz              │
│                                                   │
│  Loading WASM...  ← skeleton until WASM loads     │
└──────────────────────────────────────────────────┘
```

---

## 5. Responsive Design

### 5.1 Breakpoints

| Breakpoint | Width | Layout | Spatial |
|------------|-------|--------|---------|
| Mobile | <768px | Single column | Flat, no parallax |
| Tablet | 768-1024px | 2-column grid | Reduced depth |
| Desktop | 1024-1400px | Full layout | Full parallax |
| Ultra-wide | >1400px | Max-width + letterbox | Cinematic letterbox |

### 5.2 Ultra-wide Cinematic Mode

```css
@media (min-width: 1800px) {
  body::before,
  body::after {
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

---

## 6. Accessibility

### 6.1 ARIA Patterns

| Component | Role | Attributes |
|-----------|------|------------|
| Navigation | `navigation` | `aria-label="Main navigation"` |
| Command palette | `dialog` | `aria-modal="true"`, `aria-label="Command palette"` |
| Metric cards | `status` | `aria-label` with metric name |
| Charts | `img` | `aria-label` describing chart content |
| Map | `region` | `aria-label="Interactive world map"` |
| WASM widgets | `img` | `aria-label` describing widget content |

### 6.2 Reduced Motion

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

## 7. Performance Patterns

### 7.1 Critical CSS

Inline in `<head>`:
- Font-face declarations
- Base reset (border-radius: 0)
- Navigation layout
- Hero section (100vh)
- Theme variables
- Spatial tokens (z-index, shadows)

### 7.2 Asset Loading

| Asset | Loading | Priority | Library |
|-------|---------|----------|---------|
| Critical CSS | Inline | Immediate | — |
| Full CSS | `<link>` | High | — |
| Fonts | `font-display: swap` | High | — |
| SolidJS islands | `client:load` | High | — |
| GSAP | `<script>` | High | gsap |
| uPlot | IntersectionObserver | Low | uPlot |
| Rough.js | IntersectionObserver | Low | roughjs |
| D3.js | IntersectionObserver | Low | d3 |
| WASM widgets | IntersectionObserver | Low | wasm-pack |
| Images | `loading="lazy"` | Low | — |

### 7.3 Caching

| Resource | Cache-Control | Strategy |
|----------|---------------|----------|
| HTML | `max-age=0, must-revalidate` | Always fresh |
| CSS/JS | `max-age=31536000, immutable` | Content-hashed |
| Fonts | `max-age=31536000, immutable` | Self-hosted |
| Images | `max-age=86400` | Daily refresh |
| API | Varies (10s-6h) | Stale-while-revalidate |
| WASM | `max-age=31536000, immutable` | Content-hashed |

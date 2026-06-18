# BP-ASTRO-SITE-001: Astro Site Core

**IEEE 1016 Software Design Description**

| Field | Value |
|-------|-------|
| ID | BP-ASTRO-SITE-001 |
| Title | Astro Site Core — SSG, Routing, Content Collections |
| Status | Approved |
| Version | 1.0.0 |
| Date | 2026-06-17 |
| Author | Construct (Systems Architect) |
| Priority | Critical |
| Layer | Presentation |

---

## BP-1: Design Overview

### 1.1 System Purpose

The Astro Site Core provides the static site generation (SSG) foundation for the Hydrated Personal Site. It pre-renders 8 pages at build time, manages file-based routing, serves content collections, and provides the HTML shell into which SolidJS islands and WASM widgets are hydrated.

The primary goal is achieving Lighthouse 95+ across all categories while maintaining zero hydration overhead on static content.

### 1.2 Scope

**In scope:**
- Astro 5.x SSG configuration
- File-based routing (8 pages + 404)
- Content collections (projects, expertise, timeline)
- BaseLayout HTML shell (fonts, critical CSS, meta)
- Static Astro components (Nav, Footer, Hero, ExpertiseGrid, Timeline)
- Shared UI primitives (Card, Badge, Button)
- CSS architecture (themes, base, animations, components)
- Static asset management (fonts, OG images, favicons, data JSON)

**Out of scope:**
- Client-side interactivity (→ BP-SOLIDJS-COMPONENTS-001)
- API proxying (→ BP-CF-WORKER-001)
- WASM widget rendering (→ BP-WASM-WIDGETS-001)

### 1.3 Stakeholders

| Stakeholder | Concern |
|-------------|---------|
| Wyatt Au | Portfolio showcase, technical demonstration |
| Recruiters | Quick skills assessment |
| Developers | Technical depth |
| Search Engines | SEO, structured data, accessibility |

### 1.4 Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                              │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Astro 5.x   │───▶│  CF Pages    │───▶│  Browser     │       │
│  │  (SSG Build) │    │  (Static)    │    │              │       │
│  └──────┬───────┘    └──────────────┘    └──────┬───────┘       │
│         │                                        │                │
│         ▼                                        ▼                │
│  ┌──────────────┐                    ┌──────────────────┐        │
│  │  Content     │                    │  SolidJS Islands  │       │
│  │  Collections │                    │  (client:load)    │       │
│  └──────────────┘                    └──────────────────┘        │
│                                                                   │
│  ┌──────────────┐                    ┌──────────────────┐        │
│  │  CSS System  │                    │  WASM Widgets    │        │
│  │  (Tailwind 4)│                    │  (lazy-loaded)   │        │
│  └──────────────┘                    └──────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Design Constraints

- **Build output**: Static HTML + CSS + JS (no SSR)
- **Browser support**: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- **No IE11**: Modern CSS features used throughout
- **CSS budget**: <80KB (Tailwind 4 purging)
- **Initial JS budget**: <50KB (SolidJS ~4KB + Alpine ~16KB)
- **Font budget**: 78KB (Inter 47KB + JetBrains Mono 31KB)

---

## BP-2: Design Decomposition

### 2.1 Component Hierarchy

```
BaseLayout.astro
├── <head>
│   ├── Critical CSS (inline)
│   ├── Font preloads
│   ├── Theme script (blocking, prevents FOUC)
│   ├── SEO meta tags
│   ├── Structured data (JSON-LD)
│   └── Open Graph / Twitter Cards
├── <body>
│   ├── Skip-to-content link
│   ├── Nav.astro (fixed, glassmorphism)
│   │   ├── Logo (WYATT_AU)
│   │   ├── Navigation links (7 routes)
│   │   └── <ThemeToggle client:load /> (SolidJS)
│   ├── <main id="content">
│   │   └── <slot /> (page content)
│   ├── Footer.astro
│   │   ├── Social links
│   │   └── Copyright
│   └── <CommandPalette client:load /> (SolidJS)
│
├── pages/
│   ├── index.astro ─────────── Home (Hero, About, Projects, Expertise, Employment, Contact)
│   ├── projects.astro ──────── Project list (filterable, sortable)
│   ├── dossier.astro ────────── Technical expertise, timeline
│   ├── world.astro ──────────── World intelligence monitor
│   ├── docs.astro ───────────── Technical notes (RSS)
│   ├── etf.astro ────────────── ETF database & analysis
│   ├── guestbook.astro ──────── User-submitted messages
│   ├── uses.astro ───────────── Development tools
│   └── 404.astro ────────────── Terminal-style error
│
├── components/astro/
│   ├── Hero.astro ──────────── Parallax hero with cinematic effects
│   ├── Nav.astro ───────────── Fixed top navigation
│   ├── Footer.astro ────────── Site footer
│   ├── ExpertiseGrid.astro ─── 6-category skill grid
│   └── Timeline.astro ──────── Employment/education timeline
│
├── components/ui/
│   ├── Card.astro ──────────── Brutalist card with amoebic hover
│   ├── Badge.astro ─────────── Language/skill badges
│   └── Button.astro ────────── Themed button
│
└── content/
    ├── projects/ ───────────── Markdown files per project
    ├── expertise/ ──────────── Structured skill data
    └── timeline/ ───────────── Employment/education entries
```

### 2.2 Dependency Graph

```
BaseLayout.astro
  ├── components/astro/Nav.astro
  ├── components/astro/Footer.astro
  └── pages/* (all depend on BaseLayout)

pages/index.astro
  ├── components/astro/Hero.astro
  ├── components/astro/ExpertiseGrid.astro
  ├── components/astro/Timeline.astro
  ├── components/ui/Card.astro
  ├── components/solid/ThemeToggle.tsx (client:load)
  ├── components/solid/CommandPalette.tsx (client:load)
  ├── components/solid/TickerBar.tsx (client:load)
  └── components/solid/ContactForm.tsx (client:load)

pages/world.astro
  ├── components/solid/MetricCards.tsx (client:load)
  ├── Leaflet.js (vanilla JS)
  └── uPlot (vanilla JS)

pages/etf.astro
  ├── components/solid/SearchBar.tsx (client:load)
  ├── components/solid/PortfolioComparison.tsx (client:load)
  └── uPlot (vanilla JS)
```

### 2.3 Coupling Metrics

| Interface | Type | Coupling Level |
|-----------|------|----------------|
| BaseLayout → pages | Content slot | Low |
| BaseLayout → SolidJS | `client:load` directive | Low |
| BaseLayout → CSS | Import | Low |
| pages → content/ | `getCollection()` | Medium |
| pages → components/astro/ | Direct import | Medium |
| pages → components/solid/ | `client:load` | Low |
| CSS → HTML | Custom properties | Medium |

---

## BP-3: Design Rationale

### 3.1 Framework Choice (ADR-001)

**Decision**: Astro 5.x + SolidJS 1.9

**Rationale**:
1. **Native SSG** — No SSR complexity, all pages pre-rendered at build
2. **Islands architecture** — SolidJS only hydrates specific elements, zero overhead on static content
3. **No hydration conflicts** — Unlike Leptos 0.8, SolidJS doesn't fight vanilla JS for DOM ownership
4. **File-based routing** — Natural mapping from filesystem to URLs
5. **Content collections** — Type-safe structured content without external CMS
6. **Bundle size** — No 1.1MB hydrate WASM on every page

### 3.2 Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Leptos 0.8 (current) | Rust type-safety | Fights vanilla JS, fragile SSG | Rejected |
| Next.js + React | Huge ecosystem | Heavy bundle, React overhead | Rejected |
| SvelteKit | Lightweight | Less mature ecosystem | Considered |
| Astro + React | Islands + ecosystem | React bundle size | Rejected |
| Astro + Solid | Islands + minimal bundle | Newer ecosystem | **Accepted** |

### 3.3 Why Not SSR?

The site is portfolio-focused with 20+ API proxies handled by CF Worker. All pages are static HTML that gain no benefit from server-side rendering. SSG provides:
- Faster builds (no runtime compilation)
- Simpler deployment (static files only)
- Better caching (immutable HTML)
- No server costs

---

## BP-4: Traceability

### 4.1 Requirements → Design Mapping

| Requirement ID | Requirement | Design Element |
|----------------|-------------|----------------|
| FR-2.1 | Page Structure (8 routes) | File-based routing in `pages/` |
| FR-2.2.1 | Theme System (6 themes) | CSS custom properties in `themes.css` |
| FR-2.2.2 | Navigation (glassmorphism) | `Nav.astro` + SolidJS `ThemeToggle` |
| FR-3.1 | Performance (LCP <1.5s) | SSG pre-render + critical CSS |
| FR-3.2 | SEO (structured data) | BaseLayout meta + JSON-LD |
| FR-3.3 | Accessibility (WCAG 2.1 AA) | Semantic HTML, ARIA, skip-link |
| FR-5.1 | Static Content | Content collections + Astro components |
| FR-5.3 | Media (fonts, images) | Public directory + font preloads |

### 4.2 Design → ADR Mapping

| Design Decision | ADR |
|-----------------|-----|
| Astro 5.x framework | ADR-001 |
| Tailwind CSS 4 | ADR-005 |
| Content collections | ADR-006 |
| File-based routing | ADR-001 |
| Critical CSS strategy | ADR-005 |

---

## BP-5: Interface Design

### 5.1 Page Routes

| Route | File | Content | Interactive Features |
|-------|------|---------|---------------------|
| `/` | `pages/index.astro` | Hero, About, Projects, Expertise, Employment, Contact | Theme toggle, command palette, ticker bar, contact form |
| `/projects` | `pages/projects.astro` | Dynamic project list | Filter, sort, search |
| `/dossier` | `pages/dossier.astro` | Expertise, timeline | Scroll reveals |
| `/world` | `pages/world.astro` | Intelligence monitor | Map, metrics, charts, panels |
| `/docs` | `pages/docs.astro` | Technical notes | Search, filter, RSS |
| `/etf` | `pages/etf.astro` | ETF database | Search, detail, comparison, correlation |
| `/guestbook` | `pages/guestbook.astro` | User messages | Submit form, display list |
| `/uses` | `pages/uses.astro` | Dev tools | Static content |
| `/404` | `pages/404.astro` | Error page | Terminal-style |

### 5.2 Content Collections Schema

```typescript
// content/config.ts
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
    ogImage: z.string().optional(),
  }),
});

const expertise = defineCollection({
  type: 'data',
  schema: z.object({
    category: z.string(),
    skills: z.array(z.object({
      name: z.string(),
      level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      years: z.number().optional(),
    })),
  }),
});

const timeline = defineCollection({
  type: 'data',
  schema: z.object({
    type: z.enum(['employment', 'education']),
    title: z.string(),
    organization: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    description: z.string(),
    highlights: z.array(z.string()).default([]),
  }),
});
```

### 5.3 API Client (lib/api.ts)

```typescript
const API_BASE = '/api';

export async function fetchAPI<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new APIError(response.status, await response.text());
  }

  return response.json();
}

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(`API Error ${status}: ${message}`);
  }
}
```

---

## BP-6: Data Design

### 6.1 Content Schema (TypeScript Types)

```typescript
// lib/types.ts

// === Content Collections ===
interface Project {
  id: string;
  title: string;
  description: string;
  language: string;
  repo: string;
  featured: boolean;
  tags: string[];
  ogImage?: string;
  body: string; // Markdown content
}

interface Expertise {
  id: string;
  category: string;
  skills: Skill[];
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years?: number;
}

interface TimelineEntry {
  id: string;
  type: 'employment' | 'education';
  title: string;
  organization: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  highlights: string[];
}

// === Static Data ===
interface WorldData {
  earthquakes: Earthquake[];
  countries: Country[];
}

interface ETFData {
  etfs: ETF[];
}

interface LLMBenchmark {
  model: string;
  provider: string;
  scores: Record<string, number>;
  price?: number;
  speed?: number;
}

// === API Responses ===
interface CryptoTicker {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  lat: number;
  lng: number;
  depth: number;
}

interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  deleted?: boolean;
}
```

### 6.2 Theme Data Model

```typescript
// themes.css custom properties
interface ThemeTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentWarm: string;
  border: string;
  shadowDepth: string;
  // Amoebic accent colors
  amoebaPrimary: string;
  amoebaSecondary: string;
  amoebaTertiary: string;
  amoebaGradient: string;
}
```

---

## BP-7: Component Design

### 7.1 BaseLayout.astro

**Purpose**: HTML shell providing fonts, critical CSS, meta tags, and slot for page content.

```
BaseLayout.astro
├── Props: title, description, ogImage, canonicalURL
├── <head>
│   ├── Preconnect to external domains
│   ├── Font preloads (Inter, JetBrains Mono)
│   ├── Critical CSS (inline, <2KB)
│   ├── Theme detection script (blocking)
│   ├── SEO meta tags
│   ├── Open Graph tags
│   ├── Twitter Card tags
│   ├── JSON-LD structured data
│   └── Canonical URL
├── <body class="theme-{theme}">
│   ├── Skip-to-content link
│   ├── <Nav client:load />
│   ├── <main id="content">
│   │   └── <slot />
│   ├── <Footer />
│   ├── <CommandPalette client:load />
│   ├── Vignette overlay (cinematic)
│   ├── Film grain texture
│   └── Analytics script
```

### 7.2 Nav.astro

**Purpose**: Fixed top navigation with glassmorphism effect.

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│  WYATT_AU          PROJECTS  DOSSIER  WORLD  DOCS  ETF  ⇄  │
└──────────────────────────────────────────────────────────────┘
```

**Features**:
- Fixed position, `z-index: 100`
- Glassmorphism: `backdrop-filter: blur(12px) saturate(180%)`
- Active page highlighting
- Mobile hamburger menu (SolidJS)
- Theme toggle (SolidJS `client:load`)

### 7.3 Footer.astro

**Purpose**: Site footer with social links and copyright.

**Features**:
- Social links (GitHub, Forgejo, X)
- Copyright notice
- Back-to-top button

### 7.4 Hero.astro

**Purpose**: Dramatic hero section with parallax and cinematic effects.

**Features**:
- 3-5 parallax layers (CSS `translateZ`)
- Vignette gradient overlay
- Film grain texture
- Text-shadow glow on name
- Scroll-down breathing animation
- Responsive: `clamp(3.5rem, 8vw, 7rem)` for name

### 7.5 ExpertiseGrid.astro

**Purpose**: 6-category skill grid with data from content collections.

**Layout**:
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Backend │ │ Frontend│ │ DevOps  │
├─────────┤ ├─────────┤ ├─────────┤
│ Data    │ │ Security│ │ Mobile  │
└─────────┘ └─────────┘ └─────────┘
```

### 7.6 Timeline.astro

**Purpose**: Employment and education timeline with scroll reveals.

### 7.7 UI Primitives

**Card.astro**: Brutalist card with zero border-radius, amoebic hover via CSS.

**Badge.astro**: Language/skill badge with theme-aware colors.

**Button.astro**: Themed button with hover states.

---

## BP-8: Deployment

### 8.1 Build Pipeline

```
Source Code
    ↓
bun install (dependencies)
    ↓
├── wasm-pack build (Rust WASM widgets) → packages/widgets/pkg/
├── tailwindcss (CSS processing) → styles.css
├── astro build (SSG) → dist/client/ (static HTML)
└── wrangler pages deploy → CF Pages
```

### 8.2 CF Pages Configuration

| Setting | Value |
|---------|-------|
| Build command | `bun run build` |
| Build output directory | `dist/client` |
| Node.js version | 20.x |
| Production branch | `main` |
| Preview branch | `preview` |

### 8.3 Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | CF account | CI secret |
| `CLOUDFLARE_API_TOKEN` | CF API token | CI secret |

### 8.4 Asset Caching

| Resource | Cache-Control | Strategy |
|----------|---------------|----------|
| HTML | `max-age=0, must-revalidate` | Always fresh |
| CSS/JS | `max-age=31536000, immutable` | Content-hashed |
| Fonts | `max-age=31536000, immutable` | Self-hosted |
| Images | `max-age=86400` | Daily refresh |
| WASM | `max-age=31536000, immutable` | Content-hashed |

---

## BP-9: Compliance

### 9.1 WCAG 2.1 AA

| Criterion | Implementation |
|-----------|---------------|
| 1.1.1 Non-text Content | Alt text on all images, ARIA labels on charts/maps |
| 1.3.1 Info and Relationships | Semantic HTML, proper heading hierarchy |
| 1.4.3 Contrast | Minimum 4.5:1 for text, 3:1 for large text |
| 1.4.11 Non-text Contrast | 3:1 for UI components |
| 2.1.1 Keyboard | All interactive elements keyboard-accessible |
| 2.4.1 Bypass Blocks | Skip-to-content link |
| 2.4.3 Focus Order | Logical tab order |
| 2.4.7 Focus Visible | Visible focus indicators |
| 3.1.1 Language of Page | `lang="en"` on `<html>` |
| 4.1.2 Name, Role, Value | ARIA labels on all interactive elements |

### 9.2 SEO

| Requirement | Implementation |
|-------------|---------------|
| Structured data | JSON-LD (WebSite + Person) |
| Open Graph | Per-page with custom images |
| Twitter Cards | Summary large image |
| Sitemap | Auto-generated by Astro |
| RSS | Auto-generated from content collections |
| Canonical URLs | Per-page `<link rel="canonical">` |
| Meta descriptions | Per-page `<meta name="description">` |
| Semantic HTML | Proper heading hierarchy, landmarks |

### 9.3 Performance Compliance

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | <1.5s | SSG + critical CSS + font preload |
| FID | <50ms | SolidJS hydration only on islands |
| CLS | <0.01 | Fixed dimensions, `font-display: swap` |
| TTI | <1.5s | Lazy WASM, minimal initial JS |
| Lighthouse | 95+ | All of the above |

---

## BP-10: Quality Checklist

- [ ] All 8 routes render correctly
- [ ] 404 page shows for invalid routes
- [ ] Content collections load and type-check
- [ ] Theme system works (6 themes, persistence, FOUC prevention)
- [ ] Navigation highlights active page
- [ ] Mobile responsive (320px-2560px)
- [ ] Skip-to-content link works
- [ ] All images have alt text
- [ ] Heading hierarchy is correct (h1 → h2 → h3)
- [ ] JSON-LD validates with Google Rich Results Test
- [ ] Open Graph tags present on all pages
- [ ] RSS feed generates correctly
- [ ] Sitemap generates correctly
- [ ] Critical CSS inline in `<head>`
- [ ] Font preloads present
- [ ] No console errors
- [ ] Lighthouse Performance ≥95
- [ ] Lighthouse Accessibility =100
- [ ] Lighthouse SEO =100
- [ ] Build completes without errors
- [ ] `bun run build` produces static output
- [ ] Bundle size <80KB CSS, <50KB JS

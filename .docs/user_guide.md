# User Guide: Hydrated Personal Site

## Project Overview

Wyatt Au's personal portfolio site, built with **Astro 5 + SolidJS 1.9**. Features 13 WASM showcase widgets, 20+ API proxies, a world intelligence monitor, ETF analytics, and a brutalist-cinematic design system.

### Architecture Summary

| Layer | Technology | Role |
|-------|-----------|------|
| SSG/Routing | Astro 5.x | Static HTML pre-rendering, file-based routing |
| Interactive UI | SolidJS 1.9 | Search, forms, filters, reactive components |
| Charts | uPlot | Financial candlestick/line charts (48KB) |
| Map | Leaflet.js | World map with earthquake markers |
| Compute | Rust + wasm-pack | 13 WASM showcase widgets (70-130KB each) |
| API Layer | Cloudflare Workers | 20+ API proxies with caching |
| Storage | Cloudflare KV | Guestbook persistence, rate limiting |
| Hosting | Cloudflare Pages | Static asset serving, edge CDN |

---

## Development Setup

### Prerequisites

- **Bun** 1.0+ (package manager + runtime)
- **Rust** + `wasm-pack` (for WASM widgets)
- **Git**

### Install

```bash
git clone https://forgejo.wyattau.com/wyatt/hydrated_personal_site.git
cd hydrated_personal_site
bun install
```

### Dev Server

```bash
# Start Astro dev server
bun run dev

# Start CF Worker in parallel (for API endpoints)
cd worker && bun run dev
```

Site runs at `http://localhost:4321`.

### Build WASM Widgets

```bash
# Build all 13 widgets
cd packages/widgets
./scripts/build.sh

# Or build individually
wasm-pack build --target web --release
```

Output: `packages/widgets/pkg/` → copied to `apps/site/public/wasm/`

### Build Full Site

```bash
bun run build
```

Output: `apps/site/dist/` (static HTML + JS + CSS + WASM)

---

## Testing

```bash
# Unit tests
bun run test

# E2E tests
bun run test:e2e

# Type checking
bun run typecheck

# Lint + format
bun run lint
```

---

## Project Structure

```
hydrated_personal_site/
├── apps/site/              # Astro application
│   ├── src/
│   │   ├── pages/          # 9 routes (/, /projects, /dossier, /world, /docs, /etf, /guestbook, /uses, 404)
│   │   ├── components/
│   │   │   ├── solid/      # SolidJS interactive components
│   │   │   ├── wasm/       # WASM embed wrappers
│   │   │   ├── astro/      # Static Astro components
│   │   │   └── ui/         # Shared UI primitives
│   │   ├── layouts/        # BaseLayout.astro
│   │   ├── content/        # Content collections (projects, expertise, timeline)
│   │   ├── styles/         # themes.css, base.css, animations.css, components.css
│   │   └── lib/            # api.ts, types.ts, utils.ts
│   └── public/
│       ├── wasm/           # WASM build output
│       ├── fonts/          # Inter + JetBrains Mono
│       ├── data/           # Static JSON (world.json, etf.json, llm-benchmarks.json)
│       └── og-images/      # 9 OG images (1200x630)
├── packages/widgets/       # Rust WASM widgets (13 total)
├── worker/                 # CF Worker API layer
├── turbo.json              # Turborepo pipeline
└── package.json
```

---

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `CLOUDFLARE_ACCOUNT_ID` | CF account ID | Yes (deploy) |
| `CLOUDFLARE_API_TOKEN` | CF API token | Yes (deploy) |
| `AA_API_KEY` | Artificial Analysis API | Yes (LLM benchmarks) |
| `FRED_API_KEY` | Federal Reserve API | No (optional) |

### Themes

6 themes via CSS custom properties, persisted to localStorage:

| Theme | Background | Accent |
|-------|-----------|--------|
| midnight-navy (default) | #050505 | #00e5ff |
| tokyo-night | #1a1b26 | #7aa2f7 |
| arctic-dawn | #f0f4f8 | #0055ee |
| solaris | #0d1117 | #f0883e |
| light | #f5f5f5 | #00838f |

Toggle via the ⇄ button in the navigation bar or `Ctrl+K` command palette.

---

## Contributing

1. Create a feature branch from `main`
2. Make changes following the existing code conventions:
   - **TypeScript** for all JS code
   - **Biome** for linting + formatting (`bun run lint`)
   - **SolidJS** for interactive components
   - **Astro components** for static content
   - **Rust** for WASM widgets (plain `web-sys`, no framework)
3. Add tests for new features
4. Run `bun run typecheck && bun run lint && bun run test` before committing
5. Submit a pull request

### Code Conventions

- Zero `border-radius` by default (brutalist design)
- CSS custom properties for all theme values
- IntersectionObserver for lazy-loading (WASM, charts, images)
- CustomEvent bridge for cross-layer communication (SolidJS ↔ vanilla JS ↔ WASM)
- No `eval()` or `Function()` constructors
- No secrets in source code

---

## Blue Papers (Design Documents)

| Document | Location | Content |
|----------|----------|---------|
| Requirements | `requirements.md` | Functional + non-functional requirements |
| Architecture | `architecture.md` | System design, component boundaries, data flow |
| Design System | `design.md` | Visual philosophy, color, typography, animations |
| Decisions | `decisions.md` | 24 Architecture Decision Records (ADRs) |
| Implementation Plan | `plan.md` | 6-phase build plan, task breakdown |
| API Reference | `.docs/api_reference.md` | All API endpoints with schemas |
| Design Tokens | `.docs/design_system.md` | Full design system documentation |
| Deployment Runbook | `.docs/deployment_runbook.md` | Deployment + rollback procedures |
| Master Plan | `.specs/08_roadmap/master_plan.toml` | Topological task graph |

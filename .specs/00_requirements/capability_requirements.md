# Capability Requirements: Hydrated Personal Site

## 1. Core Capabilities

### 1.1 Static Site Generation
| Capability | Requirement | Source |
|------------|-------------|--------|
| Pre-rendered HTML | All 8 pages generated at build time | `architecture.md:12-14` |
| File-based routing | Routes: `/`, `/projects`, `/dossier`, `/world`, `/docs`, `/etf`, `/guestbook`, `/uses` | `architecture.md:14`, `requirements.md:31-39` |
| Content collections | Structured content for projects, expertise, timeline | ADR-006 |
| MDX support | Future blog/docs migration | ADR-006 |
| Image optimization | WebP/AVIF, lazy loading, `loading="lazy"` | `requirements.md:143` |

### 1.2 Client-Side Interactivity (SolidJS Islands)
| Capability | Requirement | Source |
|------------|-------------|--------|
| Selective hydration | `client:load` on specific elements | ADR-001 |
| Reactive state | `createSignal`, `createMemo`, `createEffect` | ADR-007 |
| Form handling | Contact form, guestbook submission | `requirements.md:32,71-76` |
| Search/filter | Project list, docs, ETF database | `requirements.md:36-37` |
| Command palette | `Ctrl+K` or `/` to open | `requirements.md:50` |
| Theme toggle | 6 themes, localStorage persistence | `requirements.md:45-48` |

### 1.3 Data Fetching & Caching
| Capability | Requirement | Source |
|------------|-------------|--------|
| API proxy | 16+ endpoints via CF Worker | `requirements.md:85-103` |
| Automatic caching | Stale-while-revalidate per endpoint | `requirements.md:86-103` |
| Background refetch | TanStack Solid Query | ADR-017 |
| Deduplication | Multiple components share cache | ADR-017 |
| Graceful degradation | Fallback when APIs unavailable | `requirements.md:164` |

### 1.4 Financial Visualizations
| Capability | Requirement | Source |
|------------|-------------|--------|
| Candlestick charts | uPlot, timeframe selection | `requirements.md:59`, ADR-002 |
| Line/area charts | Price history, ETF performance | `requirements.md:59` |
| Crosshair | Price + date tooltip | `design.md:429-456` |
| Multi-series comparison | Side-by-side ETF comparison | `requirements.md:68` |
| No watermark | MIT license, no branding | ADR-002 |

### 1.5 Interactive Map
| Capability | Requirement | Source |
|------------|-------------|--------|
| World map | Leaflet.js with country boundaries | `requirements.md:57` |
| Earthquake markers | USGS data, real-time updates | `requirements.md:57` |
| Capital markers | Country capitals displayed | `requirements.md:57` |
| Country intelligence panel | Click country for World Bank + REST Countries data | `requirements.md:58` |

### 1.6 WASM Widget System
| Capability | Requirement | Source |
|------------|-------------|--------|
| Lazy loading | IntersectionObserver, 200px margin | ADR-009 |
| 13 widgets | Finance (5), Science (3), Creative (2), DevTools (3) | `architecture.md:74-91` |
| Canvas2D rendering | Each widget owns its `<div>` subtree | ADR-003 |
| Error boundaries | Graceful failure when WASM crashes | `requirements.md:163` |
| Skeleton loading | Placeholder until WASM loads | ADR-009 |

### 1.7 Cross-Layer Communication
| Capability | Requirement | Source |
|------------|-------------|--------|
| CustomEvent bridge | SolidJS ↔ Charts ↔ WASM ↔ Leaflet | ADR-008 |
| Event types | `chart:update`, `chart:click`, `wasm:update`, `wasm:result` | ADR-008 |
| Clean decoupling | No shared mutable state | ADR-008 |

---

## 2. Design System Capabilities

### 2.1 Theme System
| Capability | Requirement | Source |
|------------|-------------|--------|
| 6 themes | midnight-navy, tokyo-night, arctic-dawn, solaris, light | `requirements.md:45`, `design.md:83-90` |
| CSS custom properties | `--bg-primary`, `--accent`, etc. | `design.md:63-81` |
| localStorage persistence | Theme choice saved | `requirements.md:47` |
| System preference detection | First visit defaults to OS theme | `requirements.md:48` |
| Smooth transitions | Theme switch animation | `requirements.md:49` |

### 2.2 Cinematic Effects
| Capability | Requirement | Source |
|------------|-------------|--------|
| Vignette overlay | Fixed, pointer-events: none | `design.md:162-169` |
| Film grain texture | SVG feTurbulence, opacity 0.03 | `design.md:171-179` |
| Letterboxing | Ultra-wide (>1800px) side bars | `design.md:181-194` |
| Parallax scrolling | 3-5 depth layers | `design.md:218-220` |

### 2.3 Amoebic Interactions
| Capability | Requirement | Source |
|------------|-------------|--------|
| Organic hover morph | Border-radius changes on hover | `design.md:130-139` |
| Breathe animation | Subtle scale pulse | `design.md:142-145` |
| Flow particles | Cursor-following particles | `design.md:148-156` |
| GSAP spring physics | Elastic.out easing | `decisions.md:429-449` |
| Rough.js borders | Hand-drawn card borders | `decisions.md:454-486` |

### 2.4 Animation System
| Capability | Requirement | Source |
|------------|-------------|--------|
| Scroll reveals | IntersectionObserver + GSAP | `design.md:207-215` |
| Page transitions | Astro View Transitions + Motion One | ADR-024 |
| Cinematic sequences | GSAP timelines for hero intro | ADR-021 |
| Reduced motion | `prefers-reduced-motion: reduce` | `design.md:544-552` |

### 2.5 Responsive Design
| Capability | Requirement | Source |
|------------|-------------|--------|
| Mobile (<768px) | Single column, flat layout | `design.md:500-503` |
| Tablet (768-1024px) | 2-column grid, reduced depth | `design.md:500-503` |
| Desktop (1024-1400px) | Full layout, full parallax | `design.md:500-503` |
| Ultra-wide (>1400px) | Max-width + letterbox | `design.md:500-503` |
| Viewport range | 320px to 2560px | `requirements.md:23` |

---

## 3. Security Capabilities

### 3.1 HTTP Security Headers
| Header | Value | Source |
|--------|-------|--------|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | `architecture.md:370` |
| X-Content-Type-Options | `nosniff` | `architecture.md:371` |
| X-Frame-Options | `DENY` | `architecture.md:372` |
| Cross-Origin-Opener-Policy | `same-origin` | `architecture.md:373` |
| Cross-Origin-Embedder-Policy | `credentialless` | `architecture.md:374` |
| Referrer-Policy | `strict-origin-when-cross-origin` | `architecture.md:375` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | `architecture.md:376` |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; ...` | `architecture.md:377` |

### 3.2 API Security
| Capability | Requirement | Source |
|------------|-------------|--------|
| Rate limiting | 5 posts/IP/10min on guestbook | `requirements.md:165` |
| Bearer token auth | Admin delete operations | `requirements.md:100` |
| CORS | Same-origin only | `architecture.md:383` |
| Input validation | Valibot schemas on all endpoints | ADR-019 |
| Error sanitization | No sensitive data in error messages | `architecture.md:386` |

### 3.3 WASM Security
| Capability | Requirement | Source |
|------------|-------------|--------|
| Same-origin loading | WASM from same domain | `architecture.md:390` |
| No external dependencies | Self-contained WASM modules | `architecture.md:391` |
| No eval/Function | Safe JavaScript execution | `architecture.md:392` |
| Memory-safe Rust | No unsafe blocks in widgets | `architecture.md:393` |

---

## 4. SEO Capabilities

| Capability | Requirement | Source |
|------------|-------------|--------|
| Structured data | JSON-LD for WebSite + Person | ADR-012 |
| Open Graph | Per-page with custom images | ADR-012 |
| Twitter Cards | Summary large image | ADR-012 |
| XML sitemap | Auto-generated by Astro | ADR-012 |
| RSS feed | Auto-generated from content collections | ADR-012 |
| Canonical URLs | Per-page | ADR-012 |
| Semantic HTML | Proper headings, landmarks, ARIA | `requirements.md:143` |
| Image optimization | WebP/AVIF, lazy loading | `requirements.md:143` |

---

## 5. Monitoring & Observability Capabilities

| Capability | Requirement | Source |
|------------|-------------|--------|
| RUM (Real User Monitoring) | Core Web Vitals via CF Worker | `architecture.md:399-403` |
| Error tracking | WASM error boundaries, API error logging | `architecture.md:407-410` |
| Uptime monitoring | CF Pages health check + Uptime Kuma | `architecture.md:413-416` |
| Performance dashboard | Aggregated KV data | `architecture.md:404` |

---

## 6. Development Tool Capabilities

| Capability | Tool | Source |
|------------|------|--------|
| Fast package installs | Bun (10x faster than npm) | ADR-015 |
| Monorepo orchestration | Turborepo with build caching | ADR-010 |
| Linting + formatting | Biome (Rust-powered) | ADR-016 |
| Unit testing | Vitest (Vite-native) | ADR-011 |
| E2E testing | Playwright (cross-browser) | ADR-011 |
| Schema validation | Valibot (1.4KB, tree-shakeable) | ADR-019 |
| Accessible UI | Kobalte (headless, Solid-native) | ADR-018 |
| Data fetching | TanStack Solid Query (caching, dedup) | ADR-017 |
| WASM build | wasm-pack (`--target web`) | ADR-003 |

---

## 7. Content Management Capabilities

| Capability | Requirement | Source |
|------------|-------------|--------|
| Git-based updates | Content via git commits | ADR-006 |
| Type-safe content | TypeScript types from content collections | ADR-006 |
| Structured projects | Markdown with frontmatter (title, description, language, repo, featured) | ADR-006 |
| Structured expertise | Skill categories with descriptions | ADR-006 |
| Structured timeline | Employment + education entries | ADR-006 |

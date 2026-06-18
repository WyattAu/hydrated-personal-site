# Applicable Standards: Hydrated Personal Site

## 1. ISO/IEC 12207 — Software Life Cycle Processes

### 1.1 Stakeholder Needs Definition (Clause 6.2)
| Requirement | Source | Implementation |
|-------------|--------|----------------|
| Identify stakeholders | `requirements.md:9-14` | 4 stakeholders: Wyatt, Recruiters, Developers, SEs |
| Define needs per stakeholder | `requirements.md:9-14` | Needs mapped in domain_analysis §4 |
| Establish acceptance criteria | `requirements.md:17-23` | Lighthouse 95+, FCP <1.5s, WCAG 2.1 AA, mobile responsive |

### 1.2 System Requirement Analysis (Clause 6.3)
| Requirement | Source | Verification |
|-------------|--------|-------------|
| Functional requirements | `requirements.md:27-103` | 8 routes, 6 interactive features, 16 API endpoints |
| Performance requirements | `requirements.md:124-134` | Lighthouse CI on every PR |
| SEO requirements | `requirements.md:137-143` | Google Rich Results Test validation |
| Accessibility requirements | `requirements.md:146-152` | axe-core automated checks |
| Security requirements | `requirements.md:154-160` | Security headers, CSP, rate limiting |

### 1.3 Software Architecture Design (Clause 6.4)
| Design Element | Source | Detail |
|----------------|--------|--------|
| System context | `architecture.md:1-60` | Cloudflare edge: Pages + Workers + KV |
| Component boundaries | `architecture.md:63-73` | Astro, SolidJS, uPlot, Leaflet, WASM, CF Worker |
| Communication patterns | `architecture.md:92-100` | CustomEvent bridge, fetch() API calls |
| Data flow | `architecture.md:157-193` | Static, dynamic, WASM, chart flows |

### 1.4 Software Integration (Clause 6.5)
| Integration | Mechanism | Document |
|-------------|-----------|----------|
| Astro + SolidJS | `client:load` directive | `architecture.md:17-25` |
| SolidJS + Charts | CustomEvent on document | `decisions.md:248-268` |
| SolidJS + Leaflet | Direct DOM manipulation | `architecture.md:92-100` |
| SolidJS + WASM | CustomEvent on document | `decisions.md:248-268` |
| All + CF Worker | fetch() API calls | `architecture.md:97-99` |

### 1.5 Software Verification (Clause 6.6)
| Verification | Tool | ADR |
|-------------|------|-----|
| Unit testing | Vitest | ADR-011 |
| Integration testing | Vitest | ADR-011 |
| E2E testing | Playwright | ADR-011 |
| Accessibility testing | axe-core | ADR-011 |
| Performance testing | Lighthouse CI | ADR-011 |

---

## 2. IEEE 1016 — Software Design Description

### 2.1 Context View
| Element | Description | Source |
|---------|-------------|--------|
| System name | Hydrated Personal Site | `requirements.md:1-6` |
| System purpose | Portfolio + Intelligence Dashboard + WASM Showcase | `requirements.md:6` |
| External interfaces | 16+ API endpoints, CF Pages, CF Workers | `requirements.md:85-103` |
| Stakeholders | 4 groups with distinct needs | `requirements.md:9-14` |

### 2.2 Composition View
| Component | Owns | Does NOT Own | Source |
|-----------|------|-------------|--------|
| Astro | HTML structure, routing, SSG, content | Client-side interactivity | `architecture.md:66` |
| SolidJS | Interactive UI, forms, search, filters | Chart rendering, map rendering | `architecture.md:67` |
| uPlot | Financial chart rendering | UI controls, data fetching | `architecture.md:68` |
| Leaflet.js | Map rendering, markers, popups | Data fetching, panel content | `architecture.md:69` |
| Rust WASM | Math computation, Canvas2D rendering | DOM manipulation outside `<div>` | `architecture.md:70` |
| CF Worker | API proxying, KV storage, headers | Static asset serving | `architecture.md:71` |

### 2.3 Logical View
| Pattern | Implementation | Source |
|---------|---------------|--------|
| Islands architecture | SolidJS hydrates specific elements only | `decisions.md:18-20` |
| CustomEvent bridge | Cross-layer communication via DOM events | `decisions.md:248-268` |
| Lazy loading | IntersectionObserver for WASM and charts | `decisions.md:278-312` |
| Content collections | Astro structured content (projects, expertise, timeline) | `decisions.md:176-206` |

### 2.4 Interface View
| Interface | Protocol | Components | Source |
|-----------|----------|-----------|--------|
| SolidJS → Charts | CustomEvent | `chart:update`, `chart:click` | `decisions.md:250-251` |
| SolidJS → Leaflet | Direct DOM | Map container manipulation | `architecture.md:98` |
| SolidJS → CF Worker | fetch() | `/api/*` endpoints | `architecture.md:99` |
| SolidJS → WASM | CustomEvent | `wasm:update`, `wasm:result` | `decisions.md:252-253` |
| Vanilla JS → CF Worker | fetch() | `/api/*` endpoints | `architecture.md:99` |

### 2.5 Performance View
| Metric | Target | Strategy | Source |
|--------|--------|----------|--------|
| LCP | <1.5s | Astro SSG + critical CSS + font preload | `requirements.md:126` |
| FID | <50ms | SolidJS hydration, no WASM on initial load | `requirements.md:127` |
| CLS | <0.01 | Fixed dimensions, font-display: swap | `requirements.md:128` |
| TTI | <1.5s | Lazy-load WASM widgets | `requirements.md:129` |
| Bundle (initial) | <50KB | SolidJS ~4KB + Alpine.js ~16KB | `requirements.md:130` |
| WASM (per widget) | <100KB | Lazy-load via IntersectionObserver | `requirements.md:131` |
| Total first load | <400KB | Astro SSG + lazy WASM | `requirements.md:134` |

### 2.6 Physical View
| Component | Deployment | Source |
|-----------|-----------|--------|
| Static assets | CF Pages (edge CDN) | `architecture.md:330-352` |
| API proxy | CF Worker | `architecture.md:330-352` |
| KV storage | CF KV | `architecture.md:330-352` |
| WASM widgets | CF Pages (public/wasm/) | `architecture.md:330-352` |

---

## 3. WCAG 2.1 — Web Content Accessibility Guidelines

### 3.1 Perceivable (Principle 1)
| Guideline | Requirement | Implementation | Source |
|-----------|-------------|----------------|--------|
| 1.1.1 Non-text Content | Alt text for images | Profile photo, hero images, OG images | `requirements.md:228-232` |
| 1.3.1 Info and Relationships | Semantic HTML | Proper headings, landmarks, ARIA | `requirements.md:143` |
| 1.3.2 Meaningful Sequence | Logical reading order | CSS layout preserves DOM order | Responsive design |
| 1.4.1 Use of Color | Color not sole indicator | Accent colors + text labels | 6 themes with sufficient contrast |
| 1.4.3 Contrast Minimum | 4.5:1 text ratio | `--text-primary: #ffffff` on `--bg-primary: #050505` | `design.md:63-73` |
| 1.4.11 Non-text Contrast | 3:1 UI component ratio | Borders, focus indicators | `design.md:71` |

### 3.2 Operable (Principle 2)
| Guideline | Requirement | Implementation | Source |
|-----------|-------------|----------------|--------|
| 2.1.1 Keyboard | All functionality via keyboard | Skip-to-content, focus management | `requirements.md:147` |
| 2.1.2 No Keyboard Trap | Escape from modals | Command palette, WASM widgets | `design.md:536-539` |
| 2.4.1 Bypass Blocks | Skip-to-content link | First element in DOM | `requirements.md:151` |
| 2.4.3 Focus Order | Logical tab order | DOM order matches visual order | Component design |
| 2.4.7 Focus Visible | Visible focus indicators | CSS `:focus-visible` styles | `design.md` |

### 3.3 Understandable (Principle 3)
| Guideline | Requirement | Implementation | Source |
|-----------|-------------|----------------|--------|
| 3.1.1 Language of Page | `lang` attribute | `<html lang="en">` | `architecture.md:210` |
| 3.2.3 Consistent Navigation | Same nav on all pages | `Nav.astro` component | `architecture.md:233` |
| 3.3.2 Labels or Instructions | Form labels | Contact form, guestbook form | `requirements.md:32` |

### 3.4 Robust (Principle 4)
| Guideline | Requirement | Implementation | Source |
|-----------|-------------|----------------|--------|
| 4.1.1 Parsing | Valid HTML | Astro SSG generates valid HTML | Build output |
| 4.1.2 Name, Role, Value | ARIA on interactive elements | Kobalte components | `decisions.md:618-646` |

---

## 4. NIST SP 800-53 — Security and Privacy Controls

### 4.1 Access Control (AC)
| Control | Implementation | Source |
|---------|---------------|--------|
| AC-2: Account Management | Bearer token for admin operations | `requirements.md:100` |
| AC-3: Access Enforcement | Rate limiting (5 posts/IP/10min) | `requirements.md:165` |
| AC-6: Least Privilege | API keys in CF Worker secrets only | `architecture.md:357-362` |

### 4.2 Audit and Accountability (AU)
| Control | Implementation | Source |
|---------|---------------|--------|
| AU-2: Audit Events | RUM via CF Worker, API error logging | `architecture.md:399-414` |
| AU-3: Content of Audit Records | Core Web Vitals logged to `/api/vitals` | `architecture.md:401-403` |

### 4.3 System and Communications Protection (SC)
| Control | Implementation | Source |
|---------|---------------|--------|
| SC-7: Boundary Protection | CSP headers, X-Frame-Options: DENY | `architecture.md:367-378` |
| SC-8: Transmission Confidentiality | HSTS with preload | `architecture.md:370` |
| SC-13: Cryptographic Protection | HTTPS enforced, no plaintext secrets | `architecture.md:370` |

---

## 5. OWASP Top 10 — Web Application Security

### A01:2021 — Broken Access Control
| Risk | Mitigation | Source |
|------|------------|--------|
| Unauthorized guestbook posts | Rate limiting (5 posts/IP/10min) | `requirements.md:165` |
| Unauthorized admin actions | Bearer token required | `requirements.md:100` |
| CORS bypass | Same-origin only | `architecture.md:383` |

### A02:2021 — Cryptographic Failures
| Risk | Mitigation | Source |
|------|------------|--------|
| Data in transit | HSTS, HTTPS only | `architecture.md:370` |
| Session fixation | No session cookies (stateless) | Architecture design |

### A03:2021 — Injection
| Risk | Mitigation | Source |
|------|------------|--------|
| Guestbook XSS | Input validation, sanitization | `architecture.md:385` |
| API injection | Valibot schema validation | `decisions.md:649-683` |

### A04:2021 — Insecure Design
| Risk | Mitigation | Source |
|------|------------|--------|
| API key exposure | Keys in CF Worker secrets only | `architecture.md:357-362` |
| WASM integrity | Same-origin loading, no external WASM | `architecture.md:389-393` |

### A05:2021 — Security Misconfiguration
| Risk | Mitigation | Source |
|------|------------|--------|
| Missing security headers | CF Worker sets all headers | `architecture.md:367-378` |
| Unnecessary features | Permissions-Policy disables camera/mic/geo | `architecture.md:376` |

### A07:2021 — Cross-Site Scripting (XSS)
| Risk | Mitigation | Source |
|------|------------|--------|
| Stored XSS (guestbook) | CSP script-src, sanitize output | `architecture.md:377` |
| DOM XSS | No eval(), no Function() | `architecture.md:392` |

---

## 6. Performance Standards

### 6.1 Core Web Vitals (Google)
| Metric | Target | Measurement | Source |
|--------|--------|-------------|--------|
| LCP | <1.5s | Lighthouse, CrUX | `requirements.md:126` |
| FID/INP | <50ms | Lighthouse, RUM | `requirements.md:127` |
| CLS | <0.01 | Lighthouse, RUM | `requirements.md:128` |

### 6.2 Custom Performance Targets
| Metric | Target | Source |
|--------|--------|--------|
| TTI | <1.5s | `requirements.md:129` |
| Initial bundle | <50KB | `requirements.md:130` |
| WASM per widget | <100KB | `requirements.md:131` |
| CSS total | <80KB | `requirements.md:132` |
| Chart library | <50KB | `requirements.md:133` |
| Total first load | <400KB | `requirements.md:134` |

---

## 7. Code Quality Standards

### 7.1 TypeScript
| Standard | Implementation | Source |
|----------|---------------|--------|
| Strict mode | `tsconfig.json` with strict checks | `requirements.md:168` |
| No `any` types | Biome linting rules | ADR-016 |
| Consistent naming | Biome formatting | ADR-016 |

### 7.2 Testing
| Standard | Implementation | Source |
|----------|---------------|--------|
| Unit test coverage | Vitest with v8 coverage | ADR-011 |
| E2E test coverage | Playwright cross-browser | ADR-011 |
| A11y test coverage | axe-core automated checks | ADR-011 |
| Performance regression | Lighthouse CI on every PR | ADR-011 |

### 7.3 Documentation
| Standard | Implementation | Source |
|----------|---------------|--------|
| ADRs | 24 decision records in `decisions.md` | ADR-001 through ADR-024 |
| Requirements | `requirements.md` with functional/non-functional | Source document |
| Architecture | `architecture.md` with diagrams and tables | Source document |
| Design | `design.md` with philosophy and tokens | Source document |

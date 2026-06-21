# Frontend Refactor: Analysis & Migration Roadmap

**Date:** 2026-06-19
**Status:** Draft

---

## 1. Current Stack Summary

| Layer | Current | Version |
|---|---|---|
| **Meta-Framework** | Astro | v5 |
| **UI Framework** | SolidJS (islands) | v1.9 |
| **Package Manager** | Bun | v1.3.11 |
| **Monorepo** | Turborepo | v2 |
| **Build** | Vite (via Astro) | - |
| **Styling** | Tailwind CSS v4 + custom CSS | v4 |
| **Linting/Formatting** | Biome | v1 |
| **Unit Tests** | Vitest + fast-check | v4.1.9 |
| **E2E Tests** | Playwright | v1.40 |
| **Validation** | Zod (Astro built-in) + Valibot | v1 |
| **State Management** | SolidJS signals (no library) | - |
| **Deployment** | Cloudflare Pages | - |
| **Analytics** | Plausible | - |

---

## 2. What's Already Modern (Keep)

The current stack is **remarkably well-chosen for 2026**. Several choices are already best-in-class:

| Component | Verdict | Reason |
|---|---|---|
| **Astro v5** | KEEP | Island architecture, zero-JS-by-default, content collections, Cloudflare adapter. Still the best SSG/SSR meta-framework for content-heavy sites. |
| **SolidJS v1.9** | KEEP | Fine-grained reactivity, no VDOM, excellent performance. The `@astrojs/solid-js` integration is mature. No reason to migrate to React/Vue/Svelte. |
| **Tailwind CSS v4** | KEEP | Rust-powered engine, CSS-first config, Vite plugin. Already on the latest major. |
| **Biome v1** | KEEP | Rust-powered, replaces ESLint + Prettier. Already the modern standard. |
| **Vitest** | KEEP | Vite-native, fast, compatible with Jest APIs. Already best-in-class. |
| **Playwright** | KEEP | Industry standard for E2E. Cross-browser, reliable. |
| **Turborepo v2** | KEEP | Incremental builds, remote caching. Best monorepo tool for this setup. |
| **Valibot** | KEEP | Ultra-lightweight, tree-shakeable schema validation. Already lighter than Zod. |
| **Cloudflare Pages** | KEEP | Edge deployment, Workers integration, excellent DX. |

---

## 3. What Could Be Improved

After thorough analysis, the gaps are **narrow and specific**:

### 3.1 Astro v5 → v6

**Why:** Astro 6 brings the Content Layer API improvements, native `<ViewTransitions />` refinements, and performance improvements. The current `@astrojs/image` is already gone (using `astro:assets`), but v6 solidifies the Content Layer as the only content approach.

**Risk:** Low. v5→v6 is incremental.

**Priority:** Medium. Current v5 works fine, but v6 is the path forward.

### 3.2 Content Collections → Content Layer API

**Why:** Astro 5 introduced the Content Layer API, and v6 makes it the standard. The current `content/config.ts` with `defineCollection` and glob loaders still works, but the new loaders (fetch, custom) are more powerful for dynamic content.

**Risk:** Low. Migration is mostly about updating collection definitions.

**Priority:** Medium. Current approach works but is legacy.

### 3.3 Add `@astrojs/sitemap` + `@astrojs/rss`

**Why:** The site has a blog/projects section and docs. A sitemap is essential for SEO. RSS is standard for content sites. Neither is currently configured.

**Risk:** Near zero. Drop-in integrations.

**Priority:** High. These are table-stakes for a portfolio site.

### 3.4 Add `astro-seo` or `@jdevalk/astro-seo-graph`

**Why:** The site already has manual JSON-LD and meta tags, but `astro-seo` standardizes this with Open Graph, Twitter Cards, and canonical URLs in a single component. The current implementation is scattered across pages.

**Risk:** Low. Replaces manual `<meta>` tags.

**Priority:** Medium. Current approach works but is fragile.

### 3.5 Add `solid-sonner` for Toast Notifications

**Why:** The guestbook and contact form have no user feedback mechanism for success/error. `solid-sonner` is the modern standard for toast notifications in SolidJS.

**Risk:** Low. Single component addition.

**Priority:** Medium. Improves UX.

### 3.6 Add `@solid-primitives/i18n` for i18n

**Why:** The site already has a custom `i18n.ts` with EN/ZH/JA support and a `LanguageSwitcher.tsx`. But the current implementation is hand-rolled. `@solid-primitives/i18n` is the community standard and handles pluralization, interpolation, and missing translations properly.

**Risk:** Medium. Requires rewriting the i18n system but the current one is basic.

**Priority:** Medium. Current system works but is fragile.

### 3.7 Add `@formkit/auto-animate` for List Animations

**Why:** The guestbook list and projects list could benefit from smooth add/remove animations. AutoAnimate is zero-config and works with SolidJS.

**Risk:** Near zero.

**Priority:** Low. Nice-to-have.

### 3.8 Consider `corvu` for Accessible UI Primitives

**Why:** The site has a custom `CommandPalette.tsx` and `ThemeToggle.tsx`. `corvu` provides accessible, headless UI primitives (dialog, popover, tooltip, etc.) that could replace hand-rolled components. Kobalte is the other option but `corvu` is more actively maintained in 2026.

**Risk:** Medium. Only adopt if building new interactive components.

**Priority:** Low. Current components work.

### 3.9 Upgrade Playwright to Latest

**Why:** Current v1.40 is outdated. Latest Playwright has better Chromium support, faster execution, and new APIs.

**Risk:** Low.

**Priority:** High. Easy win.

### 3.10 Add `astro-compress` for Build Optimization

**Why:** The site is static. Compressing HTML/CSS/JS/SVG at build time reduces bundle size with zero runtime cost.

**Risk:** Near zero.

**Priority:** Medium. Easy win for performance.

---

## 4. What NOT to Migrate

| Proposed Migration | Verdict | Reason |
|---|---|---|
| **Astro → Next.js/Nuxt/SvelteKit** | NO | Astro's island architecture is perfect for this use case. React/Vue/Svelte add VDOM overhead for no benefit. |
| **SolidJS → React/Vue/Svelte** | NO | SolidJS is the best-performing UI framework. No VDOM overhead. Fine-grained reactivity is ideal for the interactive widgets. |
| **Bun → pnpm/npm** | NO | Bun is faster, has native workspace support, and is already configured. |
| **Tailwind CSS v4 → Panda CSS/Vanilla Extract** | NO | Tailwind v4 is already the latest. Utility-first is perfect for this design system. |
| **Biome → ESLint + Prettier** | NO | Biome is the modern replacement. Going back to ESLint would be a regression. |
| **Vitest → Jest** | NO | Vitest is Vite-native and faster. Jest would be a step backward. |
| **Valibot → Zod** | NO | Valibot is lighter and tree-shakeable. Zod is heavier for no benefit. |
| **Turborepo → Nx/Lerna** | NO | Turborepo v2 is mature and working well. |
| **SolidJS signals → Zustand/Jotai/Valtio** | NO | No need for external state management. Component-local signals + module-level signals are sufficient for this site's complexity. |
| **Cloudflare → Vercel/Netlify** | NO | Cloudflare is already the best edge platform. |
| **Leaflet → Mapbox/MapLibre** | NO | Leaflet is lightweight and works well for the world map. No need for WebGL unless 3D is required. |

---

## 5. Recommended Migrations (Ranked by Priority)

### Tier 1: Do Now (High Impact, Low Effort)

| # | Migration | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | Add `@astrojs/sitemap` | SEO critical | 30 min | Near zero |
| 2 | Add `@astrojs/rss` | Content syndication | 30 min | Near zero |
| 3 | Upgrade Playwright to latest | DX + reliability | 15 min | Low |
| 4 | Add `astro-compress` | Performance | 15 min | Near zero |

### Tier 2: Do Soon (Medium Impact, Low-Medium Effort)

| # | Migration | Impact | Effort | Risk |
|---|---|---|---|---|
| 5 | Upgrade Astro v5 → v6 | Future-proofing | 2-4 hrs | Low |
| 6 | Add `astro-seo` | SEO standardization | 1-2 hrs | Low |
| 7 | Add `solid-sonner` | UX feedback | 1 hr | Low |
| 8 | Migrate i18n → `@solid-primitives/i18n` | i18n robustness | 2-3 hrs | Medium |

### Tier 3: Do When Needed (Low-Medium Impact, Variable Effort)

| # | Migration | Impact | Effort | Risk |
|---|---|---|---|---|
| 9 | Add `@formkit/auto-animate` | Polish | 30 min | Near zero |
| 10 | Adopt `corvu` for new components | Accessibility | Variable | Medium |
| 11 | Migrate Content Collections → Content Layer API | Future-proofing | 2-4 hrs | Low |

---

## 6. Full Migration Roadmap

### Phase 1: Quick Wins (Week 1)

**Goal:** SEO and performance improvements with zero risk.

```
Step 1.1: Add @astrojs/sitemap
  - Install: bun add @astrojs/sitemap
  - Add to astro.config.mjs integrations array
  - Configure with site URL
  - Verify sitemap.xml generates at build time
  - Update Playwright tests to verify sitemap exists

Step 1.2: Add @astrojs/rss
  - Install: bun add @astrojs/rss
  - Create src/pages/rss.xml.ts with RSS feed generation
  - Include projects and docs collections
  - Verify feed validates

Step 1.3: Upgrade Playwright
  - Update @playwright/test to latest
  - Run full E2E suite to verify no regressions
  - Update CI config if needed

Step 1.4: Add astro-compress
  - Install: bun add -D astro-compress
  - Add to astro.config.mjs integrations array
  - Verify build output is smaller
  - Check no broken assets
```

### Phase 2: SEO Standardization (Week 2)

**Goal:** Centralize SEO meta tags, standardize Open Graph.

```
Step 2.1: Install astro-seo
  - Install: bun add astro-seo
  - Replace manual <meta> tags in BaseLayout.astro
  - Create SEO component wrapper with defaults
  - Update each page to use <SEO /> component
  - Remove scattered meta tag logic

Step 2.2: Standardize JSON-LD
  - Move JSON-LD schemas to a shared component
  - Ensure consistent Person, WebSite, WebPage schemas
  - Verify with Google Rich Results Test
```

### Phase 3: Astro v6 Upgrade (Week 3)

**Goal:** Upgrade to latest Astro with Content Layer API.

```
Step 3.1: Upgrade Astro core
  - Update astro to ^6.0.0
  - Update @astrojs/cloudflare to latest
  - Update @astrojs/solid-js to latest
  - Run build and fix any breaking changes

Step 3.2: Migrate Content Collections → Content Layer
  - Update content/config.ts to use new loader API
  - Replace glob loaders with new Content Layer loaders
  - Verify all content queries still work
  - Update pages that use getCollection()

Step 3.3: Verify View Transitions
  - Test native <ViewTransitions /> if using page transitions
  - Remove any custom transition hacks (already done per legacy list)
```

### Phase 4: UX Polish (Week 4)

**Goal:** Improve user feedback and i18n robustness.

```
Step 4.1: Add solid-sonner for toast notifications
  - Install: bun add solid-sonner
  - Add <Toaster /> to BaseLayout.astro
  - Add success/error toasts to ContactForm.tsx
  - Add success/error toasts to GuestbookForm.tsx
  - Add success/error toasts to GuestbookList.tsx

Step 4.2: Migrate i18n to @solid-primitives/i18n
  - Install: bun add @solid-primitives/i18n
  - Rewrite lib/i18n.ts using createI18n()
  - Add proper pluralization support
  - Add interpolation support
  - Update LanguageSwitcher.tsx
  - Verify EN/ZH/JA all work

Step 4.3: Add auto-animate for list transitions
  - Install: bun add @formkit/auto-animate
  - Add to GuestbookList.tsx for entry animations
  - Add to projects.astro for filter transitions
  - Verify reduced-motion support
```

### Phase 5: Component Library Assessment (Week 5+)

**Goal:** Evaluate and adopt headless UI primitives for new components.

```
Step 5.1: Evaluate corvu vs Kobalte
  - Review API surfaces
  - Test Dialog, Popover, Tooltip components
  - Evaluate accessibility compliance
  - Decision: adopt one for new components only

Step 5.2: Adopt for new interactive components
  - Use chosen library for any new dialogs/popovers
  - Do NOT refactor existing components (unless broken)
  - Document pattern in project conventions
```

---

## 7. Dependency Version Targets

After all migrations, the target dependency state:

```json
{
  "dependencies": {
    "@astrojs/cloudflare": "^13.0.0",
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.3.0",
    "@astrojs/solid-js": "^6.0.0",
    "astro": "^6.0.0",
    "astro-compress": "^2.0.0",
    "astro-seo": "^0.8.0",
    "leaflet": "^1.9.4",
    "solid-js": "^2.0.0",
    "solid-sonner": "^0.5.0",
    "@solid-primitives/i18n": "^2.0.0",
    "@formkit/auto-animate": "^0.8.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@tailwindcss/vite": "^4.0.0",
    "@types/leaflet": "^1.9.21",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "valibot": "^1.0.0",
    "vitest": "^4.1.9"
  }
}
```

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Astro v6 breaking changes | Medium | Medium | Read migration guide first, upgrade in isolation |
| i18n rewrite breaks translations | Low | High | Keep old i18n.ts as backup, test all 3 languages |
| solid-sonner SSR issues | Low | Low | Test with Cloudflare adapter, fallback to client-only |
| astro-seo conflicts with existing meta | Low | Low | Remove manual meta tags first, then add component |
| Content Layer API changes | Medium | Medium | Astro provides migration codemods |
| Playwright version incompatibility | Low | Low | Run tests immediately after upgrade |

---

## 9. Out of Scope (Future Consideration)

These are NOT part of this refactor but could be future work:

- **SolidStart migration** (if moving away from Astro islands to full-stack Solid)
- **tRPC integration** (if adding a proper API layer beyond Cloudflare Workers)
- **TanStack Query** (if data fetching becomes complex enough to need caching)
- **XState** (if workflow state becomes complex)
- **Panda CSS** (if moving to CSS-in-JS for type safety)
- **Storybook** (if component library grows significantly)

---

## 10. Decision Log

| Decision | Rationale | ADR |
|---|---|---|
| Keep Astro (not Next.js/Nuxt) | Island architecture matches zero-JS-by-default philosophy | ADR-001 |
| Keep SolidJS (not React) | Performance, fine-grained reactivity, no VDOM overhead | ADR-002 |
| Keep Bun (not pnpm) | Speed, native workspaces, already configured | ADR-003 |
| Keep Biome (not ESLint) | Rust-powered, single tool for lint+format | ADR-004 |
| Keep Valibot (not Zod) | Lighter bundle, tree-shakeable, sufficient for needs | ADR-005 |
| Keep Tailwind v4 (not Panda) | Already on latest, utility-first matches design system | ADR-006 |
| Add sitemap + RSS first | Highest impact, lowest risk, table-stakes for portfolio | ADR-007 |
| Astro v6 upgrade in Phase 3 | Need to verify compatibility with SolidJS + Cloudflare first | ADR-008 |
| Adopt corvu only for new components | Don't refactor working code, adopt incrementally | ADR-009 |

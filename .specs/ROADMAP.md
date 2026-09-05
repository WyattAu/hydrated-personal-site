# Hydrated Personal Site — Roadmap & Quality Audit

Last updated: 2026-09-05. Supersedes the pre-plychart roadmap entirely.

## Executive Summary

Personal quant dashboard at wyattau.com (Astro 5 + SolidJS + Rust/WASM), with
QuestHive as a sibling consumer of the same charting stack.

**Current architecture:**
- **plychart** (github.com/WyattAu/plychart) — Canvas2D charting in Rust/WASM.
  17 chart types, 26 WASM exports, 269 tests. wasm-bindgen unpinned (0.2.127
  works post `mod wasm` fix). Export-count guard in build script. npm packaging
  templates staged (`@wyattau/plychart`), not published.
- **plycompute** — canonical quant computation crate (29 modules) living in the
  plychart repo. Export bodies in macro-free `json.rs`; downstream cdylibs
  (hydrated-widgets) wrap them without wasm-bindgen symbol collisions.
- **hydrated_personal_site** — 47/54 components render via plychart WASM
  (auto-resize + hover tooltips via `plychart-render.ts`). 5 charts custom
  Canvas by design: CorrelationNetwork (physics), OptionsPayoff (P&L shading),
  EtfConcentrationGauge (bespoke gauge), SolarWindPanel (multi-panel),
  FourierDemo (rAF-driven).
- **Cache busting is automated**: `scripts/sync-plychart.sh` hashes the binary
  into `plychart-version.ts`; widgets use `WASM_VERSION` (v1.1.0).

**Recent milestones:**
- Walk-forward backtester live on /world (SMA-cross, momentum, mean-reversion;
  slippage + commission; SPY benchmark; per-window params table; no look-ahead)
- Fixed the widgets WASM build (broken since the plycompute dependency landed)
- Root-caused chart "overlap on date change": accumulating `ctx.scale` DPR
  transform — now `set_transform` + retina backing store
- CARTO basemap API key (raster tiles now require keys)

---

## Roadmap

### Immediate (this cycle)

| Priority | Task | Impact | Status |
|----------|------|--------|--------|
| **HIGH** | User click-through of all migrated charts; fix what looks wrong | UX regression sweep | Pending (user) |
| **HIGH** | Refresh plychart `examples/demo` to 17 types + tooltip exports | Demo parity | Pending |
| **MEDIUM** | Repair broken global `npm` — DIAGNOSED: `/usr/lib/node_modules/npm` incomplete (missing `nopt` et al, partial system upgrade); fix needs sudo or install npm per-project via `bun add npm` (verified working, v12.0.2). Builds run via bun regardless | Dev env | Diagnosed |
| **LOW** | `npm publish @wyattau/plychart` (needs npm token; packaging ready) | Ecosystem | Blocked (token) |

### Next features (ranked)

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| **HIGH** | Backtester v3: position sizing, multi-asset portfolios, CSV export | Research platform | 2–3 d |
| **HIGH** | Blog/build-log (3–5 posts: plychart story, SIMD kernels, walk-forward engine). NOTE: wyattsnotes already covers domain authority — blog is for *developer audience*, not DA | Credibility | 1–2 d |
| **MEDIUM** | WebSocket live prices (Cloudflare Durable Objects) | Live terminal | 4–5 d |
| **MEDIUM** | SVI volatility surface from Deribit (plycompute + `update_heatmap_div`) | Vol credibility | 2 d |
| **MEDIUM** | L2 order book depth (depends on WebSocket) | HFT microstructure | 2 d |
| **LOW** | Google Search Console + scheduled crawlkit re-crawl (Cron Trigger) | SEO plumbing | 2 h |

### Deferred / decided-against

- Blog as generic DA play — wyattsnotes sits on the same apex domain and
  already contributes domain-level authority; a duplicate surface adds little
- Git-dependency wiring for plychart consumers — path deps + CI clone step
  work; revisit if a third consumer appears
- `npm` dependency for plychart until Fork decided (see above)

---

## Known technical debt

| # | Debt | Impact | Priority |
|---|------|--------|----------|
| 1 | plychart `examples/demo` shows 13/17 chart types | Demo staleness | LOW |
| 2 | plychart README docs lag (16 types listed vs 17; no tooltip docs) | DX | LOW |
| 3 | `ChartTheme` parse in `wasm.rs` matches presets by string, not arbitrary colors | Theme flexibility | LOW |
| 4 | Forgejo runner on same host as dev box — starves under parallel builds | CI reliability | MEDIUM |
| 5 | `index_to_x` in multiline assumes uniform spacing (index-based, not time-based) | Chart accuracy | LOW |
| 6 | Remaining ~22 `any` types in WASM module references across components | Type safety | LOW |

## WASM versions

- `plychart_bg.wasm` — auto-hashed (`?v=p<sha8>` via `plychart-version.ts`)
- `hydrated_widgets_bg.wasm` — `WASM_VERSION = 'v1.1.0'` (bump on rebuild)
- `seo_wasm_bg.wasm` — unversioned (low churn)

## Deployment

| Platform | Status | Purpose |
|----------|--------|---------|
| Cloudflare Pages (`ssr-temp`) | Live | Production at wyattau.com |
| Forgejo CI | Active | Primary dev pipeline |
| GitHub Actions | Active | Mirror + plychart CI |

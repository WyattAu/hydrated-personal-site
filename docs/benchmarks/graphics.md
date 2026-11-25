# Benchmark v2: Graphics programming

Archetypes: Epic (Unreal), id Software (engine architecture culture),
Unity (tooling at scale), NVIDIA tooling teams, animation/render
pipelines. Sources: data-oriented design talks (Mike Acton), frame-time
discipline GDC talks, sanitizer practice, golden-image regression
culture, crash-telemetry triage.

**v2 delta from v1:** the **performance budget discipline landed** —
LCP < 1.8 s and page weight < 1.2 MB now fail CI (the graphics
frame-budget practice translated to web), plus a **650 KB WASM binary
ceiling** (binary size budget). Two graphics-specific steals remain
open: NaN policy for the compute kernels, and golden-image regression.
Telemetry for real users remains absent.

## 1. Architecture

**Them.** Data-oriented design as doctrine: ECS over object graphs,
cache-line-aware layouts, allocation-free frame loops, strict engine/
content separation (games are content; they must not breach engine
invariants).

**Us.** The engine/content separation is genuinely practised:
`packages/widgets` (the engine: Rust→WASM quant compute, 7.1k lines,
plycompute kernels) is strictly separated from `apps/site` (the
content: pages, copy, data). The WASM boundary is typed-array-first
(serde over wasm-bindgen) — data-oriented at the interface.

The **frame budget** analog now exists at the page level: the home spec
asserts LCP < 1.8 s and total transfer < 1.2 MB. The animated widgets
(aurora, volatility, radar) remain event-driven re-renders without a
rAF budget — a real but bounded gap (no animation loop runs on idle
pages; the budget assertion covers first paint, which is the
user-perceived metric that matters here).

**Verdict: 3 → 3.5.**

## 2. Code quality

**Them.** Sanitizers (ASan/UBSan) in CI builds; determinism as a feature
(replay systems depend on input determinism); zero-tolerance format
gates; crash telemetry feeding triage.

**Us (v2).**
- Zero-tolerance format gate: biome (and the vendored fx/ directory is
  excluded so upstream formatting survives — the drift report covers it).
- **NaN/Infinity policy: still open** — the quant kernels can silently
  produce NaN for degenerate input and render it as a chart. A property
  test (valid input → finite output) over the plycompute exports would
  adopt the graphics sanitizer discipline where the risk actually is.
- **Determinism: still open** — plycompute's seeded PRNG exists; no test
  asserts identical output across builds.
- Crash telemetry: E2E console-error assertions catch errors at test
  time; no field telemetry (shared with v1; see B3 residual).

**Verdict: 3 → 3.5.** The size ceiling (B1) is the increment — binary
size is a graphics-budget concept.

## 3. Stack

| Layer | Graphics | Ours |
|---|---|---|
| Compute | C++/Rust + GPU | Rust→WASM (SIMD-capable) |
| Rendering | Vulkan/Metal/WebGPU | Canvas 2D |
| Profiling | Nsight, RenderDoc, frame captures | **None** (the honest gap) |
| Asset pipeline | Bake/compress/LOD | AVIF/WebP sources, PIL OG generator, subset fonts (cf-fonts) |
| Budgets | Frame time in CI | LCP/weight/WASM ceilings in CI (v2) |

The asset-pipeline row remains our genuine overlap: image format
selection, generated OG cards from a single script, subset fonts — a
content pipeline with the same shape as graphics asset baking.

## 4. Research

**Them.** Rendering research (SIGGRAPH), performance research (cache
behavior, SIMD utilization), player telemetry research.

**Us.** No rendering research (Canvas 2D needs none at this scale). The
site's research budget goes to data research (the studies) — correctly
allocated for a content product.

**Verdict: 2/5 — unchanged, and correctly low.**

## 5. Development workflow

**Them.** Profiler-first (measure, then optimize); golden-image visual
regression; nightly sanitizer builds; ownership per engine subsystem.

**Us (v2).**
- **Golden-image regression: now partially practiced.** The four-width
  screenshot pass (1440/1024/768/390) is done per-round by hand; CI
  pixel-diff baselines are the automation step still missing.
- Perf-first: the budget assertions (B1) inverted the workflow —
  regressions now fail rather than being noticed.
- Ownership: the drift report + dogfood ledger function as per-file
  ownership records for the vendored layer.

**Verdict: 3 → 3.5.**

## 6. Operations

**Them.** Crash telemetry from the field (symbolicated, triaged), live-
ops dashboards, frame-time distributions from real sessions.

**Us (v2).**
- Server-side: `/api/metrics` (per-endpoint p95, feed freshness, alerts)
  — the operations surface grew in B3.
- Client-side: still absent. A first-party error beacon
  (`window.onerror` → worker endpoint → structured log) would be the
  crash-telemetry analog without third-party scripts, preserving the
  privacy posture.

**Verdict: 2 → 2.5.** (Server-side improved; client-side unchanged.)

## 7. Deployment

**Them.** Builds + platform certification; live-ops content patches with
telemetry-gated rollouts.

**Us.** Continuous atomic edge deploys gated by the full ladder — the
certification step is the gate set (unit, E2E, budgets, lineage, drift,
SBOM).

**Verdict: 3/5 — unchanged.**

## What to steal next from graphics (updated)

1. **NaN/Infinity policy test** — property test over plycompute exports:
   valid input → finite output. The graphics sanitizer discipline aimed
   at the silent-wrong-number risk.
2. **Golden-image CI baselines** — promote the manual four-width pass to
   CI screenshot diffs with perceptual thresholds.
3. **WASM profiling session** — one profiling pass over the heaviest
   widget (backtest drawdown rendering) to establish whether
   `simd_utils` (plycompute) is worth adopting.
4. **Client error beacon** — first-party, privacy-preserving crash
   telemetry.
5. **WASM ceiling tightening** — the 650 KB budget is generous; profile
   and tighten to the real requirement.

## Scorecard summary (v2)

| Dimension | Graphics | Us | Δ |
|---|---|---|---|
| Architecture (engine/content) | 5 | 3.5 | **+0.5** |
| Code quality (sanitizers, determinism) | 4 | 3.5 | **+0.5** |
| Asset pipeline | 4 | 4 | — |
| Profiling culture | 5 | 1 | — |
| Visual regression | 4 | 2.5 | **+0.5** |
| Telemetry | 4 | 2.5 | **+0.5** |
| Deployment | 4 | 3 | — |

# Benchmark: Graphics programming

Archetypes: Epic (Unreal), id Software (engine architecture culture),
Unity (tooling + scale), NVIDIA tooling teams, animation/render pipelines
(Pixar-style farm rendering). Public sources: id Software's open-sourced
engines, GDC talks on frame-time discipline and profiling culture, Mike
Acton's data-oriented design talks, NVIDIA Nsight/RenderDoc tooling
ecosystem.

## 1. Architecture

**Them.** Data-oriented design as doctrine: memory layouts chosen for
cache lines, ECS (entity-component-system) structures over object
graphs, allocation-free frame loops, and strict frame budgets (16.6ms at
60Hz, or 8.3ms at 120Hz) that every subsystem must respect. The engine is
a platform; games are content that must not touch the engine's invariants.

**Us.** The quant widgets are the graphics layer: Rust→WASM computing
into Canvas 2D, driven by plycompute kernels. The data-oriented design
influence is visible in the WASM layer's structure (typed arrays over the
boundary via serde, compute kernels separated from rendering glue), but
there is no ECS, no allocation discipline, and no frame budget.

| Graphics principle | Our analog | Gap |
|---|---|---|
| Frame budget enforced | None — canvas redraws are event-driven, no rAF loop discipline in the quant widgets | The aurora/volatility widgets re-render on data, not on a budget |
| Data-oriented layout | serde → typed arrays over the WASM boundary | Real; the boundary is already typed-array-first |
| Engine/content separation | widgets (engine) / pages (content) | Real — pages never touch the canvas directly |
| Tooling (profiler-first culture) | No WASM profiling, no frame-time measurement | The whole gap |

**Match (3/5).** The separation and the typed boundary are the right
architecture; the budget and tooling culture are absent.

## 2. Code quality

**Them.** Id's culture: readable C as the standard, engine code reviewed
by everyone, determinism treated as a feature (replays depend on it).
Modern studios: clang-format with zero-tolerance, sanitizers (ASan/UBSan)
in CI builds, and crash telemetry from the field feeding triage.

**Us.** Biome for TS (zero-tolerance format gate), `cargo check` for Rust,
no sanitizers in the wasm build (wasm-pack builds skip ASan — correctness
relies on `cargo check` + the 231 vitest tests + E2E), and no crash
telemetry (console-error assertions in E2E are the only "crash report").

**Match (3/5).** The sanitizers gap is real for the WASM compute: the
quant kernels do array math where an off-by-one is a silent wrong number
rendered as a chart. `cargo check` catches type errors, not logic slips.

## 3. Stack

| Layer | Graphics | Ours |
|---|---|---|
| Compute | C++/Rust + GPU (shaders, compute) | Rust→WASM (SIMD-capable) + Canvas 2D |
| Rendering API | Vulkan/Metal/DirectX/WebGPU | CanvasRenderingContext2D |
| Profiling | Nsight, RenderDoc, frame captures | None |
| Asset pipeline | Baking, compression, LOD | OG card generation (PIL), font subsetting (cf-fonts), image formats (AVIF/WebP) |
| Determinism | Replay systems (input determinism) | Seeded PRNG in plycompute (`rng.rs`), untested determinism |

The **asset pipeline** row is underrated: the site already has a real
asset pipeline (AVIF/WebP source images, generated OG cards, subset
fonts) — that is graphics-pipeline thinking applied to web assets, and it
is genuinely practiced (4/5 for that row).

## 4. Research

**Them.** Rendering research (new techniques, SIGGRAPH publications),
performance research (cache behavior, SIMD), and — in studios — player
telemetry research.

**Us.** The quant kernels' correctness research lives in plycompute
(upstream); the site's research is content research (the studies). No
rendering research exists, and none is needed for Canvas 2D at this
scale — WebGPU would be research for its own sake here.

**Match (2/5).**

## 5. Development workflow

**Them.** Profiler-first development (measure, then optimize), automated
visual regression (golden-image captures), nightly builds with sanitizers,
and the "don't touch the hot path without data" ownership culture.

**Us.** The visual-regression analog exists partially: the E2E suite
asserts structure, not pixels. Golden-image captures (screenshot diffs in
CI) are absent — and are the graphics practice most directly applicable:
the design rework would have been caught/validated by a pixel-diff gate.

**Match (3/5).**

## 6. Operations

**Them.** Crash telemetry (symbolicated stack traces from the field),
live-ops dashboards, player-experience monitoring (frame-time
distributions from real sessions).

**Us.** E2E console assertions (errors are caught at test time, not from
real users), no real-user telemetry. Plausible is installed (privacy-
first analytics) but it measures visits, not errors. A client error-
beacon (window.onerror → a worker endpoint) would be the crash-telemetry
analog — with the privacy posture preserved (first-party, no third-party
script).

**Match (2/5).**

## 7. Deployment

**Them.** Studio deploys are builds + platform certification; live-ops
ships content patches continuously with telemetry-gated rollouts.

**Us.** Continuous atomic edge deploys (shared with live-ops' continuous
patch model), no telemetry-gated anything.

**Match (3/5).**

## What to steal from graphics (concrete)

1. **Golden-image visual regression** — capture screenshots of key pages
   at fixed viewports in CI; diff against baselines with a perceptual
   threshold; fail on unexpected pixel drift. The design rework would
   have been validated mechanically instead of by hand. One workflow step
   + a baseline directory.
2. **Frame-time budget for animated widgets** — the aurora/volatility/
   radar widgets animate; a rAF-loop measurement (dev-only overlay or a
   CI assertion with CDP tracing) enforcing < 16ms per frame. The
   graphics frame-budget discipline applied to the only real animation
   surface.
3. **Sanitizer builds for the WASM crate** — a nightly `cargo check` with
   debug assertions + a property test asserting quant kernels do not
   produce NaN/Infinity for valid inputs (the "silent wrong number"
   risk). Graphics sanitizes; the chart-rendering analog is NaN policy.
4. **Client error-beacon** — first-party `window.onerror` → worker
   endpoint → structured log. Crash telemetry without third-party scripts.
5. **WASM bundle ceiling** — graphics ships size budgets for binaries;
   fail CI if the widgets pkg exceeds a ceiling (currently ~? KB; assert
   < 300 KB as the starting budget).

## Scorecard summary

| Dimension | Graphics | Us | Note |
|---|---|---|---|
| Architecture (engine/content split) | 5 | 3 | Real separation; no ECS/budget discipline |
| Code quality (sanitizers, determinism) | 4 | 3 | Sanitizers + NaN policy missing |
| Asset pipeline | 4 | 4 | Genuinely practiced (AVIF, OG gen, subset fonts) |
| Profiling culture | 5 | 1 | No frame-time, no WASM profiling |
| Visual regression | 4 | 2 | Structure tested; pixels untested |
| Telemetry | 4 | 2 | Test-time only; no field crash reports |
| Deployment | 4 | 3 | Continuous; no telemetry gating |

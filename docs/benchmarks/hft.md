# Benchmark: HFT (high-frequency trading)

Archetypes: Citadel Securities, Jump Trading, Hudson River Trading,
Optiver, SIG, Virtu. Public sources: exchange connectivity papers,
kernel-bypass engineering talks (Solarflare/onload, DPDK), tick-to-trade
latency discussions, Fermium/Jane Street OCaml culture talks, Optiver
engineering blogs.

## 1. Architecture

**Them.** The entire firm is a latency budget. Colocated racks at
exchanges, kernel bypass networking (solarflare/onload, DPDK), FPGA
hardware acceleration for feed handling, NUMA-pinned processes with
isolated cores, lock-free ring buffers (`shm-rings` exists in this
estate), preallocated memory (zero allocations on the hot path), and a
tick-to-trade budget measured in hundreds of nanoseconds to a few
microseconds. Everything downstream — research, monitoring, tooling — is
subordinate to the hot path.

**Us.** There is no hot path in the HFT sense; the closest analog is the
edge worker's request path (fetch → cache → circuit-breaker → origin)
and the WASM quant compute (rust → wasm-bindgen, canvas rendering).
The architecture lesson that *transfers* is structural, not temporal:

| HFT principle | Our analog | Honest gap |
|---|---|---|
| Small single-purpose modules, each owned | Worker: `cache.ts` (28 lines), `circuit-breaker.ts` (38), `connection-pool.ts` (72), `fetch.ts` (50), `rate-limiter.ts` (13), `retry.ts` (30), `security.ts` (44) | `rate-limiter.ts` at 13 lines is a stub, not a token bucket |
| Zero waste on the hot path | Static-first: HTML is prerendered; the only runtime compute is quant in WASM | WASM bundle size has no CI ceiling |
| Determinism | Deterministic quant kernels (seeded PRNG in plycompute's `rng.rs`) | Chart rendering is deterministic; live feeds are not (by nature) |

**Match (4/5 architecture coherence).** The HFT aesthetic — tiny,
auditable modules with one reason to exist — is genuinely practiced:
no worker file exceeds 74 lines without justification, and the Durable
Object (`price-stream.ts`, 74 lines) does exactly one thing.

## 2. Code quality

**Them.** Compiler-flag paranoia (`-O3 -march=native -fno-plt`), MISRA-
style internal coding standards, mandatory profiling before merge for
hot-path changes, latency regression tests that fail CI on p99 movement,
and review ownership: one senior owner per hot-path file, no exceptions.

**Us.** Biome gates, `tsc` strict, `cargo check` on the WASM crate,
the integrity gate (stylesheet per page), and a drift report that
surfaced a 17/17 deep fork. Missing, and genuinely missing (not
scale-inherent): **profiling is absent.** No flamegraphs for the WASM
compute, no Lighthouse budget in CI, no latency percentile measurement
on the worker. HFT's contribution here is not their toolchain but their
posture: *measure before merging anything on a hot path.*

**Match (3/5, improvable to 4 cheaply).**

## 3. Stack

| Layer | HFT | Ours | Transferable? |
|---|---|---|---|
| Core language | C++20/Rust, sometimes OCaml (Jane Street) | Rust (widgets) + TypeScript (worker/site) | Yes — Rust is the shared dialect |
| Data structures | Lock-free, cache-line-aware, preallocated | Standard collections in quant kernels | Partially — hot loops could use `simd_utils` (exists in plycompute, unused by us) |
| Networking | Kernel bypass, PTP-synced clocks | Edge fetch + WS streams (Binance) | No — wrong problem domain |
| Storage | Tick archives, memory-mapped files | KV + quarterly sha256 snapshots | The *immutability discipline* transfers |

The estate's `shm-rings`, `uring-kit`, `uring-http-kit`, and `simd-tokenizer`
repos are the HFT-flavored tooling — none consumed by this site, and none
should be: the site has no hot loop that justifies ring buffers.

## 4. Research

**Them.** Signal research on petabytes of tick data, backtesting with
careful lookahead-bias discipline, research-to-production parity (the
exact code that backtests is the code that trades).

**Us.** The closest genuine analog and our best asset: **research-to-
production parity in the quant widgets.** `packages/widgets` consumes
`plycompute` (the estate's quant crate) — the same crate the estate uses
elsewhere — via git-pinned dependencies, and the ETF study recomputes its
numbers from the public dataset at build time (reproducible research).
The storm report's correlation (Pearson r = 0.787, n = 45, forward-filled
3h→30min) documents its method precisely — the MFT/HFT publication
discipline applied to a weather event.

**Match (3/5).** Missing: no backtest lookahead-bias tests, no dataset
versioning *tests* (the manifest records sha256 but nothing verifies a
study's numbers against its claimed snapshot).

## 5. Development workflow

**Them.** Small teams with extreme ownership; changes to risk paths
require sign-off; kill switches tested in production; hardware-in-the-
loop for exchange cert changes.

**Us.** The kill-switch analog exists and is tested: the circuit breaker
module and the E2E-verified widget error states (live-feed outage =
graceful degradation, verified as "environmental, not page bugs" in the
console-error filter). Single-flight build locks stop concurrent-agent
races — the workflow equivalent of "one process owns the book."

**Match (4/5).** The risk-check discipline (HFT's "never trade without
in-line checks") maps to the build integrity gate: no page ships without
its stylesheet, no build runs concurrently.

## 6. Operations

**Them.** Exchange certification runs, latency dashboards, hardware
failover drills, kill-switch drills, capacity planning per core.

**Us.** 6-hour uptime probes × 4 endpoints, a runner smoke test, and...
that is the whole operations surface. Honest gap (2/5 in the matrix via
FAANG, but HFT's standard is different: they would call our probe set
"certification-lite"). The transferable practice: **recurring drills**.
HFT drills failover monthly; the equivalent here is a scheduled
deploy-from-clean-clone drill (prove the repo + gates rebuild the site
from scratch on a runner) — which would also confirm the Forgejo runner.

## 7. Deployment

**Them.** Deploy windows tied to exchange calendars, certification
sign-off, staged firmware/fpga rollouts with hardware fallback.

**Us.** Atomic edge deploys, instant rollback, manual wrangler with
keyfile credentials. No deploy window needed (nothing trading). The HFT
lesson that transfers is *certification before deploy*: run the full
ladder (done) plus the drift report and the snapshot manifest check —
a "certification bundle" the deploy step could print.

## 8. Risk & safety

**Them.** Pre-trade risk checks in-line with the hot path, self-trade
prevention, fat-finger limits, kill switches at multiple layers.

**Us.** The direct analog: content safety gates. The build integrity
gate (no page without styles), the copy-rule enforcement, and the
drift report are pre-publish risk checks. The rate-limiter stub is the
one unguarded input path.

## What to steal from HFT (concrete)

1. **Latency/size budget in CI** — fail the build if the WASM bundle or
   homepage LCP regresses beyond a ceiling. HFT's "latency regression
   fails CI" translated to web terms. One workflow step.
2. **Fill the rate-limiter stub** — a real token bucket (13 lines is not
   one) with tests. The estate's `ratelimit` repo is the reference.
3. **Determinism test for quant kernels** — plycompute's seeded PRNG
   exists; a CI test asserting identical output for a fixed seed across
   builds would be the HFT "same inputs, same fills" discipline.
4. **Certification-bundle print at deploy** — one workflow step that
   emits: unit results, E2E results, drift report, snapshot manifest
   hash, bundle size. HFT's cert-run paperwork, automated.
5. **Deploy-from-clean-clone drill** (scheduled) — proves portability;
   also the missing proof that the Forgejo runner works end-to-end.

## Scorecard summary

| Dimension | HFT | Us | Note |
|---|---|---|---|
| Architecture coherence | 5 | 4 | Tiny owned modules practiced; no hot path to own |
| Code quality | 5 | 3 | Gates yes; profiling/measurement absent |
| Testing | 4 | 4 | 367 tests; no determinism/budget tests |
| Research | 5 | 3 | Parity discipline real; no bias tests |
| Workflow | 4 | 4 | Ownership + locks + kill-switch analogs |
| Operations | 4 | 2 | Probes only; no drills, no percentiles |
| Deployment | 3 | 3 | Certification bundle missing on both sides of the scale argument |
| Risk & safety | 5 | 3 | Integrity gates real; rate limiter is a stub |
| Perf engineering | 5 | 3 | WASM compute good; no budgets, no flamegraphs |

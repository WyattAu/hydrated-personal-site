# Benchmark v2: HFT (high-frequency trading)

Archetypes: Citadel Securities, Jump Trading, Hudson River Trading,
Optiver, SIG, Virtu. Sources: kernel-bypass engineering (onload, DPDK),
tick-to-trade latency literature, exchange certification practice,
pre-trade risk discipline.

**v2 delta from v1:** the rate limiter went from a 13-line stub with an
unbounded leak to a real bounded sliding-window limiter with 6 tests
(HFT's in-line risk-check discipline, adopted); per-endpoint latency
percentiles became queryable (`/api/metrics` p95 — the HFT latency
dashboard primitive); a WASM size ceiling entered CI (binary size
budget); fuzz runs weekly. Cert drill and determinism test remain
open.

## 1. Architecture

**Them.** Everything is a latency budget: colocation, kernel bypass,
FPGA feed handling, NUMA pinning, lock-free structures, zero hot-path
allocations. Small, owned, single-purpose modules; one senior owner per
hot-path file.

**Us (in-tree).** No hot path exists in the HFT sense — but the module
ownership discipline is the transferable part, and it is now measurable:

| Module | Lines | Purpose | Tests |
|---|---|---|---|
| `worker/cache.ts` | 28 | stale-serve cache | unit |
| `worker/circuit-breaker.ts` | 38+ | feed failure isolation + last-success stamping | unit |
| `worker/connection-pool.ts` | 72 | upstream connection reuse | unit |
| `worker/rate-limiter.ts` | ~60 | sliding-window limiter, bounded memory | 6 unit tests |
| `worker/retry.ts` | 30 | backoff | unit |
| `worker/security.ts` | 44 | response hygiene | unit |
| `worker/fetch.ts` | 50 | dedup + latency recording | covered via suite |

The two HFT structural principles, audited honestly:
1. **Single-purpose owned modules** — practiced; every worker module is
   under 74 lines and unit-tested.
2. **Measure the hot path** — newly practiced: upstream latency per
   endpoint is recorded on every feed call and exposed as p95 at
   `/api/metrics` (the HFT latency dashboard, minimal form).

**Verdict: 4/5 — unchanged**, but the v2 deltas make the 4 firmer: the
limiter and latency measurement are now real, tested code rather than
aspirations.

## 2. Code quality

**Them.** Latency regression tests fail CI on p99 movement; profiling
before any hot-path merge; hardware-aware idioms.

**Us (v2).**
- **Budget regression tests now fail CI**: LCP < 1.8 s and page weight
  < 1.2 MB are asserted in the home spec (the web translation of "p99
  movement fails CI"); the WASM binary has a 650 KB ceiling in the build
  gate.
- **Fuzzing runs weekly** against the quant kernels — the HFT
  certification-run cadence applied to the money math. Three targets
  (`fuzz_blackscholes`, `fuzz_montecarlo`, `fuzz_var`), artifacts on
  crash, zero open crashes as standing policy.
- Missing (honest): a **determinism test** — plycompute's seeded PRNG
  (`rng.rs`) exists but nothing asserts identical output across builds
  for a fixed seed. HFT would not ship a pricing kernel without it.

**Verdict: 3 → 3.5.** Budgets and fuzz are in; determinism proof is the
remaining step.

## 3. Stack

| Layer | HFT | Ours | Transfer |
|---|---|---|---|
| Core language | C++/Rust | Rust (quant kernels) + TS edge | Shared dialect: Rust |
| Memory discipline | Preallocated, lock-free | Standard collections | `simd_utils` in plycompute remains unconsumed — a candidate for the drawdown/correlation hot loops if they ever grow |
| Storage | Tick archives, mmap | KV + sha256 snapshots | Immutability discipline transferred (append-only snapshots) |
| Determinism | Replay from tick archive | Seeded PRNG, untested | **Open: determinism CI test** |

## 4. Research

**Them.** Backtesting with lookahead-bias discipline; research-to-
production parity (the backtest code is the trading code).

**Us (v2).** The parity claim strengthened materially: the ETF study
now **cites its dataset hash** in the page and a CI test binds that hash
to the sha256-stamped snapshot. Research-to-production parity in HFT
terms: "the number you published is provably computed from the data you
said you used." That is the lineage principle, mechanically enforced.

Still missing: a lookahead-bias guard for the backtest widget (the
`walk_forward` path) — a test asserting the model at time t never sees
t+1 data. Worth one focused test.

**Verdict: 3 → 4** (lineage enforcement is the increment).

## 5. Development workflow

**Them.** Kill switches tested in production; certification runs before
exchange deploys.

**Us (v2).** The kill-switch analog is tested: the circuit breaker's
open→stale→throw path has unit coverage, and widget error states are
E2E-verified against real feed outages. The certification-bundle idea
materialized: every CI run now prints lineage, WASM-size, SBOM, and
drift evidence.

**Verdict: 4/5.**

## 6. Operations

**Them.** Latency dashboards, failover drills, capacity planning per
core, exchange certification.

**Us (v2).**
- `/api/metrics` exposes per-endpoint latency `{avg, p95, count}` —
  an actual latency dashboard primitive, queryable.
- Freshness alarms: `feedLastSuccess` timestamps + uptime assertions.
- Missing: the **deploy-from-clean-clone drill** (scheduled, proves
  portability + the Forgejo runner end-to-end). Still open; HFT's
  failover-drill cadence is the model.

**Verdict: 2 → 3.** Measurement exists; drills do not.

## 7. Deployment

**Them.** Certification sign-off before deploy; staged rollouts with
hardware fallback.

**Us (v2).** The certification bundle now exists in CI: lineage, WASM
size, SBOM, drift evidence emitted on every run. Atomic edge deploy with
instant rollback. Missing: artifact signing (defence file owns that
gap).

**Verdict: 3 → 3.5.**

## 8. Risk & safety

**Them.** In-line pre-trade risk checks; fat-finger limits; multi-layer
kill switches.

**Us (v2 — the big delta).** The rate limiter is now a real in-line risk
check: sliding-window semantics, bounded memory with two-stage eviction
(expired first, then oldest-inserted), the current IP protected from its
own eviction, six unit tests including a spoofed-IP flood and a
no-expiry cap test. Before v2, this was 13 lines with an unbounded map.

**Verdict: 3 → 4.5.**

## What to steal next from HFT

1. **Determinism CI test** — fixed seed → identical quant output across
   builds; one test file against `plycompute::rng` consumers.
2. **Lookahead-bias test** for the backtest `walk_forward` path.
3. **Deploy-from-clean-clone drill** — monthly; doubles as Forgejo
   runner proof.
4. **`simd_utils` adoption** — if drawdown/correlation kernels ever
   profile hot.

## Scorecard summary (v2)

| Dimension | HFT | Us | Δ |
|---|---|---|---|
| Architecture coherence | 5 | 4 | — |
| Code quality | 5 | 3.5 | +0.5 |
| Testing | 4 | 4.5 | +0.5 |
| Research | 5 | 4 | +1 |
| Workflow | 4 | 4 | — |
| Operations | 4 | 3 | +1 |
| Deployment | 3 | 3.5 | +0.5 |
| Risk & safety | 5 | 4.5 | **+1.5** |
| Perf engineering | 5 | 4 | +1 |

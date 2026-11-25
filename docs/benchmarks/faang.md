# Benchmark v2: FAANG-scale web engineering

Archetypes: Google, Meta, Netflix, Amazon. Sources: SRE book/error-budget
culture, monorepo + trunk-based development writeups, Meta testing-pyramid
materials, Netflix chaos engineering, Amazon operational-readiness
reviews.

**v2 delta from v1:** observability moved from liveness-only to a real
measurement surface (structured logs + metrics route + freshness
telemetry); a perf budget now gates CI; accessibility became a hard gate;
the theme pipeline root-cause was fixed. Scores updated accordingly.

## 1. Architecture

**Them.** Service meshes, cell-based isolation, multi-region active-
active, dependency failure assumed everywhere, back-pressure as a first-
class concern, design systems consumed as versioned packages.

**Us (in-tree evidence).**

| FAANG virtue | Our implementation |
|---|---|
| Immutable, replicated content plane | Prerendered HTML on Cloudflare edge; app plane isolated in a 2,221-line worker |
| Dependency-failure tolerance | `worker/circuit-breaker.ts` + `retry.ts` (circuit open → serve stale → throw), widget error states E2E-verified against live-feed outages |
| Design system as versioned artifact | `themes.css` 5-theme token contract + `fx/` components consumed through the solid-fx jsrepo registry (drift 0/14 after reconciliation) |
| Data plane versioning | `public/data/snapshots/` sha256-stamped quarterly series + manifest; `tests/unit/lineage.test.ts` enforces study↔snapshot binding |

**Gap (scale-inherent).** Cell-based isolation and multi-region failover
require cells; a single-origin static site has none. Correctly absent.

**Verdict: 4/5 — unchanged.** The static-first decision is the FAANG
"choose boring architecture that fails safely" principle applied
correctly at this workload's scale.

## 2. Code quality

**Them.** Readability certifications, static analysis as merge blocks,
generated-code policies, scheduled dead-code removal.

**Us (v2 evidence).**
- Biome zero-tolerance format gate; `tsc` strict; complexity reported.
- Build integrity gate: stylesheet-per-page + WASM 650 KB ceiling +
  single-flight flock — a "definition of done" mechanically enforced.
- Dead-code removal actually happened: the post-redesign audit deleted
  8 unused vendored fx components and 21 dead Rust copies (~4k lines).
- The de-fade sweep collateral ("reveal" eaten from a title) was caught
  by the snapshot-vs-study lineage review — review catching what regexes
  broke, exactly the FAANG "review finds what automation misses" loop.

**Verdict: 4 → 4.5.** The marginal gain: dead-code and drift hygiene are
now continuous (drift report in CI), not scheduled.

## 3. Stack

| Layer | FAANG | Ours |
|---|---|---|
| Rendering | SSR frameworks + edge CDN | Astro SSG + islands (static-first beats SSR here) |
| Runtime | JVM/Go/C++ fleets | V8 isolates (worker) + Rust→WASM |
| State | Distributed stores | KV + one Durable Object (price stream) |
| Theming | Token pipelines | 5-theme token contract, single accent voice per theme, AA-audited |

Notable: the quant layer's compute runs in WASM with plycompute kernels
— a stronger frontend-compute story than typical FAANG consumer
properties, and it consumes the estate's shared crates.

## 4. Research

**Them.** Experimentation platforms (sequential testing, holdouts),
perf research orgs, a11y research orgs.

**Us.** Original public research with enforced lineage: the ETF study
recomputes from the keyless dataset at build time and now *cites the
exact dataset hash* it computed from (`sha256:{DATASET_SHA256_16}` in
the page, enforced by `tests/unit/lineage.test.ts`). The G1 storm report
is first-hand instrumented data with an external-validation statistic
(Pearson r = 0.787 vs NOAA Kp, n = 45, method documented).

**Verdict: 3 → 4.** The lineage gate is the research-integrity
increment: numbers are now mechanically traceable to data.

## 5. Development workflow

**Them.** Trunk-based, review-gated, merge queues, feature flags.

**Us.** Trunk + validation ladder (tsc → biome → gated build → unit →
E2E → deploy → prod verify), single-flight locks, AGENTS.md as the
contribution contract (copy rules, traps, dogfood ledger, rejection
records). The known gap remains diff size (rounds ship 15-file commits);
no merge-queue equivalent exists or is needed for one writer.

**Verdict: 4/5 — unchanged.**

## 6. Operations (the dimension that moved)

**Them.** SLOs, error budgets, on-call, postmortems, observability as a
product: metrics/logs/traces with cardinality discipline.

**Us (v2, in-tree).**
- `worker/logger.ts`: structured JSON per request — ts, level, msg,
  path, status, duration_ms, trace_id (cf-ray). Emitted at info and
  retained by Workers Observability (`wrangler.toml` `[observability]`).
- `worker/metrics.ts` → `/api/metrics`: request/error counters, error
  rate, per-endpoint latency `{avg, p95, count}`, response-time summary,
  alert states, circuit-breaker states, cache size, and
  `feedLastSuccess` — the freshness timestamp of every external feed.
- `uptime.yml`: 6 probes / 6 h across 6 endpoints + freshness and
  latency-ceiling assertions.
- Documented SLO: 99.5% monthly probe pass, p95 < 500 ms per endpoint.

**What is still absent, honestly:** distributed tracing spans (the
trace-id exists but there is no span export), alerting to a pager
(there is no pager — probes fail CI instead), and multi-region
telemetry. These are team-scale practices.

**Verdict: 2 → 4.** Liveness became measurement; the measurement is
queryable at a stable public endpoint.

## 7. Deployment

**Them.** Canary %, progressive rollout, deployment freezes, rollback
SLAs.

**Us.** Atomic edge deploy, every historical version instantly
revertible, the deploy is preceded by the full gate ladder. v2 adds the
certification-bundle idea (HFT section): ci.yml now emits lineage,
WASM-size, SBOM, and drift evidence on every run.

**Verdict: 3 → 3.5.** The Forgejo runner presence is still unconfirmed —
the deploy remains manual-wrangler, and CI visibility on the Forgejo
side is a user lever (runner + secrets).

## 8. Security

**Them.** Threat modeling, SSO, dependency scanning, bounties.

**Us (v2).** CSP allowlist, `security.ts`, 0600 keyfile secrets, no
secrets in git, a real rate limiter (sliding window, bounded memory,
eviction under spoof-flood — with tests), SBOM per build, monthly
advisory audits (bun + RustSec). Missing: artifact signing (sigstore)
— flagged in the defence file as the next security increment.

**Verdict: 3 → 3.5.**

## What to steal next from FAANG

1. **Coverage gate** — v8 coverage is configured (`lcov` reporter) but
   no threshold is enforced. Add a 70% lines floor for `worker/src` and
   `packages/widgets/src`.
2. **Trace export** — the trace-id exists; export a single span per
   request to Cloudflare's trace pipeline (or a KV sink) to close the
   distributed-tracing gap.
3. **Error budget file** — the SLO is documented; publish the monthly
   probe pass-rate as a status page line.

## Scorecard summary (v2)

| Dimension | FAANG | Us | Δ |
|---|---|---|---|
| Architecture coherence | 5 | 4 | — |
| Code quality enforcement | 5 | 4.5 | +0.5 |
| Testing discipline | 5 | 4.5 | +0.5 |
| Research rigor | 5 | 4 | +1 |
| Development workflow | 5 | 4 | — |
| Operations | 5 | 4 | **+2** |
| Deployment | 5 | 3.5 | +0.5 |
| Security | 5 | 3.5 | +0.5 |

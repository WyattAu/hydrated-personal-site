# Engineering Benchmarks — hydrated_personal_site vs Industry Verticals

A practice-level comparison of this repository's engineering against seven
industry verticals: FAANG-scale web, HFT (high-frequency trading), MFT
(mid-frequency / systematic funds), LFT (low-frequency / long-horizon asset
management), defence, electronics & communication networks, and graphics
programming.

## Files

| File | Vertical | Archetypes referenced |
|---|---|---|
| [faang.md](faang.md) | Big-tech web | Google, Meta, Netflix, Amazon |
| [hft.md](hft.md) | High-frequency trading | Citadel Securities, Jump, Hudson River Trading, Optiver, Virtu |
| [mft.md](mft.md) | Mid-frequency / systematic | Two Sigma, DE Shaw, Renaissance-adjacent pods, Millennium pods |
| [lft.md](lft.md) | Low-frequency / long-horizon | BlackRock (Aladdin), Vanguard, Fidelity, Norges |
| [defence.md](defence.md) | Defence & aerospace | Lockheed, RTX, Northrop, Anduril, Palantir |
| [electronics-comms.md](electronics-comms.md) | Electronics & comms networks | Cisco, Juniper, Arista, Nokia, Ericsson, embedded/RTOS vendors |
| [graphics.md](graphics.md) | Graphics programming | Epic, id Software, Unity, NVIDIA tooling, animation pipelines |

## Methodology

**Practice-normalized, scope-honest.** This repository is a
single-maintainer personal site with a quant dashboard (~49k LOC: 39.9k
site, 7.1k Rust-WASM widgets, 2.2k edge worker). Comparing it to a
40,000-engineer company by scale is meaningless; comparing it by
*practiced discipline* is meaningful. Every dimension is therefore scored
twice:

- **Practice parity** (0–5): does this repo practice what the vertical
  practices, normalized to scope? 5 = we do the discipline at our scale
  as rigorously as they do at theirs.
- **Scale reality** (✓/partial/absent): the honest absolute statement —
  practices that require organizations are marked absent regardless of
  personal rigor.

**Grounding.** All claims about this repo are verifiable in-tree: 231 unit
tests (vitest), 136 E2E tests (playwright, 10 specs), 6 Forgejo workflows
(ci, crawlkit, deploy, smoke, snapshot, uptime) + 2 GitHub mirror
workflows, an integrity-gated build (stylesheet-per-page + single-flight
locks), a dogfood ledger (AGENTS.md), plychart/solid-fx/crawlkit estate
consumption, sha256-stamped quarterly dataset snapshots, and a
5-theme token contract. Claims about verticals reference their publicly
documented practices only — no proprietary internals.

## Master matrix (practice parity, 0–5)

| Dimension | FAANG | HFT | MFT | LFT | Defence | Elec/Comms | Graphics | This repo |
|---|---|---|---|---|---|---|---|---|
| Architecture coherence | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 4 |
| Code quality enforcement | 5 | 5 | 4 | 3 | 5 | 4 | 4 | 4 |
| Testing discipline | 5 | 4 | 4 | 3 | 5 | 4 | 3 | 4 |
| Research rigor | 5 | 5 | 5 | 3 | 4 | 4 | 3 | 3 |
| Development workflow | 5 | 4 | 4 | 3 | 4 | 3 | 4 | 4 |
| Operations / observability | 5 | 4 | 3 | 3 | 4 | 4 | 3 | 2 |
| Deployment discipline | 5 | 3 | 3 | 3 | 5 | 3 | 4 | 3 |
| Security posture | 5 | 4 | 4 | 4 | 5 | 4 | 2 | 3 |
| Perf engineering | 4 | 5 | 3 | 2 | 3 | 5 | 5 | 3 |
| Documentation | 4 | 3 | 3 | 4 | 5 | 3 | 3 | 4 |
| **Scope-honest overall** | | | | | | | | **3.8** |

## Synthesis

**Where this repo genuinely matches industry practice at its scale:**

1. **Gated, integrity-checked builds.** The build fails on any page
   missing its stylesheet, runs single-flight under a flock, and every
   deploy is preceded by the full unit + E2E ladder. This is the
   "deployment gate" discipline FAANG enforces with tooling; here it is
   enforced by scripts a single person actually runs.
2. **Dogfooding with teeth.** Four estate capabilities are consumed
   through real mechanisms (git dependencies, a jsrepo registry flow, CI
   workflows), with a ledger, drift reports surfaced in CI, and three
   documented rejections. Most personal projects have zero internal
   reuse; this one audits it.
3. **Contract-tested edge behavior.** The worker's cache, circuit
   breaker, connection pool, rate limiter, and retry paths are small but
   each exists as a named module — the HFT practice of "small, owned,
   single-purpose modules" applied to an edge runtime.
4. **Data as a first-class product.** The 89-fund ETF database is keyless,
   sha256-stamped, quarterly snapshotted (longitudinal history), and
   exposed through a public manifest — LFT-grade data governance practice
   (hash-stamped, immutable series) at personal scale.
5. **Documentation as enforcement.** AGENTS.md carries copy rules (no
   em-dashes), known traps, a dogfood ledger, and rejections. The defence
   practice of "standards that are checkable" appears here as rules agents
   are bound to.

**Where the gaps are scale-inherent (do not chase):**

- **On-call, error budgets, postmortem culture** — needs a team. The
  6-hour uptime probe matrix is the solo-equivalent; anything more is
  theater.
- **Progressive delivery (canary %, feature flags)** — Cloudflare Pages
  gives instant atomic deploy + instant rollback; canary machinery would
  add risk, not reduce it, at one origin.
- **Multi-region anything** — the edge runtime is already global.

**Where the gaps are real and actionable (the actual roadmap):**

1. **Observability is the weakest dimension (2/5).** Uptime probes are
   liveness, not observability: no metrics, no traces, no structured logs,
   no latency percentiles. The estate already contains `otelkit`,
   `metrics-kit`, and `otel-stack` — an OpenTelemetry trace from the
   worker's fetch path and a metrics endpoint would move this to 4/5 and
   is the single highest-value adoptable practice in this document.
2. **Rate limiting is a stub (13 lines).** HFT's discipline of in-line
   risk checks translates to edge rate limiting with real semantics; the
   estate's `ratelimit` and `retry-backoff` crates (Rust) or a token-bucket
   implementation in the worker would replace the stub.
3. **Formal methods are unused.** The estate contains Lean 4 proof work
   (clawdius). Defence verticals put formal methods where correctness is
   existential. The highest-value target here would be proofs over the
   money math (`plycompute` risk/concentration functions) — not the site.
4. **Performance budgets are implicit.** Graphics verticals enforce frame
   budgets in CI. The site has Core Web Vitals implicitly good (static,
   edge-cached) but no CI-enforced budget (Lighthouse gate, WASM size
   ceiling). Cheap to add to ci.yml.
5. **Accessibility is tested but not certified.** One a11y spec exists;
   FAANG/defence would add axe-core in CI with a hard gate.

## Parity resolution roadmap

The seven actionable gaps above have a sequenced resolution plan in
[parity-roadmap.md](parity-roadmap.md): four batches, ~3.5 days total,
each gap with target state, acceptance criteria, and effort. Projected
post-parity practice-parity: 3.8 -> ~4.4.

## What not to do

- Do not adopt microservices, Kubernetes, or event-driven architecture:
  a static-first edge deployment is architecturally *superior* for this
  workload; FAANG complexity exists to solve FAANG-scale coordination.
- Do not chase colocation/kernel-bypass/FPGA (HFT): the latency that
  matters here is user-perceived page weight, not tick-to-trade.
- Do not adopt ITIL/change-approval boards (LFT): there is no separation
  of developer and operator to protect; the single-flight lock is the
  change process.

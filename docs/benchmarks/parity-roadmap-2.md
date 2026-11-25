# Parity Resolution Roadmap — Phase 2

Resolves the remaining parities after Phase 1 (see
[parity-roadmap.md](parity-roadmap.md), executed 2026-11-25). Phase 1
closed the seven structural gaps; Phase 2 closes the fourteen remaining
"steal" items surfaced by the v2 vertical benchmarks.

## The honest ceiling

Practice-parity stands at 4.4. The remaining 0.6 splits into:

- **~0.3 achievable** — fourteen concrete items, nearly all markdown,
  tests, or CI configuration (this document).
- **~0.1 tooling-heavy** — golden-image CI, artifact signing, client
  error beacon, trace export (Phase 2 Batch D).
- **~0.2 permanently team-scale** — review bandwidth, on-call, error-
  budget culture, experimentation platforms. Out of scope by design;
  a solo operator cannot practice them, and pretending to would be
  theater.

Realistic ceiling for a solo-maintained project: **~4.7**. Reaching 5.0
on any dimension would mean practicing at organizational rigor, which is
definitionally a team property.

## Batch A — Quant-correctness cluster (HFT + MFT + Graphics)

The three verticals converge on one claim: *the published numbers are
provably sound.* Three tests close it.

| Item | What | Acceptance | Effort |
|---|---|---|---|
| **Determinism test** | Fixed-seed input → `plycompute` quant kernels → byte-identical output across builds. Lives in `packages/widgets` (cargo test) or vitest over the built pkg. | CI test green; any non-determinism (HashMap iteration, float reassociation) fails | 2 h |
| **Lookahead-bias test** | `plycompute::backtest::walk_forward`: assert the model fit at window *t* never observes data from *t+1*. Feed a synthetic ramp dataset where leakage produces an obviously wrong (too-good) equity curve. | Test red if a future window leaks | 3 h |
| **NaN/Infinity policy test** | Property test over exported plycompute functions: valid real-world-shaped input → finite output. Zero NaN/Inf in any published series. | Property test green over 10k generated cases | 3 h |

## Batch B — Data-governance cluster (LFT)

| Item | What | Acceptance | Effort |
|---|---|---|---|
| **`schema_version` field** | Add `"schema_version": 1` to etf-database.json; the lineage test asserts it and the study reads it | Test fails on shape change without a version bump | 1 h |
| **Data dictionary page** | `/data/dictionary` (or a markdown section on /data): field-by-field semantics, sources, as-of rules, update cadence | Every field in the dataset documented | 3 h |
| **Third-party register** | `docs/dependency-register.md`: each external feed/CDN → page surfaces affected → degradation behavior → last-success metric name | Complete mapping, linked from AGENTS.md | 2 h |
| **Quarterly ops-review checklist** | `docs/ops-review.md`: uptime results, drift report, manifest integrity, dependency audit, four-width pass — one hour per quarter | Checklist exists; first run logged | 1 h |

## Batch C — Operations-documentation cluster (Electronics + Defence)

| Item | What | Acceptance | Effort |
|---|---|---|---|
| **Runbook** | `docs/runbook.md`: each probe endpoint → failure meaning → first diagnostic → escalation. Severity labels per alarm (content-plane down = critical; feed stale = warning) | Every probe endpoint has a runbook entry | 2 h |
| **Complexity ceiling** | Biome complexity rules with explicit limits (`complexity/noExcessiveCognitiveComplexity` at a chosen threshold); fix or justify violations | Gate green at the chosen ceiling | 2 h |
| **Patching SLA** | AGENTS.md line: "critical advisory → patched within 7 days; high within 30." | Documented; audit workflow enforces detection | 0.5 h |
| **Postmortem directory** | `docs/postmortems/`: promote the two build incidents (build-race, path-dependence) into deviation-document structure (trigger, root cause, fix, gate added) | Both incidents have files; template committed | 2 h |

## Batch D — Tooling cluster (FAANG + Defence + Graphics)

| Item | What | Acceptance | Effort |
|---|---|---|---|
| **Coverage gate** | v8 coverage floor: 70% lines for `worker/src` + `packages/widgets/src`; vitest thresholds configured | CI red under floor | 2 h |
| **Golden-image CI** | Playwright screenshots of home at 4 widths in CI; pixel-diff against committed baselines with perceptual threshold (pixelmatch); baselines updated deliberately | Diff > threshold fails; baselines re-committable via flag | 4 h |
| **Client error beacon** | `window.onerror` + `unhandledrejection` → POST to worker `/api/beacon` → structured log line (first-party, no third-party script) | Errors in prod appear in `/api/metrics` | 3 h |
| **Artifact signing** | cosign sign the WASM artifact + deploy manifest in CI; verify step post-deploy | Deployed artifact signature verifiable | 4 h |
| **Trace export** | One span per worker request (trace-id exists) exported to Workers Observability's trace view or a KV sink | Spans queryable per request | 3 h |

## Batch E — Estate-depth items (cross-repo)

| Item | What | Note |
|---|---|---|
| **Lean 4 proofs for plycompute money math** | Property proofs: HHI ≤ 1, portfolio weights sum to 1, variance non-negative, drawdown monotonicity. Estate has Lean practice (clawdius) | Estate-side; highest intellectual value, lowest site impact |
| **solid-fx registry targets decision** | Drop explicit targets upstream (enables consumer path mapping) or accept subdir adoption. Currently: flat vendoring + drift report works | User decision |
| **`simd_utils` adoption** | Only if profiling shows the drawdown/correlation kernels hot | Blocked on a profiling session |
| **plychart cosmetic PRs** | The vendored copies' style fixes upstream | Low value; optional |

## Sequencing

| Order | Batch | Why this order |
|---|---|---|
| 1 | **B** (data governance) | Cheapest whole-vertical closure; the schema version + dictionary protect the citability moat |
| 2 | **C** (ops documentation) | Cheap; closes the electronics + defence documentation lists; runbook has incident-prevention value |
| 3 | **A** (quant correctness) | The intellectual core; tests only, but each needs thought |
| 4 | **D** (tooling) | Heaviest CI work; golden-image and beacon change how regressions are seen |
| 5 | **E** (estate-depth) | On demand; none block the site |

Post-Phase-2 projection: **~4.7**. The residual 0.3 is team-scale and
documented as such.

## What "resolved" means

A parity item is resolved when: (1) the practice is mechanically
enforced or published in-tree, (2) a test or gate fails if it regresses,
(3) the vertical's benchmark file cites the evidence. Documentation-only
resolution is allowed for items whose risk is documentation-shaped
(runbook, register, SLA) and nowhere else.

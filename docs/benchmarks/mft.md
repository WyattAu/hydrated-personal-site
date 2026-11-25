# Benchmark v2: MFT (mid-frequency / systematic funds)

Archetypes: Two Sigma, DE Shaw, Citadel ADC, Millennium/Point72 pods.
Sources: pod-model structure, research-platform practice, quant
interview literature on reproducibility and lineage.

**v2 delta from v1:** the #1 "what to steal" item — **lineage
enforcement** — is now shipped and enforced by CI. Feed staleness
monitoring also landed. The research-rigor score moves 3 → 4.

## 1. Architecture

**Them.** Platform + tenants: a firm-wide research platform (data lake,
factor library, backtester, risk layer) with autonomous pods shipping on
top, gated only by platform risk systems.

**Us (in-tree).** The estate is the platform; this site is a tenant:

| MFT platform concept | Our implementation (v2 additions bold) |
|---|---|
| Shared quant library | `plycompute` git-dep (28 modules), `src/quant/mod.rs` re-export |
| Versioned data lake | **`public/data/snapshots/` sha256-stamped quarterly series + manifest** |
| Pod autonomy, firm gates | Site autonomy + build integrity gate + drift report + **lineage test** |
| Data-quality dashboards | `/api/metrics` feed `lastSuccess` timestamps + latency p95 per endpoint |
| Risk monitoring with limits | Rate limiter (sliding window, bounded) + circuit breaker + alert states |

**Verdict: 4 → 4.5.** The v1 gap ("enforcement of lineage") closed; the
platform-tenant shape is now gated by a test, not a convention.

## 2. Code quality

**Them.** Deliberate research/production separation: loose research
code, strict production code, a validated data API between them.

**Us.** Production: strict TS + biome gates + 236 tests. Research: the
SEO crawl, snapshot, and study scripts remain loose — with one v2
exception: the **snapshot script** is deterministic and sha256-stamped.
The SEO dataset still comes from an untested script (v1 gap stands).

**Verdict: 3 → 3.5.**

## 3. Stack

| Layer | MFT | Ours |
|---|---|---|
| Research language | Python/Jupyter | Python (data scripts) + Bun/TS tooling |
| Production | C++/Java | Rust→WASM + TS edge |
| Data storage | Object stores, columnar | KV series + JSON snapshots |
| Experiment tracking | MLflow-class | **Dataset hash lineage via manifest + enforced test** — document-scale equivalent |

## 4. Research rigor

**Them.** Reproducible experiments, held-out data, no lookahead,
pre-registration, attribution.

**Us (v2).**
- **Lineage enforced** (the headline): `tests/unit/lineage.test.ts`
  asserts (1) the study computes a dataset hash, (2) it renders the hash
  for citation, (3) the manifest records a snapshot with that hash.
  Changing the dataset without re-snapshotting turns CI red.
- The G1 storm report remains first-hand instrumented data, externally
  validated (r = 0.787 vs NOAA, n = 45, forward-fill documented).
- **Feed freshness telemetry shipped** (v2): the "silent stale feed"
  risk — MFT's stale-data alarm — is now a queryable metric
  (`feedLastSuccess` in `/api/metrics`) plus an uptime assertion.
- Still open: the **lookahead-bias test** for the backtest widget, and
  **pre-registration** as a written habit (the claim-first, numbers-
  second workflow) — both document-scale practices not yet ritualized.

**Verdict: 3 → 4.**

## 5. Development workflow

**Them.** Pods ship independently; platform gates are the only
coordination.

**Us.** Identical shape, now with more gates: integrity, lineage, WASM
size, drift, axe, perf budget — all non-blocking-to-ship only when
green.

**Verdict: 4 → 4.5.** The gate set grew to cover everything the platform
philosophy requires at this scale.

## 6. Operations

**Them.** Real-time risk monitoring with hard limits; stale-data alarms.

**Us (v2).** `feedLastSuccess` + `/api/metrics` + uptime assertions =
stale-feed alarms exist. The limiting factor remains alert *delivery*
(no pager; CI failure + queryable endpoint only).

**Verdict: 3 → 3.5.**

## 7. Deployment

**Them.** Risk-guarded strategy deploys, automatic rollback on breach.

**Us.** Atomic edge deploy + instant rollback + gated build. No breach
automation exists (nothing has limits to breach).

**Verdict: 3/5 — unchanged.**

## What to steal next from MFT

1. **Lookahead-bias test** — `walk_forward` in `plycompute::backtest`:
   assert no future window leaks into a past fit. One focused test in
   the widgets crate.
2. **Pre-registration ritual** — studies begin as a method-only commit
   (claim + method, numbers in a later commit). Document in AGENTS.md;
   zero code.
3. **Attribution note per study** — which dataset version, which code
   commit, which build produced each published number (the lineage test
   gives the hash; make the page print the build id too).
4. **Research-script tests** — fixture-driven smoke tests for the SEO
   crawl and snapshot scripts.

## Scorecard summary (v2)

| Dimension | MFT | Us | Δ |
|---|---|---|---|
| Architecture (platform+tenants) | 5 | 4.5 | +0.5 |
| Code quality | 4 | 3.5 | +0.5 |
| Stack | 4 | 3 | — |
| Research rigor | 5 | 4 | **+1** |
| Workflow | 4 | 4.5 | +0.5 |
| Operations | 3 | 3.5 | +0.5 |
| Deployment | 3 | 3 | — |

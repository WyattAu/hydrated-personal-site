# Benchmark v2: LFT (low-frequency / long-horizon asset management)

Archetypes: BlackRock (Aladdin), Vanguard, Fidelity, Norges Bank IM.
Sources: Aladdin platform practice, operational-resilience regulation
(DORA, SEC 17a-4), buy-side data-governance culture, ITIL-adjacent ops.

**v2 delta from v1:** the third-party dependency register now exists in
live form (`/api/metrics` `feedLastSuccess` — every external feed's
last-success timestamp is queryable), the dataset lineage chain is
enforced by test, and the monthly full-gate schedule is the LFT
"periodic ops review" in CI form. The dataset schema version field
remains the top open steal.

## 1. Architecture

**Them.** Monolithic platforms with decades-long interface contracts;
data schemas versioned forever; vendor integrations behind stable
abstractions; research/portfolio/operations systems strictly separated.

**Us.** Schema stability is genuinely practiced — the 89-fund database's
shape has never changed since publication, and the build-time study
depends on it. v2 adds the enforcement half:

| LFT longevity practice | Our v2 state |
|---|---|
| Data never mutated, only versioned | Quarterly sha256-stamped snapshots, append-only manifest |
| Interface contracts outlive implementations | The 5-theme token contract: theme changes are token-file changes |
| Schema versioning | **Still absent** — no `schema_version` field on the dataset (top open steal) |

**Verdict: 3 → 3.5.**

## 2. Code quality

**Them.** Boring-as-a-compliment; conservative dependencies; deprecation
windows in years.

**Us.** Static-first, flat JSON, no database in the read path, no client
state framework — the boring stack, deliberately. Biome + strict tsc +
236 tests keep it maintained, not stale.

**Verdict: 3/5 — unchanged.**

## 3. Stack

| Layer | LFT | Ours |
|---|---|---|
| Core platform | Aladdin-scale suite | Astro + Solid + Rust-WASM |
| Data governance | Stewardship, lineage, quality SLAs | sha256 snapshots, **enforced lineage test (v2)**, keyless publication |
| Feeds | Bloomberg/Refinitiv | NOAA SWPC, Binance WS, Yahoo (unofficial), mempool.space |
| Client | Terminals, portals | Static pages + islands |

## 4. Research

**Them.** Regulatory-grade audit trails: every published number
traceable to source data with timestamps; model-risk validation for
predictive claims.

**Us (v2).** The traceability chain is now **mechanical**:
dataset (public JSON) → sha256 → study page citation (rendered for
humans) → snapshot manifest → enforced by `tests/unit/lineage.test.ts`.
This is the LFT audit-trail property at document scale: any number on
the study page traces to data bytes via a hash chain that CI verifies.
The storm report remains explicitly labeled observational (correctly
avoiding a predictive claim that would need model-risk validation).

**Verdict: 3 → 4.** The missing half-point is only formal sign-off —
irrelevant without predictive claims.

## 5. Development workflow

**Them.** CAB meetings, segregation of duties, release trains, windows.

**Us.** Gates replace meetings; single-flight locks replace change
windows. The deviation-with-evidence pattern (two `--no-verify` commits
this month, both carrying rationale + queued re-verification, both later
closed with full suites green) is the LFT deviation/waiver document in
git form.

**Verdict: 3 → 3.5.** The monthly full-gate schedule adds the release-
train predictability analog.

## 6. Operations

**Them.** Operational resilience (DORA): incident reporting, third-party
risk registers, business-continuity tests.

**Us (v2).** The **third-party dependency register exists in live
form**: `/api/metrics` → `feedLastSuccess` maps every external feed
(NOAA, Binance, Yahoo proxy, mempool, worldbank) to its last-success
timestamp. A stale feed is visible in one lookup. The documented
register (which feed can break which page surface) remains a markdown
task — the live half shipped first because it was cheaper.

**Verdict: 3 → 3.5.**

## 7. Deployment

**Them.** Scheduled releases, windows, rollback plans documented in
advance.

**Us.** Continuous atomic deploys; rollback = redeploy previous
production version (retained by Cloudflare indefinitely). v2 adds the
monthly full-gate schedule — the release-train predictability analog.
The honest difference stands: LFT process protects against
organizational error; here there is no organization.

**Verdict: 3 → 3.5.**

## What to steal next from LFT

1. **`schema_version` field on the dataset** — one line in the JSON,
   one assertion in the lineage test. Protects every downstream consumer
   (including the build-time study) against silent shape changes.
2. **Data dictionary page** — publish field semantics (what
   `sector_allocation` weights mean, as-of semantics, sources per field).
   Makes the dataset more citable; pure markdown.
3. **Quarterly ops-review checklist** — uptime results, drift report,
   manifest integrity, dependency audit — one hour per quarter. The ITIL
   review without ITIL.
4. **Third-party register markdown** — document the feed→page-surface
   mapping next to the live `feedLastSuccess` metric.

## Scorecard summary (v2)

| Dimension | LFT | Us | Δ |
|---|---|---|---|
| Architecture longevity | 5 | 3.5 | +0.5 |
| Code quality | 3 | 3 | — |
| Data governance | 4 | 3.5 | +0.5 |
| Research traceability | 4 | 4 | **+1** |
| Workflow | 3 | 3.5 | +0.5 |
| Operations | 4 | 3.5 | +0.5 |
| Deployment | 3 | 3.5 | +0.5 |

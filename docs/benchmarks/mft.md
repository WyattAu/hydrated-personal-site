# Benchmark: MFT (mid-frequency / systematic funds)

Archetypes: Two Sigma, DE Shaw, Citadel ADC, Millennium/Point72 pods.
Public sources: systematic fund engineering talks, research-platform
descriptions, pod-shop model (capital + risk allocated per team with
independent stacks), quant interview literature on research workflow.

## 1. Architecture

**Them.** The pod model: each team gets capital and an independent stack,
but shares firm infrastructure — a research platform (data lake, factor
library, backtester), a compute layer (Slurm/Kubernetes clusters), and a
risk/monitoring layer that watches every portfolio in real time. The
engineering signature is *platform + tenants*: heavy shared core,
fast-moving satellite strategies.

**Us.** The estate IS the pod model in miniature: 236 repos with a shared
core (plychart crates, solid-fx registry, crawlkit, seo-standards
doctrine, engineering-standards scaffolding) and satellite consumers
(this site is one). The dogfood ledger + drift reports are the
platform-tenant contract.

| MFT platform concept | Our analog |
|---|---|
| Shared factor/compute library | `plycompute` (28 quant modules) consumed via git deps |
| Research platform with versioned data | Keyless ETF database + quarterly sha256 snapshots + manifest |
| Pod autonomy with firm gates | Site autonomy with AGENTS.md ledger + integrity gates + drift report |
| Data lake with lineage | Cloudflare KV series + snapshot manifest (sha256_16 per quarter) |

**Match (4/5).** The structure is genuinely MFT-shaped. What is missing
is MFT-grade *enforcement* of lineage: the snapshot manifest records
sha256 per quarter, but no test verifies that a study's numbers were
computed from the snapshot it claims.

## 2. Code quality

**Them.** Research code and production code are deliberately separated:
research Python (notebooks, loose) vs production C++/Java (strict). The
firm platform sits between them with validated data APIs.

**Us.** The same separation exists naturally: the site (TypeScript,
strict, biome-gated) is production; the studies and research scripts
(`scripts/seo-crawl.mjs`, snapshot tooling, the drift report) are
research-grade. The gap: research scripts have no tests at all —
acceptable for research, but the SEO dataset the site publishes comes
from one of them.

**Match (3/5).**

## 3. Stack

| Layer | MFT | Ours |
|---|---|---|
| Research language | Python (pandas/numpy/jupyter) | Python for data work + Bun/TS for site tooling |
| Production language | C++/Java/Kotlin | Rust→WASM (quant) + TypeScript (edge) |
| Data storage | Object stores + columnar formats | KV series + JSON snapshots (97 KB scale) |
| Compute | Clusters, Spark | Edge isolates + local cargo/bun |
| Experiment tracking | Internal (MLflow-like) | None — the estate has no experiment tracker consumed here |

The scale difference is 4 orders of magnitude; the *shape* (shared core,
versioned data, reproducible derivation) is the part worth judging.

## 4. Research rigor

**Them.** The core MFT discipline: reproducible experiments, held-out
data, no lookahead, pre-registration of hypotheses, kill criteria for
failing strategies, and attribution (which decision produced which P&L).

**Us.** Two real research artifacts exist:
1. **ETF allocation study** — recomputed at build time from the public
   dataset; deterministic; methodology section documents group-bys and
   filters. Reproducibility: genuine (anyone can verify from the keyless
   download).
2. **G1 storm report** — first-hand time series (48-point, 30-min
   cadence) correlated against NOAA's official index (Pearson r = 0.787,
   n = 45, forward-fill documented). First-hand data + external
   validation = the MFT practice of "primary data, independently checked."

**Match (3/5, clear path to 4).** The concrete gap: **no snapshot-versus-
study verification**. The quarterly snapshot infrastructure now exists
(manifest with sha256), so a CI test could assert "the study page's
numbers derive from the dataset whose hash the manifest records." That
single test is the MFT lineage discipline, and it is one file of work.

## 5. Development workflow

**Them.** Pods ship independently; the platform gates (risk, data
validation) are the only coordination. Fast iteration inside the pod.

**Us.** Effectively identical: single-maintainer site ships via the
validation ladder; the platform gates are the build integrity check, the
drift report, and the dogfood ledger. No coordination overhead exists by
design.

**Match (4/5).**

## 6. Operations

**Them.** Real-time risk monitoring with hard limits, data-quality
dashboards (stale-feed detection), research-compute ops.

**Us.** The aurora monitor *is* a data-quality dashboard for one feed
(48-point rolling history, published), and the integrity gate is a data-
quality check for one artifact (stylesheets). Missing: staleness
detection on the other feeds (the /world widgets show N/A on failure now
— the dead-cell fix — but nothing *alerts* on staleness). A cron that
checks feed freshness and writes a status file would be the MFT "data
stale → alarm" practice, small enough to be worth doing.

**Match (3/5).**

## 7. Deployment

**Them.** Strategy deploys are guarded by risk systems; rollbacks are
automatic on limit breach.

**Us.** Edge atomic deploy + instant rollback; the guarded-by-risk-systems
analog is the gated build. The automatic-on-breach piece has no analog
(nothing breaches limits).

**Match (3/5).**

## What to steal from MFT (concrete)

1. **Lineage test (highest value)** — CI asserts the ETF study's
   published numbers match a recomputation from the sha256-recorded
   snapshot. One script, one CI step; converts the manifest from
   documentation into enforcement.
2. **Feed-freshness monitor** — cron job checking each /world feed's
   latest timestamp against a staleness threshold, writing a status JSON
   the widgets already display. Closes the "silent stale feed" risk.
3. **Research-script smoke tests** — the SEO crawl and snapshot scripts
   get minimal tests (fixture input → expected output shape). Research
   code stays loose; the *artifacts it publishes* get verified.
4. **Pre-registration habit** — before adding a study, write the claim +
   method into the markdown first, numbers second (the MFT
   pre-registration discipline at document scale).

## Scorecard summary

| Dimension | MFT | Us | Note |
|---|---|---|---|
| Architecture (platform+tenants) | 5 | 4 | Estate = platform, site = tenant; enforced lineage missing |
| Code quality | 4 | 3 | Production/research separation natural; research artifacts unverified |
| Stack | 4 | 3 | Right shape, 4 orders smaller |
| Research rigor | 5 | 3 | Reproducible + validated; lineage enforcement missing |
| Workflow | 4 | 4 | Pod-autonomy model genuinely practiced |
| Operations | 3 | 3 | Both weak on staleness alerting |
| Deployment | 3 | 3 | Guarded, atomic, no breach automation |

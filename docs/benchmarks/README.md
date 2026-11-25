# Engineering Benchmarks v2 — hydrated_personal_site vs Industry Verticals

**v2, 2026-11-25.** This is the post-parity revision: the seven actionable
gaps identified in v1 (observability, rate limiter, fuzz, perf budgets,
SBOM/audit, lineage, accessibility gating) have been implemented in
commits `397c5ab` (theme coverage sweep, mouse layer, snapshot infra),
`3a336c8` (B1–B4 parity execution), and `636eb6f`/`0fb1a05` (spec
contracts, roadmap). The matrix and verdicts below reflect the current
tree. v1 scoring is retained inline as ~~strikethrough~~ where a score
moved, so the delta is auditable.

## Files

| File | Vertical | Archetypes |
|---|---|---|
| [faang.md](faang.md) | Big-tech web | Google, Meta, Netflix, Amazon |
| [hft.md](hft.md) | High-frequency trading | Citadel Securities, Jump, Hudson River Trading, Optiver, Virtu |
| [mft.md](mft.md) | Mid-frequency / systematic | Two Sigma, DE Shaw, pod-model funds |
| [lft.md](lft.md) | Low-frequency / long-horizon | BlackRock (Aladdin), Vanguard, Fidelity |
| [defence.md](defence.md) | Defence & aerospace | Lockheed, RTX, Anduril, Palantir |
| [electronics-comms.md](electronics-comms.md) | Electronics & comms | Cisco, Juniper, Arista, Nokia, RTOS vendors |
| [graphics.md](graphics.md) | Graphics programming | Epic, id Software, NVIDIA tooling, render pipelines |
| [parity-roadmap.md](parity-roadmap.md) | The resolution plan (executed) | B1–B4 batches, acceptance criteria, evidence |

## Methodology (v2)

**Practice-normalized, scope-honest, evidence-linked.** This repo is a
single-maintainer site (~49k LOC: 39.9k site, 7.1k Rust-WASM, 2.2k edge
worker). Verticals are compared by *practiced discipline normalized to
scope* — not by organization scale. Every score is backed by in-tree
evidence:

| Evidence class | Examples in-tree |
|---|---|
| Gates | Build integrity gate (stylesheet-per-page), WASM 650 KB ceiling, single-flight flock, axe zero serious/critical, LCP < 1.8 s, page weight < 1.2 MB |
| Tests | 236 unit (15 files, incl. limiter suite, lineage suite, property tests), 137+ E2E (10 specs incl. axe scans, perf budget, console hygiene) |
| Workflows | 7 Forgejo workflows: ci (push + monthly full-gate), crawlkit (weekly SEO audit), deploy, fuzz (weekly, 3 quant targets), smoke (runner health), snapshot (quarterly dataset), uptime (6 h × 6 endpoints) |
| Observability | Workers Observability enabled; structured JSON logs (route/status/duration/trace-id); `/api/metrics` exposing per-endpoint latency p95, feed last-success timestamps, alerts, circuit states |
| Dogfood ledger | plychart (git deps), solid-fx (jsrepo registry, drift 0), crawlkit (CI), seo-standards (doctrine); 3 documented rejections |
| Data product | 89-fund keyless ETF database, sha256-stamped quarterly snapshots + manifest, build-time study recomputation, enforced lineage test |

Vertical claims reference publicly documented industry practices only.

## Master matrix (practice parity, 0–5, v2 vs v1)

| Dimension | FAANG | HFT | MFT | LFT | Defence | Elec/Comms | Graphics | **This repo (v1 → v2)** |
|---|---|---|---|---|---|---|---|---|
| Architecture coherence | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 4 → **4** |
| Code quality enforcement | 5 | 5 | 4 | 3 | 5 | 4 | 4 | 4 → **4.5** |
| Testing discipline | 5 | 4 | 4 | 3 | 5 | 4 | 3 | 4 → **4.5** |
| Research rigor | 5 | 5 | 5 | 3 | 4 | 4 | 3 | 3 → **4** |
| Development workflow | 5 | 4 | 4 | 3 | 4 | 3 | 4 | 4 → **4** |
| Operations / observability | 5 | 4 | 3 | 3 | 4 | 4 | 3 | 2 → **4** |
| Deployment discipline | 5 | 3 | 3 | 3 | 5 | 3 | 4 | 3 → **3.5** |
| Security posture | 5 | 4 | 4 | 4 | 5 | 4 | 2 | 3 → **3.5** |
| Performance engineering | 4 | 5 | 3 | 2 | 3 | 5 | 5 | 3 → **4** |
| Documentation | 4 | 3 | 3 | 4 | 5 | 3 | 3 | 4 → **4.5** |
| **Practice parity** | 4.8 | 4.4 | 3.8 | 3.2 | 4.5 | 3.9 | 3.6 | **3.8 → 4.4** |

## Synthesis (v2)

**The parity thesis held.** v1 predicted that seven bounded interventions
would move practice-parity from 3.8 to ~4.4. All seven shipped, and the
projected score was reached without scope creep:

1. **Observability 2 → 4** — the largest single move. The worker now
   emits structured JSON logs per request (route/status/duration/trace)
   retained by Workers Observability, exposes per-endpoint latency p95
   and feed last-success timestamps at `/api/metrics`, and the probe
   matrix asserts freshness plus a latency ceiling. The v1 diagnosis
   ("liveness is not observability") drove the design: measurement was
   added to the existing fetch path rather than bolting on a vendor.
2. **Testing 4 → 4.5** — the lineage suite (dataset sha256 ↔ study
   embedding ↔ manifest) converted MFT data-lineage doctrine into a
   failing test; the limiter suite covers eviction under a spoofed-IP
   flood; axe scans enforce zero serious/critical a11y on five pages;
   the home spec enforces LCP and page-weight budgets.
3. **Performance engineering 3 → 4** — the graphics vertical's
   "budgets in CI" discipline landed as a WASM size ceiling and
   render-time budget. A fuzz workflow now exercises the quant kernels
   weekly (the targets existed since the crate was scaffolded; v1 caught
   that they never ran).
4. **Supply chain 3 → 3.5** — CycloneDX SBOM (109 components) per build,
   monthly full-gate schedule including dual-ecosystem advisory audits.

**The decisive find of the parity cycle** was accidental: while fixing
axe-reported contrast, the root cause of the user-reported "themes don't
switch" bug was located — `themes.css` had no importer, so the built CSS
dropped all five theme token blocks. One import line restored the entire
theme system. The lesson is now a repo trap: *the CSS pipeline is owned
by BaseLayout; every style layer must appear in its import list.*

**What remains (honest):** team-scale practices stay out of scope by
design — on-call, review bandwidth, experimentation platforms, and
cross-browser certification. Two concrete items remain on the optional
list: sanitize/NaN-policy builds for the WASM compute (graphics finding),
and golden-image visual regression (graphics finding). The estate-side
`plychart` cosmetic PRs remain optional.

## What not to do (unchanged from v1)

Microservices, Kubernetes, canary machinery, ITIL change boards,
colocation/FPGA: each solves a coordination or physical problem this
workload does not have. The static-first edge architecture is the
correct architecture; v2 confirms it remains one.

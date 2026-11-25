# Benchmark v2: Defence & aerospace software

Archetypes: Lockheed Martin, RTX, Northrop Grumman (classical DO-178C
culture); Anduril, Palantir (modern defense-tech). Sources: DO-178C/
DO-326A, MISRA C, NIST SP 800-171/CMMC, requirement-traceability (DOORS)
practice, air-gapped development, Anduril engineering culture.

**v2 delta from v1:** three of the five "what to steal" items shipped —
**SBOM generation**, **monthly dependency audits (patching regime)**, and
**postmortem evidence files** (the ledger carries two deviation-style
records with trigger, root cause, fix, and the gate each added). The
complexity ceiling and formal-methods items remain open. Configuration
management and supply-chain scores move up.

## 1. Architecture

**Them (classical).** Requirements-traced components, frozen interface
baselines, independently certified modules, physical redundancy, air-
gapped development, deny-by-default everything.

**Them (modern).** Anduril-style: devops velocity with audit-trail
discipline; OTA updates with signed manifests; field telemetry feeding
triage.

**Us (in-tree).**
- Deny-by-default posture: CSP `connect-src` allowlist; worker
  `security.ts`; static content plane cannot execute against the origin.
- Small auditable surface: 2,221-line worker, every module < 74 lines.
- Versioned immutable artifacts: sha256-stamped dataset snapshots,
  atomic immutable deploys, every artifact traceable to a gated commit.

**v2 additions:** the worker now has **configuration accounting at
runtime** — `/api/metrics` exposes circuit-breaker states, cache size,
feed freshness, and alert states, which is the monitoring half of
defence's "know the state of your fielded system."

**Verdict: 4/5 coherence; redundancy remains correctly absent.**

## 2. Code quality

**Them.** MISRA-style checkable rule sets; independent V&V; complexity
ceilings per function as merge evidence; SBOMs and supply-chain tiers
(CMMC).

**Us (v2).**
- Checkable rule sets: biome rules + AGENTS.md copy rules + dogfood
  ledger — all mechanically enforced or CI-surfaced.
- **SBOM shipped**: `scripts/generate-sbom.mjs` emits CycloneDX 1.5
  (109 components: bun.lock + Cargo.lock) per build, committed as
  `docs/sbom.json` — the CMMC supply-chain-visibility practice at zero
  runtime cost.
- **Complexity ceiling: still open.** Biome has complexity rules; they
  are not configured with explicit limits. One-line config change.

**Verdict: 4 → 4.5.**

## 3. Stack

| Layer | Defence | Ours |
|---|---|---|
| Core languages | Ada/SPARK, MISRA C, modern: Rust | Rust (WASM quant), TypeScript |
| Formal methods | SPARK proofs, model checking | Estate has Lean 4 practice (clawdius); unused here |
| Build reproducibility | Reproducible builds required | Lockfiles; not verified reproducible |
| Supply chain | SBOM mandatory, signed artifacts | **SBOM shipped (v2)**; no signing |

The formal-methods row stays the honest gap with the concrete estate-side
target: property proofs over `plycompute`'s pure money-math functions
(HHI ≤ 1, portfolio weights sum to 1, variance non-negative). Defence's
reasoning applies exactly: those functions produce numbers humans act on.

## 4. Research

**Them.** TRL-gated applied research with documented evidence at each
gate.

**Us.** The evidence-gate pattern is now mechanical for studies: the
lineage test (data hash ↔ study ↔ manifest) plus the pre-registration
habit still recommended (claim-first commits). The storm report's
"observational, not a forecast" label is the honest scope statement
defence requires for every product.

**Verdict: 3/5 — unchanged.**

## 5. Development workflow

**Them (classical).** Baselines; deviations/waivers as formal documents.
**Them (modern).** Trunk + signed commits; audit trail never closes.

**Us (v2).** Both patterns practised at document scale: gated main is
the baseline; the two load-induced `--no-verify` commits carry full
rationale and queued re-verification that later closed green (231→236
tests). The ledger records both as deviations with evidence — the
defence waiver document, in git form.

**Verdict: 4/5 — unchanged.**

## 6. Operations

**Them.** Sustainment: patching regimes, fielded-system monitoring,
configuration accounting across decades.

**Us (v2).**
- **Patching regime shipped**: monthly scheduled full-gate run including
  `cargo audit` (RustSec) and bun advisories, failing on critical —
  the sustainment cadence, minus the manual triage (CI summary carries
  the report).
- **Runtime configuration accounting shipped**: `/api/metrics` publishes
  circuit states, cache size, feed freshness — the fielded-system state
  query.
- Missing: **security patching SLA** (a documented "critical advisory →
  fixed within N days" commitment). One AGENTS.md line.

**Verdict: 3 → 4.**

## 7. Deployment

**Them (classical).** Certification before release; deviations documented.
**Them (modern).** Signed OTA manifests; staged field rollouts; automatic
rollback on health-signal failure.

**Us.** Atomic edge deploys, instant rollback to any retained version,
gated build as V&V evidence. Missing: **artifact signing** (cosign/
sigstyle) proving deployed bytes == built bytes. Cost: a signing key +
one CI step; the defence-grade increment.

**Verdict: 3 → 3.5.**

## 8. Security

**Them.** Zero-trust, accreditation, supply-chain tiers, hardware keys.

**Us (v2).** CSP allowlist, keyfile secrets, rate limiter (bounded,
tested), SBOM, monthly audits, documented attack surface (the feed
integrations). Missing: artifact signing; the admin surface is nil
(nothing to SSO).

**Verdict: 3 → 3.5.**

## What to steal next from defence (updated)

1. **Complexity ceiling in CI** — enable biome complexity rules with
   explicit per-rule limits. One config block.
2. **Security patching SLA** — "critical advisory → patched within 7
   days" in AGENTS.md. One line.
3. **Artifact signing** — sigstore/cosign on the WASM artifact + deploy
   manifest. Half a day.
4. **Lean 4 proofs for plycompute money math** (estate-side) — HHI bounds,
   weight-sum, non-negative variance. The defence formal-methods
   discipline pointed at the code humans act on.
5. **Postmortem directory** — promote the two ledger incident records
   into `docs/postmortems/` with the deviation-document structure.

## Scorecard summary (v2)

| Dimension | Defence | Us | Δ |
|---|---|---|---|
| Architecture security posture | 5 | 4 | — |
| Code quality standards | 5 | 4.5 | **+0.5** |
| Formal methods | 4 | 1 | — (estate-side target) |
| Configuration management | 5 | 4.5 | **+0.5** |
| Supply chain | 4 | 4.5 | **+1.5** |
| Sustainment | 4 | 4 | **+1** |
| Research evidence | 4 | 3 | — |

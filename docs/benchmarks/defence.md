# Benchmark: Defence & aerospace software

Archetypes: Lockheed Martin, RTX (Raytheon), Northrop Grumman (classical);
Anduril, Palantir (modern defense-tech). Public sources: DO-178C /
DO-326A, MISRA C guidelines, NIST SP 800-171 / CMMC, requirement-
traceability practice (DOORS), air-gapped development, ATO accreditation
culture; Anduril's "software-defined defense" engineering blog culture.

## 1. Architecture

**Them (classical).** Requirements-driven architecture: every component
traces to a requirement (DOORS), interfaces are frozen at baselines,
modules are certified independently, and redundancy is physical (two
computers, two code paths, voted outputs). Security architecture assumes
a hostile environment: air-gapped development networks, OT/IT separation,
deny-by-default everything.

**Them (modern, Anduril-style).** Devops practices imported into defence:
CI/CD for software-defined systems, containerized payloads, over-the-air
updates with signed manifests, feedback loops from fielded systems.

**Us.** Deny-by-default appears twice: the CSP `connect-src` allowlist
(every external origin enumerated; anything unlisted fails) and the
worker `security.ts` module. The static-first architecture is the
civilian cousin of air-gapping: the content plane (prerendered HTML)
cannot execute against the origin, the application plane (worker) is a
small auditable surface, and the data plane (KV) is versioned.

| Defence principle | Our analog |
|---|---|
| Deny-by-default network posture | CSP allowlist; worker security module |
| Small auditable surface | 2.2k-line worker, every module < 74 lines |
| Versioned, immutable artifacts | sha256-stamped dataset snapshots; atomic immutable deploys |
| Standards as checkable rules | AGENTS.md copy rules + traps; build integrity gate |
| Configuration management | Trunk + gated builds; every production artifact traceable to a commit |

**Match (4/5 architecture coherence for the security posture; 2/5 for
redundancy).** No redundancy: single origin, single maintainer. Defence
redundancy protects against physical failure modes this site does not
have (the edge network already replicates globally).

## 2. Code quality

**Them (classical).** MISRA C coding standards (a checkable rule set),
independent V&V teams (the people verifying are not the people writing),
static analysis as certification evidence, complexity ceilings per
function, and a culture where "the standard is the code review" is
replaced by "the standard is the tool output."

**Them (modern).** Anduril-style: move fast, but keep the audit trail;
tests as certification evidence; supply-chain SBOMs.

**Us.** Biome + tsc gates (the checkable-rule-set practice), the drift
report as supply-chain divergence evidence, and the gated build as
certification evidence. Missing: **complexity ceilings** — no tool
measures function complexity in CI (biome has the rule; it is not
configured). Missing: an **SBOM** — `packages/widgets` is Rust (cargo
tree could emit one) and the site has bun.lock (a de-facto SBOM), but
nothing generates or publishes one.

**Match (4/5).**

## 3. Stack

| Layer | Defence | Ours |
|---|---|---|
| Core languages | Ada/SPARK, MISRA C, C++ (modern: Rust) | Rust (WASM quant), TypeScript |
| Formal methods | SPARK proofs, model checking, Lean/Coq in research arms | **Estate has Lean 4 proof practice (clawdius); unused by this site** |
| Build reproducibility | Reproducible builds as requirement | Bun lockfile + cargo lock; not verified reproducible |
| Supply chain | SBOM mandatory, signed artifacts | bun.lock/cargo tree exist; no generated SBOM |

The formal-methods row is the honest gap with a real target: the estate
demonstrates Lean 4 capability (clawdius proofs run against a Lean LSP),
and the highest-value proof target near this site would be **plycompute's
risk and concentration math** (variance, Sharpe, HHI — pure functions,
ideal for property proofs). That is an estate-side project, not a
site-side one.

## 4. Research

**Them.** Applied research against TRL levels (technology readiness),
with documented evidence at each gate; and increasingly, academic-style
publication (Anduril papers, DARPA programs).

**Us.** The research outputs (ETF study, storm report) follow the
evidence-gate pattern loosely: claim → method → data → published. There
is no TRL-style staging, and none is needed — the storm report's honest
labels ("observational, not a forecast") do the same work.

**Match (3/5).**

## 5. Development workflow

**Them (classical).** Baselines and configuration management: nothing
ships that cannot be traced to an approved baseline; every deviation is
documented (deviations/waivers are formal documents).

**Them (modern).** Trunk dev with signed commits, but the audit trail
never closes.

**Us.** Every production artifact traces to a commit on gated main; the
ledger records deviations (the --no-verify commits each carry their
evidence + the queued re-verification that later closed). The deviation-
with-evidence pattern is genuinely practised — twice this month under
documented load, both later closed with full suites green.

**Match (4/5).**

## 6. Operations

**Them.** Sustainment organizations: patching regimes, fielded-system
monitoring, incident response with reporting obligations, configuration
accounting for decades.

**Us.** 6-hour probes, ledger-recorded incidents, and — the defence
practice worth stealing — **configuration accounting**: git + lockfiles +
the snapshot manifest already account for what is deployed. The gap:
patches. Dependency updates are manual and irregular (biome/tsc/astro
bump when touched). A scheduled dependency-audit workflow (cargo +
bun outdated, security advisories) would be the patching regime.

**Match (3/5).**

## 7. Deployment

**Them (classical).** Certification before flight: nothing ships without
V&V evidence; rollbacks are physical/spare parts.

**Them (modern, Anduril).** OTA updates with signed manifests, staged
field rollouts, automatic rollback on health-signal failure.

**Us.** Atomic edge deploys; every historical deployment version is
instantly revertible (Cloudflare retains all deployments). What defence
adds that we lack: **signed manifests**. The deploy could carry a
signature of the artifact hash (sigstore/cosign-style) — proving the
deployed artifact is the built artifact. Cost: a signing key + one CI
step. Value: real but low for a content site; high if the worker ever
handles anything sensitive.

**Match (3/5).**

## 8. Security

**Them.** The defining discipline. Zero-trust, accreditation (ATO),
CMMC supply-chain tiers, OT/IT separation, hardware keys, air-gapped
secrets.

**Us.** CSP allowlist, keyfile (0600) secrets outside the repo, no
secrets in git, a small auditable worker surface, public attack surface
documented by the third-party feed integrations. Missing: no signing, no
dependency-audit automation, no admin surface (nothing to protect with
SSO — the guestbook is rate-limited and ephemeral).

**Match (3/5).**

## What to steal from defence (concrete)

1. **Complexity ceiling in CI** — enable biome's complexity rules with
   explicit limits; defence's complexity ceilings as a merge gate.
2. **SBOM generation** — `cargo tree` + `bun pm ls` emitted as
   `docs/sbom.json` per build; one workflow step, certification-evidence
   practice at zero runtime cost.
3. **Dependency-audit workflow** — scheduled `cargo audit` + `bun
   outdated` + advisory check; the patching regime.
4. **Lean 4 proofs for plycompute money math** (estate-side) — property
   proofs over concentration (HHI ≤ 1, weights sum to 1) and risk
   functions. The defence formal-methods discipline applied where it
   buys real correctness.
5. **Postmortem files as evidence documents** — formalize the two build
   incidents into `docs/postmortems/` with deviation-style structure.

## Scorecard summary

| Dimension | Defence | Us | Note |
|---|---|---|---|
| Architecture security posture | 5 | 4 | Deny-by-default real; no redundancy needed |
| Code quality standards | 5 | 4 | Checkable rules; complexity ceiling missing |
| Formal methods | 4 | 1 | Estate has Lean capability, unused here |
| Configuration management | 5 | 4 | Full traceability; no SBOM/signing |
| Supply chain | 4 | 3 | Lockfiles real; no audit automation |
| Sustainment | 4 | 3 | Probes + ledger; no patching regime |
| Research evidence | 4 | 3 | Evidence-gated informally |

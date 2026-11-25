# Benchmark v2: Electronics & communication networks

Archetypes: Cisco/Juniper/Arista (network OS), Nokia/Ericsson (telecom),
embedded/RTOS vendors (Zephyr, VxWorks), silicon/RTL flows. Sources:
FRRouting/SONiC architecture, NETCONF/YANG + gNMI telemetry practice,
UVM/RTL verification culture, protocol fuzzing and conformance suites.

**v2 delta from v1:** **feed-freshness telemetry shipped** — the
management-plane "know the link state" practice is now real
(`feedLastSuccess` at `/api/metrics`, asserted in CI). Parser fuzzing is
partially adopted (quant kernels weekly; the dataset parser itself is
not fuzzed). The runbook and OpenAPI spec remain open.

## 1. Architecture

**Them.** Three planes, strictly separated: data plane (ASIC/NPU
forwarding), control plane (routing daemons), management plane
(NETCONF/YANG + telemetry). Protocol contracts are specifications with
conformance suites; backward compatibility is sacred (hitless upgrades).

**Us.** The three-plane separation is real and enforced:
- **Content plane**: prerendered HTML, immutable, edge-replicated (the
  data plane).
- **Application plane**: 2,221-line worker — cache, circuit breaker,
  connection pool, fetch, rate limiter, retry, security, Durable Object
  price stream (the control plane).
- **Configuration plane**: `themes.css` tokens, `jsrepo.config.mts`,
  `astro.config.mjs`, `biome.json` (the management plane) — a token-file
  change re-skins the system without touching the planes above. The v2
  theme-pipeline incident proved this plane works: one import line
  restored five themes.

**v2 management-plane addition:** `/api/metrics` `feedLastSuccess` is
streaming-telemetry in miniature — link-state for every external feed,
queryable, asserted in CI.

**Gap (unchanged):** protocol formalization. The `/api/*` surface has no
OpenAPI spec and the dataset has no schema version. At network-OS scale
that becomes existential; at one site it is a bounded gap with a known
fix.

**Verdict: 3 → 3.5.**

## 2. Code quality

**Them.** Parser robustness as religion: continuous fuzzing of every
protocol parser; memory safety via internal rules or Rust rewrites;
per-module coverage floors.

**Us (v2).**
- **Quant-kernel fuzzing now runs weekly in CI** (`fuzz.yml`: three
  cargo-fuzz targets over blackscholes/montecarlo/var, artifacts on
  crash) — the parser-robustness discipline applied to the money math.
- Still un-fuzzed: the **dataset JSON parser** (build-time study
  input) and the worker's request parsing. The `packages/widgets/fuzz`
  scaffolding exists; a dataset-parser target is the natural next
  target.
- The WASM `fuzz/` directory being present-but-unexercised (v1 finding)
  is resolved; a second one (dataset parser) is now the honest open
  item.

**Verdict: 2 → 3.**

## 3. Stack

| Layer | Elec/Comms | Ours |
|---|---|---|
| Data plane | ASIC/NPU | Prerendered HTML on edge |
| Control plane | FRRouting/SONiC daemons | TS worker with named modules |
| Management plane | NETCONF/YANG, gNMI | CSS tokens, jsrepo/cargo config, **`feedLastSuccess` telemetry (v2)** |
| Update model | Hitless ISSU | Atomic edge deploys |
| Validation | Protocol conformance suites + fuzz | E2E + axe + **quant fuzz (v2)**; dataset fuzz open |

## 4. Research

**Them.** Programmable data planes (P4), congestion-control algorithms,
IETF standards participation, protocol interoperability testing.

**Us.** The external-feed integrations (Binance WS, NOAA SWPC product
formats, unofficial Yahoo endpoints, mempool.space) are informal
interoperability engineering — v2 adds live state per feed. No standards
participation.

**Verdict: 2/5 — unchanged.**

## 5. Development workflow

**Them.** Release branches per hardware line, backport regimes across
5+ branches, lab validation before field deployment, simulation-first
development.

**Us.** Single trunk; gated build + E2E against the built dist before
deploy (lab-before-field analog); simulation-first does not apply (the
"hardware" is the edge runtime itself, and prod IS the lab for a
content site — rollback is instant).

**Verdict: 3/5 — unchanged.**

## 6. Operations

**Them.** Streaming telemetry (gNMI sub-second), automated rollback on
threshold breach, capacity forecasting, NOCs, documented alarms — every
alarm has a runbook entry.

**Us (v2).**
- **Feed-link state is now telemetry**: each external feed publishes
  last-success; staleness is asserted weekly-and-on-change by CI and
  queryable always.
- **The runbook is the top remaining steal.** Every alarm needs a
  documented meaning: probe endpoint → failure meaning → first
  diagnostic → escalation. `docs/runbook.md`, pure markdown.

**Verdict: 2 → 3.**

## 7. Deployment

**Them.** Hitless ISSU upgrades; canary line cards; protocol-flap
rollback.

**Us.** Atomic sessionless deploys — hitless by simpler construction;
instant rollback retained per version.

**Verdict: 3/5 — unchanged.**

## What to steal next from electronics/comms (updated)

1. **Runbook** — `docs/runbook.md`: probe endpoint → failure meaning →
   first diagnostic → escalation. Top remaining steal.
2. **Dataset parser fuzz target** — extend `packages/widgets/fuzz` (or
   the site's vitest) with a structured-mutation fuzzer for the dataset
   JSON path; adopt the conformance-suite mindset for the study input.
3. **OpenAPI spec for `/api/*`** — formal interface document; enables
   future conformance tests and third-party integration.
4. **Dataset schema version + JSON-schema validation in CI** — the
   `validkit` estate crate is the reference implementation.
5. **Alarm-severity mapping** — the probe matrix gains severity labels
   (content-plane down = critical; feed stale = warning), matching how
   network ops classifies link vs node alarms.

## Scorecard summary (v2)

| Dimension | Elec/Comms | Us | Δ |
|---|---|---|---|
| Plane separation | 5 | 3.5 | **+0.5** |
| Parser robustness | 5 | 3 | **+1** |
| Interface specification | 5 | 2 | — |
| Research (interop) | 4 | 2 | — |
| Workflow | 3 | 3 | — |
| Operations | 5 | 3 | **+1** |
| Deployment | 3 | 3 | — |

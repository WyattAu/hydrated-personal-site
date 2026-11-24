# Benchmark: Electronics & communication networks

Archetypes: Cisco/Juniper/Arista (network operating systems), Nokia/
Ericsson (telecom infrastructure), embedded/RTOS vendors (Zephyr,
VxWorks), silicon teams (RTL/ASIC flows). Public sources: network OS
architecture talks (FRRouting, SONiC), protocol conformance practice,
gNMI telemetry, RTL verification (UVM) literature, hardware-in-the-loop
testing culture.

## 1. Architecture

**Them.** The network-OS pattern: a strict separation between the control
plane (routing decisions), the data plane (packet forwarding, often ASIC/
NPUs), and the management plane (configuration, telemetry). Interface
contracts are protocols — defined, versioned, conformance-tested against
specifications, with fuzzing for parser robustness. Backward compatibility
is sacred: a router upgrade must not drop existing sessions.

**Us.** A three-plane pattern exists in miniature:
- **Content plane** (prerendered HTML): the data plane — immutable,
  edge-cached, globally replicated.
- **Application plane** (the worker): the control plane — 2.2k lines of
  named modules deciding how requests are served.
- **Configuration plane** (themes.css tokens, jsrepo/cargo config): the
  management plane — a token-file change re-skins the entire system
  without touching the planes above.

The protocol-contract analog: the worker's `/api/*` surface and the
dataset schema are the protocols. The dataset schema has no version field
(it needs one — see lft.md), and the API surface has no OpenAPI
specification. Protocol conformance testing exists only for the site's
own E2E assertions (status codes, stylesheet presence, console hygiene).

**Match (3/5).** The plane separation is real and disciplined; the
protocol formalization (specs, conformance suites, versioning) is
absent — and absent because the protocol surface is tiny (a handful of
endpoints). At network-OS scale it becomes existential; here it is a
known gap with a known fix (an OpenAPI spec for `/api/*`).

## 2. Code quality

**Them.** Parser robustness as a religion: fuzzers run continuously
against every protocol parser (a malformed packet must never crash a
router), memory safety in C is managed with MISRA-like internal rules or
rewritten in Rust/Go, and code coverage targets exist per module.

**Us.** The dataset parser (build-time JSON → study) and the worker's
request parsing are the two parsers. No fuzzing exists. The estate has
`validkit` (validation) and the WASM crate has a `fuzz/` directory
(checked: `packages/widgets/fuzz` exists — cargo-fuzz scaffolding is
present!). The fuzz targets, if any, are unexercised in CI.

**Match (2/5).** The fuzz directory existing but unexercised in CI is
exactly the electronics pattern of "conformance suite written but not
run in the pipeline."

## 3. Stack

| Layer | Elec/Comms | Ours |
|---|---|---|
| Data plane | ASIC/NPU forwarding | Prerendered HTML on Cloudflare edge |
| Control plane | FRRouting/SONiC control daemons | 2.2k-line TypeScript worker |
| Management plane | NETCONF/YANG, gNMI telemetry | CSS token files + jsrepo/cargo config |
| Observability | Streaming telemetry (gNMI), sFlow | 6-hour HTTP probes (liveness only) |
| Update model | Hitless upgrades, ISSU | Atomic edge deploys |

The **hitless upgrade (ISSU)** row is the closest match: network OSes
must upgrade without dropping sessions; Cloudflare Pages deploys are
atomic and sessionless — the same guarantee by simpler construction.
The **streaming telemetry** row is the gap (shared with FAANG ops).

## 4. Research

**Them.** Silicon research (P4 programmable data planes, congestion
control algorithms), standards participation (IETF drafts), and protocol
interoperability research.

**Us.** The OSINT feed integrations are protocol-adjacent research:
integrating Binance WS, NOAA SWPC products, Yahoo (unofficial), and
mempool.space with documented degradation behavior is interoperability
work. No standards participation (obviously).

**Match (2/5).**

## 5. Development workflow

**Them.** Long-lived branches per hardware release, backport regimes
(security fixes backported across 5+ release branches), lab validation
before field deployment, and simulation-first development (most network
code is developed against simulated ASICs).

**Us.** Single trunk; the "lab before field" analog is the gated build +
E2E before deploy (done); the "simulation-first" analog is the E2E suite
running against the built dist on a local server before production
(done). No backport regimes — every deploy is current-main (single-line
of development, correct for one operator).

**Match (3/5).**

## 6. Operations

**Them.** The gold standard of the verticals compared here: streaming
telemetry with sub-second granularity, automated rollback on threshold
breach, capacity forecasting, RMA/failure-analysis loops for hardware,
and NOCs running 24/7.

**Us.** Probes. The gap analysis is identical to the FAANG ops section
(2/5) with one additional nuance from this vertical: **failure-mode
documentation**. Network engineers document every alarm's meaning; the
site's alarms (uptime probe failures) have no documented runbook. A
`docs/runbook.md` mapping each probe endpoint to its failure meaning and
first diagnostic step is pure documentation with real operational value.

## 7. Deployment

**Them.** Hitless ISSU upgrades, canary line cards, maintenance windows,
rollback on protocol flap.

**Us.** Atomic deploys (equivalent guarantee, simpler construction), no
windows needed.

**Match (3/5).**

## What to steal from electronics/comms (concrete)

1. **Exercise the fuzz targets** — `packages/widgets/fuzz` exists but is
   not in CI. One workflow step running `cargo fuzz` for a fixed duration
   (even 60s) on the JSON parsing entry points would adopt the vertical's
   core robustness discipline where the risk actually is (public data
   parsing).
2. **OpenAPI spec for the worker API** — document `/api/*` routes as an
   OpenAPI document; the electronics practice of formal interface specs,
   enabling future conformance tests.
3. **Dataset schema version + validation** — a version field plus a
   JSON-schema validation step in CI (the `validkit` estate crate is the
   reference). Parsers must never trust unversioned input.
4. **Runbook** — `docs/runbook.md`: each probe endpoint → what failure
   means → first diagnostic → escalation. Pure markdown, real ops value.
5. **Feed-freshness telemetry** — the MFT staleness idea, but framed the
   comms way: each external feed is a "link" with an alarm state, and
   stale = alarm. One status JSON consumed by the widgets.

## Scorecard summary

| Dimension | Elec/Comms | Us | Note |
|---|---|---|---|
| Plane separation | 5 | 3 | Content/app/config planes real; protocol formalization absent |
| Parser robustness | 5 | 2 | Fuzz scaffolding exists, unexercised |
| Interface specification | 5 | 2 | No API spec, no schema version |
| Research (interop) | 4 | 2 | Feed integration is informal interoperability |
| Workflow | 3 | 3 | Lab-before-field analog practiced |
| Operations | 5 | 2 | Liveness only; no runbook, no telemetry |
| Deployment | 3 | 3 | Atomic/sessionless = hitless by simpler means |

# Benchmark: FAANG-scale web engineering

Archetypes: Google, Meta, Netflix, Amazon (consumer web platform orgs).
Public sources: SRE book/error-budget culture, monorepo + trunk-based
development writeups, Meta's testing pyramid materials, Netflix chaos
engineering papers, Amazon's operational-readiness reviews.

## 1. Architecture

**Them.** Service-oriented at massive scale: hundreds of microservices
behind edge load balancers, multi-region active-active, cell-based
architectures (blast-radius isolation), every dependency assumed fallible,
back-pressure and bulkheads as first-class citizens. Frontends: server-
rendered frameworks with edge CDN, design-system packages consumed
through versioned registries (Meta: Dotskul/its own; Google: internal
component frameworks).

**Us.** Static-first edge architecture: Astro 5 islands (SolidJS 1.9) on
Cloudflare Pages, a 2.2k-line TypeScript edge worker (named modules:
cache, circuit-breaker, connection-pool, fetch, rate-limiter, retry,
security, a Durable Object price stream), Rust→WASM quant widgets
(7.1k lines) fed by plychart estate crates, KV for state (aurora history,
data snapshots), no server-rendered app layer at all.

**Match (4/5).** The architectural *virtues* map directly:

| FAANG virtue | Our practice |
|---|---|
| Blast-radius isolation | Static content cannot go down with the app; the worker is the only mutable runtime |
| Assume dependencies fail | Circuit-breaker + retry modules; widget error states swallow live-feed outages (verified in E2E console-error filter) |
| Edge-first delivery | Cloudflare edge cache, immutable asset headers, 418-item registry |
| Design system as package | 5-theme token contract, quiet-label system, fx components via registry |

**Gap.** Cell-based isolation and multi-region failover are absent —
correctly absent: a single-origin static site has no cells to lose. The
FAANG architecture exists to coordinate thousands of engineers; adopting
it here would be negative-value complexity.

## 2. Code quality

**Them.** Mandatory pre-merge review (readability certifications at
Google), static analysis as merge blocks (Tricorder/Infer), style
ownership per directory, generated-code policies, dead-code vacuuming as
scheduled work.

**Us.** Biome lint/format gates, `tsc --noEmit` strict, a copy-rule set
enforced by convention (AGENTS.md), a build integrity gate (stylesheet
present per page, single-flight flock), a drift report for vendored code
(17→0 after reconciliation), and a documented dogfood ledger with three
rejections. No human review exists — the gates *are* the review.

**Match (4/5).** The gap is not enforcement but *review bandwidth*: one
maintainer plus bound agents is a single-reviewer system. The estate's
236 repos provide implicit peer review only when the estate audit sweeps.

## 3. Stack

| Layer | FAANG typical | Ours | Verdict |
|---|---|---|---|
| Frontend framework | React/next-gen internal frameworks, SSR | Astro 5 + SolidJS 1.9 islands | Deliberate: static-first beats SSR for this workload |
| Styling | CSS-in-JS or internal systems, design tokens | Tailwind 4 + a 5-theme token contract (one accent voice per theme) | Token discipline matches; scale differs |
| Runtime compute | JVM/Go/C++ fleets | Cloudflare Workers (V8 isolates) + Rust→WASM | WASM quant compute is *stronger* than typical FAANG frontend |
| State | Distributed DBs, caches | KV + Durable Objects (price stream) | Right-sized |

## 4. Research

**Them.** A/B experimentation platforms with sequential testing, perf
research teams, accessibility research orgs.

**Us.** Original data research: the ETF allocation study and the G1 storm
first-hand report (r = 0.79 against the official Kp index over 45 aligned
points) are small-scale but *original, reproducible, and public* — the
research discipline of publishing methodology alongside findings is
present (3/5). Missing: experiment infrastructure (no A/B, no holdouts) —
also arguably unnecessary for a personal site.

## 5. Development workflow

**Them.** Trunk-based, small diffs, feature flags, automated canary
analysis, merge queues.

**Us.** Single-writer trunk, the validation ladder (tsc → biome → gated
build → E2E → deploy → prod verify), single-flight build locks (flock) to
stop concurrent-agent build races, and an AI-agent contract (AGENTS.md:
copy rules, traps, dogfood ledger) that functions as the contribution
guide. The missing "small diffs" enforcement is real: rounds ship 15-file
commits.

## 6. Operations

**Them.** SRE: SLOs, error budgets, on-call rotations, blameless
postmortems, observability as a product (metrics/logs/traces), chaos
engineering.

**Us (2/5 — the weakest dimension).** 6-hour uptime probes across 4
endpoints (liveness, not observability), a runner-health smoke workflow,
no metrics, no traces, no structured logs, no alerting pager. The
honesty: nothing here has an SLO because nothing here has a paying
customer. The estate's `otelkit`/`metrics-kit` make a real observability
slice a weekend's work: an OpenTelemetry trace on the worker fetch path
and a structured-log line per request would move this to 4/5.

## 7. Deployment

**Them.** Progressive delivery: canary percentages, region-by-region
rollout, instant rollback SLAs, deployment freezes.

**Us (3/5).** Atomic edge deploys with instant rollback (Cloudflare
Pages), a deploy workflow in CI, plus a GitHub Pages mirror kept
deliberately dormant with canonical consolidation. Missing: pre-deploy
staging (prod-verify is the staging), and the Forgejo Actions runner
presence is unconfirmed — deploy today is manual wrangler with
credentials from a keyfile. The runner + secrets lever would close this.

## 8. Security

**Them.** Threat modeling, SSO everywhere, dependency scanning, bug
bounties, pen tests, hardware keys.

**Us (3/5).** CSP meta with an explicit connect-src allowlist, a
`security.ts` worker module, secrets in a 0600 keyfile directory outside
the repo, no secrets in git (gitleaks available fleet-side), dependency
updates by renovate-style bumps. Missing: SSO (nothing to protect — no
admin surface), no pen test (correctly deferred for a content site).

## What to steal from FAANG (concrete)

1. **CI-enforced performance budgets** — Lighthouse/Web Vitals gate in
   ci.yml with ceilings (e.g., LCP < 1.2s mobile, WASM bundle < 200 KB).
   Cheap, permanent, FAANG's perf-regression discipline at our scale.
2. **axe-core accessibility gate** — extend the existing accessibility
   spec into a hard CI gate with zero serious violations.
3. **A minimal error budget** — define the uptime probe's SLO (e.g., 6
   probes/day, 99.5% monthly) and surface a status line; turn liveness
   into a measurable.
4. **Postmortem files for real incidents** — the build-race and
   path-dependence incidents already happened; writing them as
   `docs/postmortems/` entries (trigger, root cause, fix, gate added)
   would formalize what was actually practiced.

## Scorecard summary

| Dimension | Them | Us | Note |
|---|---|---|---|
| Architecture coherence | 5 | 4 | Right-sized; static-first is a feature |
| Code quality enforcement | 5 | 4 | Gates replace review; one reviewer |
| Testing discipline | 5 | 4 | 367 tests; no coverage gate |
| Research rigor | 5 | 3 | Original + reproducible, no experimentation platform |
| Development workflow | 5 | 4 | Trunk, no small-diff enforcement |
| Operations | 5 | 2 | Liveness only — the real gap |
| Deployment | 5 | 3 | Atomic edge; no runner-confirmed CI |
| Security | 5 | 3 | Solid basics; no admin surface to protect |

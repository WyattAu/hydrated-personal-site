# Benchmark: LFT (low-frequency / long-horizon asset management)

Archetypes: BlackRock (Aladdin), Vanguard, Fidelity, Norges Bank
Investment Management. Public sources: Aladdin platform descriptions,
fund-industry operational-resilience regulations (MiFID II, SEC 17a-4,
DORA), buy-side data-governance practices, ITIL-adjacent operations
culture.

## 1. Architecture

**Them.** Monolithic core platforms (Aladdin is a single risk/analytics
platform spanning front office to operations) with strict module
boundaries, decades of accumulated domain logic, vendor integrations
(Bloomberg, Refinitiv, custodians), and a hard separation between
research, portfolio management, and operations systems. Longevity is a
design goal: interfaces survive decades, data schemas are versioned
forever.

**Us.** Static-first edge site with a quant layer. There is no shared
platform — but the longevity practices *do* appear in miniature:
- Dataset schema stability: the 89-fund ETF database's shape
  (`ticker/name/category/sector_allocation/region_allocation/
  top_holdings`) has not changed since publication, and downstream
  consumers (the build-time study, third parties) depend on it.
- Quarterly snapshots with sha256 stamps: immutable series, append-only
  history — LFT's "data is never mutated, only versioned" practice.
- The 5-theme token contract: interfaces designed so that changing the
  theme is a token-file change, not a code change.

**Match (3/5).** The longevity instinct is present; the formal versioning
discipline (semver'd schemas, migration tests) is not — the dataset has
no schema version field at all. Adding one (`schema_version: 1`) is a
one-line change with decades of payoff.

## 2. Code quality

**Them.** Heavy review, conservative dependencies (vendors patch on
vendor schedules), long-lived modules with deprecation windows measured
in years, and a culture where "boring" is a compliment.

**Us.** Biome gates, strict TypeScript, conservative runtime surface
(no exotic runtime features), and — genuinely LFT-like — a **bias toward
boring**: static hosting, flat JSON, no database in the read path, no
client-side state framework. The site's most load-bearing components are
the least exciting ones, which is the point.

**Match (3/5).**

## 3. Stack

| Layer | LFT | Ours |
|---|---|---|
| Core platform | Aladdin-scale risk/analytics suite | Astro + Solid + Rust-WASM quant layer |
| Data governance | Data stewardship, lineage, quality SLAs | sha256-stamped snapshots, keyless publication, build-time recomputation |
| Vendor integration | Bloomberg/Refinitiv feeds | NOAA SWPC, Binance WS, Yahoo proxy, mempool.space |
| Client layer | Desktop terminals, web portals | Static pages + islands |

The feed-integration row is the real overlap: both integrate external
market/weather data with staleness handling (ours: N/A on failure,
error states E2E-verified). The governance row is where we copied the
practices that matter at our scale.

## 4. Research

**Them.** Long-horizon empirical research with regulatory-grade audit
trails: every number in a client report is traceable to source data with
timestamps. Model changes go through model-risk validation.

**Us.** The same traceability chain now exists at document scale:
dataset (public JSON) → build-time recomputation → published study page
→ quarterly snapshot (sha256) → manifest. The G1 storm report traces its
series to the public KV monitor and its correlation to NOAA's public
product, with the method written out. What LFT has that we lack: formal
model-risk sign-off — irrelevant for descriptive studies, relevant if a
study ever made a predictive claim (none does; the storm report is
explicitly "observational, not a forecast").

**Match (3/5).**

## 5. Development workflow

**Them.** Change-approval boards, CAB meetings, segregation of duties,
release trains measured in weeks, scheduled maintenance windows.

**Us.** Single-writer trunk with validation-ladder gates and
single-flight locks. The *function* of LFT's change control (nothing
ships untested, nothing ships on a whim) is achieved by gates instead of
meetings. The honest difference: LFT's process protects against
organizational error; here there is no organization.

**Match (3/5).**

## 6. Operations

**Them.** Operational-resilience regulations (DORA in the EU) mandate
incident reporting, third-party risk management, and business-continuity
testing. ITIL incident/problem/change flows.

**Us.** Uptime probes (6h × 4 endpoints), runner smoke test, and
documented postmortem-adjacent notes in the ledger (the build-race
incident has trigger, root cause, fix, and the gate it added). The DORA
concept that transfers at zero cost: **third-party dependency register**
— the site depends on NOAA, Binance, Yahoo (unofficial), mempool.space,
worldbank, restcountries, unpkg fonts, Cloudflare — a documented list of
which third parties can break which page surfaces would be the LFT
third-party-risk register in miniature. The drift report + E2E
console-error filter already *detect* third-party breakage; the register
would document it.

**Match (3/5).**

## 7. Deployment

**Them.** Scheduled releases, maintenance windows, multi-approval,
rollback plans documented in advance.

**Us.** Continuous atomic deploys with instant rollback. LFT would call
this reckless; for a stateless static site it is strictly safer than a
maintenance window (no session state to corrupt, no transactions to
abort). The rollback plan LFT documents in advance is here: redeploy the
previous production version hash (Cloudflare keeps every deployment
instantly revertible).

**Match (3/5).**

## What to steal from LFT (concrete)

1. **Schema version field on the dataset** — `schema_version: 1` in
   etf-database.json, bumped on any breaking shape change; the build-time
   study asserts it before computing. One line, decades of protection.
2. **Third-party dependency register** — `docs/dependency-register.md`
   mapping every external feed/CDN to the page surfaces it can break and
   the degradation behavior. Pure documentation; makes incidents
   one-lookup instead of one-archaeology.
3. **Data dictionary** — the ETF database's fields deserve a published
   field dictionary (what `sector_allocation` weights mean, source and
   as-of semantics per field). LFT's data-governance catalogs are this at
   scale; ours is one markdown page and would make the dataset more
   citable.
4. **Quarterly ops review as a checklist run** — uptime probe results,
   drift report, snapshot manifest integrity, dependency updates. An
   hour a quarter, replacing ITIL with a checklist.

## Scorecard summary

| Dimension | LFT | Us | Note |
|---|---|---|---|
| Architecture longevity | 5 | 3 | Stability instinct present; no schema versioning yet |
| Code quality | 3 | 3 | Same bias-to-boring |
| Data governance | 4 | 3 | Snapshots + manifest real; no schema version/dictionary |
| Research traceability | 4 | 3 | Full chain at document scale; no formal sign-off (n/a) |
| Workflow | 3 | 3 | Gates replace CAB — correct for one operator |
| Operations | 4 | 3 | Probes + ledger; no third-party register yet |
| Deployment | 3 | 3 | Both defensible for their contexts |

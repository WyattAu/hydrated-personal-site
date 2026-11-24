# Parity Resolution Roadmap

Resolves the seven actionable gaps identified in
[README.md](README.md) (synthesis) and detailed per-vertical in the
benchmark files. Each gap gets: current state (evidence), target state
(acceptance criteria), plan, and effort. Sequencing follows the batch
model at the bottom.

Guiding constraints (from the do-not-chase list): no new runtime
platforms, no organization-shaped process, no third-party observability
vendors. Everything here is in-repo or estate-repo work executable by
the current operator + agents.

## Gap 1 — Observability (weakest: 2/5)

**Current state.** Liveness only: a 6-hour probe matrix over 6 endpoints
(uptime.yml). No metrics, no traces, no structured logs, no latency
measurement, no staleness detection on external feeds.

**Target state.**
- Every worker request emits one structured JSON log line (route, status,
  duration_ms, cache hit/miss, feed name if proxied).
- Workers Observability enabled in `worker/wrangler.toml` (native, zero
  code — dashboard gives invocation metrics + logs tail).
- A `/api/metrics` route exposing counters (requests, cache hits, rate
  limit rejections, feed errors) aggregated in the Durable Object.
- Feed-freshness telemetry: each external feed (NOAA, Binance WS, Yahoo,
  mempool, worldbank) publishes its last-success timestamp; a cron job
  (uptime.yml extension) asserts freshness and fails loudly on stale.
- The probe matrix gains a latency ceiling assertion (p95 < 500 ms per
  endpoint).

**Plan.**
1. Enable Workers Observability in wrangler.toml (one line).
2. Write `worker/src/log.ts`: structured logger (JSON line, constant
   fields). Replace ad-hoc logging.
3. Thread duration measurement through the fetch handler.
4. Add counters to the existing Durable Object; expose `/api/metrics`.
5. Extend uptime.yml: freshness assertions + latency ceiling.
6. Document the SLO: 99.5% probe pass rate monthly, p95 < 500 ms.

**Acceptance.** A probe failure or stale feed is visible in two places
(CI failure + metrics endpoint) without reading dashboards manually.
**Effort:** ~1 day. **Estate reference:** `metrics-kit` (semantics),
`otelkit` (Rust — documented reject for WASM/worker context: OTel SDKs
do not fit the edge isolate model; native Workers observability is the
correct tool).

## Gap 2 — Rate limiter stub (13 lines, unbounded Map)

**Current state.** `worker/src/rate-limiter.ts`: fixed-window counter in
an in-isolate `Map`. Two defects: (a) isolate-local state resets on
eviction (limits are approximate), (b) **the Map never evicts entries**
— every unique IP adds a permanent entry: an unbounded memory growth
vector and a slow leak.

**Target state.**
- Sliding-window limiter with lazy eviction (drop expired entries on
  access + a size cap with oldest-first eviction).
- Applied to the mutating and proxy routes (guestbook POST, feed
  proxies), not to static content.
- Limits documented in AGENTS.md (requests/minute per route class).
- Unit tests: burst rejection, window reset, eviction under pressure.

**Plan.**
1. Rewrite `rate-limiter.ts` as a sliding-window limiter with a bounded
   LRU-ish map (size cap 10k, evict-on-insert).
2. Wire into the worker fetch handler for mutating/proxy routes.
3. Unit tests (vitest, worker environment).
4. Document limits + the approximate-across-isolates caveat.

**Acceptance.** A test proves burst rejection + eviction; AGENTS.md
documents limits. **Effort:** half a day. **Estate reference:**
`ratelimit` repo (Rust — reference semantics; the worker is TS, so the
crate itself does not apply).

## Gap 3 — Fuzz targets exist, never run

**Current state.** `packages/widgets/fuzz/` contains three cargo-fuzz
targets over exactly the right math (`fuzz_blackscholes`,
`fuzz_montecarlo`, `fuzz_var`) — written, never wired into CI.

**Target state.**
- A scheduled fuzz workflow (weekly + on quant-kernel changes): nightly
  toolchain, cargo-fuzz build, 5-minute run per target.
- Crashes upload the failing input as an artifact; any crash fails the
  run.
- Zero open crashes as standing policy.

**Plan.**
1. `fuzz.yml` workflow: nightly toolchain (`dtolnay/rust-toolchain@nightly`),
   `cargo install cargo-fuzz`, run the three targets with `-max_total_time=300`.
2. Trigger: schedule weekly + paths filter on `packages/widgets/src/quant/**`.
3. Fix whatever the first run finds (if anything — the math is
   plycompute's and upstream-tested).

**Acceptance.** Weekly fuzz runs green with artifacts on crash.
**Effort:** half a day (mostly CI plumbing + nightly toolchain install
time).

## Gap 4 — No performance budget gate

**Current state.** Core Web Vitals are implicitly good (static-first,
edge-cached, AVIF/WebP images, subset fonts) but nothing enforces them.
The WASM bundle is 567 KB raw / 225 KB gzipped with no ceiling.

**Target state.**
- Budgets in CI: WASM raw ≤ 650 KB and gzipped ≤ 260 KB; homepage LCP
  ≤ 1.8 s (mobile emulation); total page weight ≤ 1.2 MB; zero console
  errors (already asserted).
- Failures block CI.

**Plan.**
1. Add size assertions to the gated build script (after the WASM build:
   `stat` + threshold compare — pure shell, zero new tooling).
2. Add a Lighthouse CI step (`lhci autorun`) against the e2e server's
   dist with a budgets file (performance ≥ 0.9, LCP, CLS, weight).
3. Record current values as the baseline in the budget file; tighten
   only deliberately.

**Acceptance.** Budget file + red build on regression.
**Effort:** half a day (LHCI chrome setup on the runner is the only
fiddly part).

## Gap 5 — No SBOM / dependency-audit workflow

**Current state.** Lockfiles exist (bun.lock, Cargo.lock, fuzz
Cargo.lock) but no generated SBOM, no advisory checking, and dependency
updates are manual and irregular.

**Target state.**
- `docs/sbom.json`: CycloneDX-format SBOM generated per build from both
  lockfiles.
- A monthly audit workflow: `cargo audit` (RustSec advisories, prebuilt
  cargo-deny or cargo-audit binary), Bun advisory check, results posted
  as the workflow summary; critical advisories fail.
- Patching regime: the audit workflow is the reminder; remediation is a
  normal gated round.

**Plan.**
1. `scripts/generate-sbom.mjs` — parse bun.lock + `cargo tree` output
   into CycloneDX JSON (no third-party tool needed; the formats are
   simple).
2. Wire into the gated build (emit + commit-if-changed).
3. `audit.yml` workflow: monthly; cargo-audit binary + bun audit;
   summary + fail-on-critical.
4. Register the audit in AGENTS.md's sustainment notes.

**Acceptance.** SBOM in docs, monthly advisory report, critical = red.
**Effort:** half a day.

## Gap 6 — No lineage enforcement (studies ↔ snapshot hashes)

**Current state.** The snapshot manifest records sha256 per quarter, and
the studies claim derivation from the dataset — but nothing *binds* the
claim. The manifest documents; it does not enforce.

**Target state.**
- The ETF study page embeds its dataset hash at build time
  (`<meta name="x-dataset-sha256">` or a visible citation line:
  "computed from etf-database.json @ sha256:4c5d927fa4d40ed4").
- A vitest lineage test: recompute the current dataset hash → assert it
  equals the study page's embedded hash → assert the manifest records a
  snapshot with that hash (or the dataset is newer than the latest
  snapshot, which fails until a snapshot is taken).
- The G1 storm report gets the same chain against its KV series.

**Plan.**
1. Study page: compute sha256 in frontmatter, render the citation line.
2. `tests/unit/lineage.test.ts`: the three assertions above.
3. Snapshot script gains a `--check` mode (exit non-zero if the dataset
   hash is un-snapshotted) wired into CI before the study test.

**Acceptance.** Deleting a snapshot or changing the dataset without
re-snapshotting turns the suite red. **Effort:** half a day. This is
the MFT lineage principle converted from documentation into
enforcement — the cheapest high-value item on the roadmap.

## Gap 7 — Accessibility tested but not gated

**Current state.** One accessibility spec (structural checks: lang,
alt text, labels, focus, skip links) + an explicit homepage chunk. No
axe-core, no hard violation gate.

**Target state.**
- axe-core (`@axe-core/playwright`) runs on every key page; violations
  at serious/critical severity fail CI; moderate/minor are reported.
- Violations are fixed to zero (the new design is clean paper + quiet
  labels; expect a small list: contrast on muted text in dark themes,
  the hamburger target size).

**Plan.**
1. Extend the accessibility spec with axe scans (five pages, default
   ruleset, disable rules only with documented reasons).
2. Fix findings to zero serious/critical.
3. The spec is already in CI — the gate arrives with the assertions.

**Acceptance.** Zero serious/critical axe findings on all five pages,
enforced in CI. **Effort:** half a day including fixes.

## Sequencing

Four batches, ordered so each batch's outputs are shipped and verified
before the next starts:

| Batch | Contents | Effort | Unlocks |
|---|---|---|---|
| **B1 — Gates** (cheap, immediate) | Gap 4 (size budget), Gap 6 (lineage), Gap 7 (axe gate), Gap 3 (fuzz workflow) | ~1.5 days | Four CI gates live; enforcement culture complete |
| **B2 — Runtime hardening** | Gap 2 (rate limiter rewrite) | ~0.5 day | The unbounded-map leak closed; mutating routes guarded |
| **B3 — Observability** | Gap 1 (logging, metrics route, freshness telemetry, SLO) | ~1 day | The weakest dimension becomes 4/5 |
| **B4 — Supply chain** | Gap 5 (SBOM + audit workflow) | ~0.5 day | Patching regime live; certification evidence |

Total: ~3.5 days of focused work. B1 first because gates are cheap and
make every later batch's regressions visible. B3 last of the code
batches because observability is best measured *after* the limiter
changes the request path.

## Post-parity state

With all seven resolved, the practice-parity matrix moves: operations
2→4, code quality 4→4.5 (fuzz + budgets), supply chain 3→4 (SBOM +
audit), testing 4→4.5 (lineage + axe), security 3→4 (limiter + audits).
Overall practice-parity: 3.8 → **~4.4**. The remaining half-point is
team-scale practice (review bandwidth, on-call, experimentation
platforms) that is scope-inherent and permanently out of scope by
design.

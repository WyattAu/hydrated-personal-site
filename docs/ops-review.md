# Quarterly Operations Review — checklist

Run once per quarter (or after any major incident). One hour. Each item
is a command or a file check; record the date and result at the bottom.

## 1. Gates

- [ ] `git ls-remote origin main` == local HEAD (both remotes synced)
- [ ] `bunx vitest run` — all unit tests green (expect 236+)
- [ ] `bun scripts/fx-drift-check.mjs` — drifted=0 (or reconciled)
- [ ] `bunx vitest run tests/unit/lineage.test.ts` — lineage green
      (dataset hash snapshotted)
- [ ] `ls docs/sbom.json` — SBOM present; component count recorded
- [ ] WASM size under ceiling: `stat -c%s packages/widgets/pkg/hydrated_widgets_bg.wasm` < 650000

## 2. Data products

- [ ] `curl -s https://wyattau.com/api/metrics` — feedLastSuccess fresh
      for all feeds (no feed older than 48h)
- [ ] Quarterly snapshot taken: `bun scripts/snapshot-dataset.mjs`
      (run in apps/site; commit if new)
- [ ] Snapshot manifest schema_version current
- [ ] ETF study lineage citation matches latest snapshot hash

## 3. Uptime & probes

- [ ] `.forgejo/workflows/uptime.yml` last scheduled run green
- [ ] `.forgejo/workflows/crawlkit.yml` last run green
- [ ] `.forgejo/workflows/snapshot.yml` enabled (quarterly cron)
- [ ] `.forgejo/workflows/fuzz.yml` last run green, no crash artifacts

## 4. Benchmarks re-sweep

- [ ] Re-read `docs/benchmarks/README.md` matrix; adjust scores for any
      new practice or regression
- [ ] Scan each vertical's "what to steal" list: promote any item worth
      doing into a round

## 5. SEO re-sweep (quarterly cadence from SEARCH_STANDARDS_SWEEP.md)

- [ ] `bun apps/site/scripts/seo-crawl.mjs` regenerate datasets
- [ ] Verify sitemap + llms.txt current
- [ ] IndexNow resubmit after any content ship

## Record

| Date | Gates | Data | Uptime | Benchmarks | SEO | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |

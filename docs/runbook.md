# Runbook

Every probe endpoint, what failure means, the first diagnostic, and
escalation. Severity: **critical** = content plane down; **major** =
application plane degraded; **warning** = data freshness lost.

## Probes (uptime.yml — every 6 hours)

| Probe | Failure meaning | First diagnostic | Severity |
|---|---|---|---|
| `https://wyattau.com/` | Content plane down: Pages deployment broken, DNS/edge failure, or build shipped empty | `curl -sI https://wyattau.com/` — 404 = bad deploy (redeploy last good); 5xx = edge issue; DNS fail = zone issue | Critical |
| `https://wyattau.com/api/health` | Worker down or route broken: deploy of worker failed, or isolate crash loop | `curl -s https://wyattau.com/api/health` — check body vs `{"status":"ok"}`; redeploy worker (`cd worker && bunx wrangler deploy`) | Critical |
| `https://wyattau.com/api/crypto-ticker` | Binance feed or worker proxy broken. Circuit breaker may be open serving stale | `curl -s https://hydrated-worker.wyatt-au.workers.dev/api/crypto-ticker` — worker direct vs proxied distinguishes Pages-proxy vs upstream failure | Major |
| `https://wyattau.com/world` | Page missing/broken (build shipped empty, or JS chunk 404) | Load locally: `bun scripts/../e2e-server` + check `dist/world/index.html` exists | Critical |
| `https://wyattau.com/etf` | Page missing/broken | Same as /world | Critical |
| `https://wyattau.com/favicon.svg` | Static asset pipeline broken | Check `dist/favicon.svg` exists; check build output | Major |

## Data freshness alarms (/api/metrics → feedLastSuccess)

| Feed stale | Meaning | Action |
|---|---|---|
| SWPC | NOAA feed down or product format changed | Check `curl -s https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json` manually; if format changed, patch the consuming widget |
| Binance | WS stream dropped or proxy circuit open | Check circuit-breaker states in /api/metrics; reset by worker redeploy if stuck open |
| Yahoo (worker proxy) | Unofficial endpoint rate-limiting or blocked | Expect intermittent; escalate only if stale > 24 h |
| mempool.space | Feed down | Check feed directly; intermittent OK |

## Known traps (from incidents)

1. **CSS bundle missing theme blocks** — if the site renders with empty
   theme vars (black text on dark glass), the theme import chain broke.
   Verify: `grep -c 'data-theme' dist/_astro/*.css` ≥ 6. Fix:
   BaseLayout must import `../styles/themes.css` (r44 incident).
2. **Partial dist shipped** — if pages 404/missing css after a deploy,
   two builds raced. The gated build has flock; never bypass. Redeploy
   from a verified-complete dist.
3. **Orphaned e2e server** — a server process that answers nothing
   (listening socket dead after restart). Kill via
   `pgrep -f 'e2e-log[s]'` (bracket pattern, never self-match) and
   relaunch from `apps/site`.

## Escalation

- Critical probes failing > 2 consecutive runs: treat as an incident —
  record in the ledger with trigger, diagnosis, fix, and the gate that
  would have caught it.
- All fixes ship through the validation ladder. Never hotfix past the
  gates (the gates exist because of incidents: r44 css-pipeline,
  build-race).

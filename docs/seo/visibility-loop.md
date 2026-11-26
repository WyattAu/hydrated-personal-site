# Visibility loop — SEO + AEO watchdog

Weekly loop (automation `aut_219984bc3001L5dIMTEufjme7c`, Mondays 07:30 UTC):
`scripts/visibility-loop.sh` checks served robots policy, key pages,
security headers, feed freshness, sitemap/llms, lineage gate, and fx
drift. Alerts append here; clean runs stay quiet. Run manually:
`bash scripts/visibility-loop.sh` (exit 1 = alerts present).


## Run 2026-11-26

**Alerts:**
- robots.txt: Cloudflare managed injection active (ai-train=no) — AI Crawl Control toggle still OFF
- robots.txt: managed AI-bot Disallow blocks present
- page /world returned 308
- page /etf returned 308
- page /insights returned 308
- page /data returned 308

- checked=9 drifted=0 no-upstream-found=0
- feeds stale: none

## Run 2026-11-26

**Alerts:**
- robots.txt: Cloudflare managed injection active (ai-train=no) — AI Crawl Control toggle still OFF
- robots.txt: managed AI-bot Disallow blocks present

- checked=9 drifted=0 no-upstream-found=0
- feeds stale: none

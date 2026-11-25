# Visibility Audit & Roadmap — wyattau.com

**Date:** 2026-11-25. Tools: estate osint-kit (DNS/email-auth/CT probes),
crawlkit (CI site audit, weekly), DuckDuckGo SERP (bot-challenged — see
the measurement-gap note).

## What is honestly measurable today

| Signal | Method | Result |
|---|---|---|
| Technical SEO | crawlkit CI audit (weekly) + 2026-11-18 sweep (score 99, JSON-LD 0 issues on 14 pages) | ✅ Complete — nothing technical left to fix |
| Transport trust | CT logs (`crtsh`): Google Trust Services + Let's Encrypt chains, no expired certs in the live set | ✅ Healthy |
| Email authentication (SPF) | SPF chain analysis | ✅ Present |
| **Email authentication (DKIM + DMARC)** | TXT probes on `_dmarc` + Proton selectors | ❌ **Absent — the domain sends via Proton but the custom-domain DKIM/DMARC DNS records were never published** |
| **Google ranking / indexing** | Requires Search Console | ❌ **Unmeasurable — GSC verification is the single blocking lever** |

## The measurement gap (not a site gap)

Google ranking cannot be honestly measured from outside: SERP scraping
is unreliable and against ToS, and third-party rank trackers need the
keyword set anyway. The industry-standard measurement surface is Google
Search Console — verification is a **user-side lever** (DNS record or
HTML file upload, ~15 minutes in the Cloudflare dashboard). Until GSC is
verified, every ranking statement is unfounded and stays unfounded —
this audit deliberately makes no ranking claim.

## The one fixable gap found: DMARC/DKIM

The domain sends via Proton (`wyatt_au@protonmail.com` → custom-domain
identity), but the DNS records that receivers check are unpublished.
Without them: spoofed mail from `@wyattau.com` lands in inboxes
unmarked, and legitimate mail can be flagged. Fix (user, ~15 min):

1. Proton settings → domain `wyattau.com` → open the **DKIM/DMARC
   setup wizard** — it generates three CNAME/TXT records (2 DKIM
   selectors + 1 DMARC TXT).
2. Paste them into Cloudflare DNS (proxy off for these records — they
   must be DNS-only).
3. Verify in Proton (green checkmarks) — re-run the osint probe after.

Recommended DMARC for a low-volume domain: start `p=quarantine`,
`rua=mailto:wyatt_au@protonmail.com`, then tighten to `p=reject` after
two clean weeks.

## Visibility roadmap

### Now (user levers — the real blockers)

| # | Lever | Unlocks | Effort |
|---|---|---|---|
| 1 | **GSC verification + sitemap submit** | Ranking/indexing measurement, query data, Preferred Sources eligibility — the entire feedback loop | ~15 min |
| 2 | **Proton DKIM/DMARC records** | Email trust (anti-spoofing + deliverability); closes the one audit gap | ~15 min |
| 3 | Forgejo runner + deploy secrets | Push-to-deploy; CI visibility on the Forgejo side | ~30 min |

### Ongoing (agent-maintained, already automated)

- crawlkit weekly SEO audit (CI) — technical drift is monitored.
- Quarterly dataset snapshot + study refresh (snapshot.yml + cadence).
- Monthly supply-chain audit + full CI gate (schedule trigger).
- IndexNow resubmit on every content ship.
- llms.txt + 7 markdown variants + FAQ schema for AI-answer-engine
  retrieval (AI citation surface already maximized).

### Next content triggers (the ranking fuel)

- Next Kp 5+ storm → storm-report rebuild (monitor is live, method
  proven, r = 0.79).
- Quarter boundary → snapshot + study data refresh (lineage-enforced).
- New original dataset → new citable study.

## Why no ranking claims are made

Two independent reasons: (1) the measurement surface (GSC) is not yet
verified — every third-party rank number for a small domain is
unreliable estimation; (2) the site's ranking-relevant on-page state is
already at ceiling (technical sweep score 99, enforced lineage, enforced
a11y, freshness telemetry). The ranking that comes will be earned by the
content cadence, measured by GSC once verified — not by further on-page
work.

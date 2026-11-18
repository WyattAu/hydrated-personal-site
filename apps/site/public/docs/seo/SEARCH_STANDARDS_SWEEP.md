# SEARCH_STANDARDS_SWEEP — wyattau.com

Per-site implementation status against the SEO-CORE canon
(`github.com/WyattAu/seo-standards`, SEO-CORE CURRENT 2026-11).
Baseline tier = T1–T9, C1–C4, G1–G6, A6, A13, M1, M8.

Last sweep: 2026-11-18. Auditor: estate agent (rounds 11–26).

## Baseline tier status

| Item | Status | Evidence |
|---|---|---|
| T1 robots policy layers | ✅ | `robots.txt` records the AI-crawler policy + `/api/` disallow; per-page `meta robots` via astro-seo; no `X-Robots-Tag` conflicts |
| T2 XML sitemap | ✅ | `@astrojs/sitemap` → `/sitemap-index.xml`; referenced from robots.txt; priorities serialized (dashboards 0.9/daily) |
| T3 IndexNow | ✅ | key `fad6b981…txt` live at root; `scripts/indexnow-submit.mjs`; shared-endpoint accepted 202 (Bing/Seznam/Naver); re-run after content ships |
| T4 canonical governance | ✅ | self-canonical default via astro-seo; one page-level canonical per URL |
| T5 hreflang | n/a | single-language site (en); no international variants |
| T6 status-code hygiene | ✅ | verified 2026-11-18: no soft-404s on money pages; `/data` 404 fixed with a real landing page; no redirect chains (flat static hosting) |
| T7 no indexable content behind interaction | ✅ | all content statically rendered; Solid islands are interactive extras, not content carriers; md variants mirror page content server-side |
| T8 Core Web Vitals floor | ✅ | static hosting + edge cache; home mobile DCL 546 ms / 843 KB (measured 2026-11-14); no CLS-prone layouts (fixed dims on media) |
| T9 edge caching + TTFB | ✅ | Cloudflare edge; SWR-style caching on API routes (60 s–30 min per endpoint); asset cache immutable |
| T15 image SEO | ✅ | AVIF/WebP hero with eager LCP image; all `<img>` carry alt (crawl-verified 0 missing); explicit dimensions on media |
| T16 structured data per page type | ✅ | Person/WebSite/WebPage site-wide; BreadcrumbList ×10; FAQPage ×6; Dataset ×2 — JSON-LD validation sweep 2026-11-18: 0 issues across 14 pages |
| T18 404/410 UX | ✅ | 404 page: terminal-style UX + search hint + return-home; GlitchText numeral |
| C1 one intent per URL | ✅ | dashboards = navigational/tool; content pages = informational; dataset page = download |
| C2 answer-first structure | ✅ | hero states the value proposition in the first screen; md variants are answer-first per estate-seo |
| C3 format matched to SERP | ✅ | interactive tools ARE the SERP format for these queries (dashboards, calculators); tables/lists in content pages |
| C4 E-E-A-T evidence | ✅ | named author throughout; Person schema with credentials; first-hand data (live feeds, own WASM widgets); cited sources (SWPC/USGS/LL2) |
| G1 llms.txt + llms-full.txt | ✅ | root llms.txt (full page inventory) + `.well-known/llms-full.txt` (14.3 KB, regenerated per build from the md sources) |
| G2 per-bot crawler policy | ✅ | robots.txt policy record 2026-11-06: AI crawlers explicitly welcome (retrieval + training); Cloudflare managed block-list interaction documented; `/api/` disallowed |
| G3 citability | ✅ | self-contained answer-first passages; named statistics (89 funds, 16 widgets, 48-point series); definitions in FAQs |
| G4 machine-readable freshness | ⚠️ | Dataset schemas carry `dateModified`; Article-level dates not yet on content pages — add `dateModified` to WebPage schema (roadmap) |
| G5 entity clarity | ✅ | Person `@id` anchor + alternateName (WyattAu equivalence) + givenName/familyName + sameAs (GitHub/Forgejo/X); WebSite publisher/author `@id` links; GitHub profile corroborates (name + blog field) |
| G6 Preferred Sources | ⏳ user | requires Google-side publisher participation; site-side freshness + Article structure ready |
| A6 unlinked-mention reclamation | ⏳ user | requires external-brand-mention monitoring; site-side entity signals in place |
| A13 brand-mention KPI | ⏳ user | brand search volume trackable post-GSC-verification |
| M1 Search Console weekly | ⏳ user | GSC verification is the single remaining blocker (site-side: sitemap + entity + IndexNow all in place) |
| M2 Bing Webmaster + IndexNow | ✅ | IndexNow accepted 202 (multiple); BWT verification optional |
| M5 AI citation share | ⏳ | track once GSC + answer-engine presence mature |
| M8 conversion-weighted reporting | n/a | personal site; no conversion funnel — treat portfolio inquiries as the output |

## Beyond-baseline adopted

- **T16 extras**: Dataset schema on `/world` + `/data` (DataDownload distributions); FAQPage on all 6 content pages; validated 0 issues.
- **G3/G8 extras**: 7 markdown page variants (answer-first, cross-linked "Related pages" graph); llms-full.txt regenerated per build from md sources.
- **T2 extras**: per-page OG cards (8), Dataset/FAQ/Breadcrumb schemas.
- **C11 partial**: original data published keylessly (89-fund ETF database, live OSINT feeds) — the link-asset foundation; data studies built on it are the roadmap (A1/A2).

## Known gaps / refused

- **AI-crawler edge blocks**: Cloudflare zone-level "AI Crawl Control" previously injected blanket blocks; policy record in robots.txt documents the intended welcome-all stance. If blocks reappear at the edge, re-enable-off is documented in robots.txt itself.
- **FAQ rich results**: FAQPage markup kept for structure (per S4: SERP real estate restricted to authoritative sites); no expectation of SERP real estate.
- **Refused techniques**: none in use; no PBNs, purchased links, parasite hosting, cloaking, doorway pages, or scaled unreviewed content.

## Cadence

- Re-sweep on material site changes; otherwise quarterly.
- IndexNow re-submit after any content ship (`bun apps/site/scripts/indexnow-submit.mjs`).
- Re-run `apps/site/scripts/seo-crawl.mjs` after builds to refresh the transparency datasets.

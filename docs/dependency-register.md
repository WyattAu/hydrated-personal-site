# Third-party dependency register

Every external service this site depends on, what breaks when it does,
and how failure degrades. The live counterpart is `/api/metrics`
(`feedLastSuccess` per feed — queryable staleness telemetry).

## External feeds (worker-proxied)

| Feed | Surfaces affected | Failure behavior | Severity |
|---|---|---|---|
| NOAA SWPC (`services.swpc.noaa.gov`) | /world weather panels, aurora correlation, kp-index | Widget error states; stale data served from edge cache | Warning |
| Binance WS (`stream.binance.com:9443`) | Live prices, crypto ticker, price-stream DO | Widgets show last values; no updates | Warning |
| Yahoo (unofficial, via worker) | Macro rates, risk assets, stock chart | N/A in metric cards (dead cells filtered at the data boundary) | Warning |
| mempool.space | /world bitcoin panels | Widget error state | Warning |
| CoinGecko | Global crypto metrics | Widget error state | Warning |
| worldbank.org | /world development indicators | Panel error state | Warning |
| restcountries.com | /world country data | Panel error state | Warning |
| deribit | Options data | Widget error state | Warning |
| wheretheiss.at | ISS tracking panel | Panel error state | Warning |

## Infrastructure dependencies

| Dependency | Surfaces affected | Failure behavior | Severity |
|---|---|---|---|
| Cloudflare Pages | The entire site | Site down (edge network is highly redundant; single-origin risk is low) | Critical |
| Cloudflare Worker | All `/api/*` routes, guestbook, SSE streams | API routes fail; static content unaffected | Major |
| Cloudflare KV | Aurora history, guestbook, dataset snapshots (read path) | History/entries unavailable; static data unaffected | Major |
| Durable Objects | Price stream | Stream fails; widgets degrade | Warning |
| unpkg (fonts CSS) | Font loading | Fallback fonts render (system serif/mono) | Minor |
| fonts.gstatic.com | Font files | Fallback fonts render | Minor |
| Plausible (analytics) | Visit counting only | No site functionality affected | Minor |

## Rules

1. A feed going stale is a **warning**, never a page failure: widgets
   must render error states, never crash (E2E console filter enforces
   the distinction).
2. Dead data renders as N/A or is filtered at the data boundary — never
   0.00 (see `worker/src/metrics.ts` price-0 filtering).
3. New third-party integrations must be added here AND to the CSP
   allowlist in `BaseLayout.astro` AND to the probe matrix in
   `.forgejo/workflows/uptime.yml` if they have a health endpoint.

## Known unimplemented routes (widgets expecting worker APIs)

| Expected route | Consumer | State |
|---|---|---|
| `GET /api/arxiv-papers` | /ml ArxivPapers widget | **Missing** — worker has no arxiv proxy; widget shows error state. Fix: add handler proxying `export.arxiv.org/api/query` (no CORS on arxiv — proxy required) |
| `GET /api/swpc-plasma`, `/api/swpc-mag` | /world SolarWindPanel | Handlers exist but return 502: **NOAA retired the entire solar-wind product family** (plasma-1-day/2-day, mag-1-day/2-day all 404 upstream, confirmed 2026-11-25; the /products/ directory no longer lists any solar-wind plasma or magnetometer file). Panel degrades to error state. **Upgrade path found (2026-11-27): `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` — 1-MINUTE planetary Kp, live (200)**. Panel can be refactored to a 1-min Kp stream (a cadence upgrade over the old 3-hour products); alternative DSCOVR source research continues |

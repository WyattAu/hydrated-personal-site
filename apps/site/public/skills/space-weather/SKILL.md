# SKILL.md — wyattau.com space weather

## Description

Keyless space-weather JSON: NOAA OVATION aurora probability near any
coordinate (grid-filtered, ~1KB responses), aurora activity-index history
(30-minute snapshots over 55-65N), newest NOAA SWPC alert products, and
planetary K-index readings. All endpoints are public GET, edge-cached.

## When to use

- "Will aurora be visible near X?" — `GET /api/aurora?lat=&lon=`
- "Has aurora activity been rising or falling?" — `GET /api/aurora-history`
- "Any active space-weather alerts?" — `GET /api/swpc-alerts`
- Geomagnetic context — `GET /api/kp-index`

## Endpoints (all GET, no auth)

- `https://wyattau.com/api/aurora?lat=&lon=` — probability %, peak cell, OVATION obs/fc times.
- `https://wyattau.com/api/aurora-history` — `{history: [{ts, prob}]}` (accumulates at 30-min buckets).
- `https://wyattau.com/api/swpc-alerts` — newest 6 alert products with summaries.
- `https://wyattau.com/api/kp-index` — 3-hourly Kp readings.

## Etiquette

- OVATION refreshes ~30 min upstream; poll `/api/aurora` at most every 30 min.
- `/api/swpc-alerts` and `/api/kp-index` are cached 10 min; poll within the window.
- lat in [-90, 90], lon in [-180, 180]; out-of-range returns 400.

# SKILL.md — wyattau.com OSINT feeds

## Description

Keyless OSINT JSON feeds: USGS all-day earthquake GeoJSON, NOAA planetary
K-index (geomagnetic activity), upcoming orbital launches from Launch
Library 2 (provider, rocket, pad, T-minus), and Bitcoin mempool fees.

## When to use

- Recent seismic events with magnitude, location, and depth (GeoJSON)
- Geomagnetic storm context (planetary K-index)
- Upcoming orbital launches with provider and launch-site metadata
- Bitcoin fee market conditions

## Endpoints (all GET, no auth)

- `https://wyattau.com/api/earthquakes`
- `https://wyattau.com/api/kp-index`
- `https://wyattau.com/api/space-launches`
- `https://wyattau.com/api/mempool`
- `https://wyattau.com/api/aurora?lat=&lon=` — NOAA OVATION aurora probability near a coordinate
- `https://wyattau.com/api/swpc-alerts` — newest NOAA space-weather alerts

## Etiquette

Edge-cached 5–30 min depending on endpoint; poll at most once per cache
window. Identify with a User-Agent header.

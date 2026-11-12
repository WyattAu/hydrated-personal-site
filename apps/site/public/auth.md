# auth.md — Agent authentication for wyattau.com

This document describes how automated agents and AI applications can
access the public data APIs of wyattau.com.

## Audience

All `/api/*` endpoints on this site are **public read-only** market,
earthquake, weather, and space data feeds. No authentication, no API
key, no registration is required. Anonymous access is the only access
model.

## Endpoints

- `GET /api/health` — service health probe. Returns `{"status":"ok"}`.
- `GET /api/crypto-ticker` — Binance 24h mini-ticker snapshot.
- `GET /api/earthquakes` — USGS all-day earthquake feed (GeoJSON).
- `GET /api/kp-index` — NOAA planetary K-index readings.
- `GET /api/space-launches` — upcoming orbital launches (Launch Library 2).
- `GET /api/weather` — Open-Meteo forecast proxy.
- `GET /api/fear-greed` — crypto Fear & Greed index.
- `GET /api/mempool` — Bitcoin mempool fees + difficulty-adjustment estimate.
- `GET /api/aurora?lat=&lon=` — NOAA OVATION aurora probability near a coordinate (grid-filtered).
- `GET /api/aurora-history` — aurora activity-index history (30-min snapshots, 55-65N).
- `GET /api/swpc-alerts` — newest NOAA SWPC space-weather alert products.
- `GET /api/stock-quote?symbols=` — Yahoo Finance quotes.
- `GET /api/stock-chart` — Yahoo Finance OHLC series.
- `GET /api/binance-klines` — Binance candlestick data.
- `GET /api/exchange-rates` — reference FX rates.
- `GET /api/restcountries?code=` — country metadata.
- `GET /api/world-bank` — World Bank indicators.
- `GET /api/github-trending` — trending repositories.
- `GET /api/hacker-news` — Hacker News front page digest.
- `GET /api/llm-benchmarks` — LLM benchmark leaderboard data.

## Rate limits and etiquette

- Responses are edge-cached (60 s–30 min depending on endpoint); poll at
  most once per cache window.
- identify yourself with a User-Agent; requests without one may be
  challenge-page filtered by our CDN.
- Write endpoints (`/api/guestbook*`) are for the interactive site only:
  rate-limited 5 messages per IP per 10 minutes, no agent access.

## Machine-readable discovery

- API catalog (RFC 9727): `/.well-known/api-catalog`
- Agent card (A2A): `/.well-known/agent-card.json`
- Skills index: `/.well-known/agent-skills/index.json`
- Site map for AI engines: `/llms.txt`

## OAuth / authenticated access

Not offered. The site publishes no authenticated API surface and has no
authorization server. If a future API requires authentication, this
document and `/.well-known/oauth-protected-resource` (RFC 9728) will be
updated first — check the API catalog for changes.

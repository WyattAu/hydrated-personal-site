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
- `GET /api/mempool` — Bitcoin mempool fees.

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

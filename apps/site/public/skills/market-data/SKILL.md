# SKILL.md — wyattau.com market-data

## Description

Keyless, edge-cached JSON APIs for real-time market data: Binance 24h
USDT mini-tickers (BTC, ETH, SOL, BNB, XRP, ADA), macro risk rates (VIX,
DXY, 10Y yield, gold, silver, copper, WTI/Brent), Fear & Greed index, and
equity index quotes. All endpoints are public GET with 60 s–5 min edge
caching.

## When to use

- Current crypto prices and 24h deltas for major USDT pairs
- Risk-asset sentiment: VIX level, US dollar strength, treasury yields
- Crypto market sentiment via the alternative.me Fear & Greed index

## Endpoints (all GET, no auth)

- `https://wyattau.com/api/crypto-ticker`
- `https://wyattau.com/api/stock-quote?symbols=^VIX,DX-Y.NYB,^TNX,GC=F`
- `https://wyattau.com/api/fear-greed`

## Etiquette

Poll at most once per minute; responses are edge-cached. Identify with a
User-Agent header.

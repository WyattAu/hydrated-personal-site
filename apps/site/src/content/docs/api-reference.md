---
title: "API Reference"
description: "Cloudflare Worker API endpoint documentation"
order: 3
---
# API Reference

All endpoints are served from the Cloudflare Worker at `/api/`.

## Health Check
- `GET /api/health` - Returns service status

## Market Data
- `GET /api/crypto-ticker` - Binance 24hr ticker (10s cache)
- `GET /api/stock-chart?symbol=&range=&interval=` - Yahoo Finance chart data
- `GET /api/binance-klines?symbol=&interval=&limit=` - Binance kline data
- `GET /api/coingecko-global` - Global crypto market data (5min cache)
- `GET /api/exchange-rates` - USD exchange rates (1hr cache)

## World Data
- `GET /api/weather?lat=&lon=` - Open-Meteo weather forecast (5min cache)
- `GET /api/earthquakes` - USGS earthquake data (5min cache)
- `GET /api/kp-index` - NOAA planetary K-index (10min cache)

## Sentiment & News
- `GET /api/fear-greed` - Crypto Fear & Greed Index (5min cache)
- `GET /api/hacker-news` - Top 30 HN stories (5min cache)
- `GET /api/github-trending` - Trending GitHub repos (30min cache)
- `GET /api/llm-benchmarks` - LLM leaderboard data (6hr cache)

## Bitcoin Network
- `GET /api/mempool` - Mempool fees and stats (1min cache)

## Guestbook
- `GET /api/guestbook?page=1&limit=20` - List entries (paginated)
- `POST /api/guestbook` - Create entry (rate limited: 5/10min/IP)
- `DELETE /api/guestbook` - Delete entry (admin token required)

## Monitoring
- `GET /api/metrics` - Worker performance metrics

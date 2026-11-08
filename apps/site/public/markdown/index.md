# Wyatt Au — Backend Engineer & Systems Architect

Personal intelligence dashboard and portfolio site of Wyatt Au: real-time
market data, OSINT feeds, 16 Rust/WASM quantitative widgets, and an
interactive guestbook. All computation is client-side WebAssembly; public
data APIs are keyless and edge-cached.

## What is on this site?

- [World Monitor](https://wyattau.com/world) — real-time intelligence
  dashboard: crypto prices via Binance WebSocket, world map with capital
  markets and ISS position, macro rates (VIX, DXY, yields, gold), earthquakes,
  solar-wind telemetry, and upcoming orbital launches.
- [ETF Intelligence](https://wyattau.com/etf) — database of 89 ETFs with
  allocation analysis, correlation matrix, Monte Carlo simulation, VaR,
  portfolio backtesting, and walk-forward analysis.
- [ML Benchmarks](https://wyattau.com/ml) — LLM benchmark leaderboards,
  model comparison radar charts, GPU requirement calculator, and inference
  throughput simulator.
- [WASM Showcase](https://wyattau.com/#wasm-showcase) — 16 interactive
  Rust/WASM demonstrations: Monte Carlo simulation, SVI volatility surface,
  Fourier analysis, cellular automata, physics sandbox, generative art.
- [Docs](https://wyattau.com/docs) — technical notes and architecture
  decisions.
- [Dossier](https://wyattau.com/dossier) — detailed biography and timeline.
- [Projects](https://wyattau.com/projects) — selected engineering projects.

## Live data APIs (keyless, no auth)

All data endpoints are public GET, edge-cached, and return JSON:

- `GET /api/crypto-ticker` — Binance 24h USDT mini-tickers.
- `GET /api/earthquakes` — USGS all-day earthquake feed (GeoJSON).
- `GET /api/kp-index` — NOAA planetary K-index.
- `GET /api/space-launches` — upcoming orbital launches (Launch Library 2).
- `GET /api/fear-greed` — crypto Fear & Greed index.
- `GET /api/stock-quote?symbols=^VIX,DX-Y.NYB` — Yahoo Finance quotes.

Poll at most once per cache window (60 s–30 min). Identify yourself with a
User-Agent header. Full machine-readable discovery:
`/.well-known/api-catalog` (RFC 9727), `/.well-known/agent-card.json` (A2A),
and `/auth.md`.

## About Wyatt Au

Wyatt Au builds deterministic infrastructure and high-performance systems.
Currently bootstrapping QuestHive. Based in the United Kingdom.

## Contact

- Email: wyatt_au@protonmail.com
- GitHub: github.com/WyattAu
- Forgejo: forgejo.wyattau.com/wyatt
- X: @_WyattAu_

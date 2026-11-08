# World Monitor — intelligence dashboard

Real-time intelligence dashboard of Wyatt Au: crypto prices via Binance
WebSocket, world map with ISS position, macro rates (VIX, DXY, 10Y yield,
gold), earthquakes, solar-wind telemetry, and upcoming orbital launches.

## What data does World Monitor show?

- Live crypto prices (BTC, ETH, SOL, BNB, XRP, ADA) from Binance WebSocket,
  24h change and high/low.
- World map with ISS live position (wheretheiss.at, 5 s polling) and
  capital-city markers.
- Macro rates: VIX, DXY, US 10Y yield, gold, silver, copper, WTI, Brent —
  from Yahoo Finance.
- Bitcoin structure: market cap estimate, 24h volume, funding rate, open
  interest, long/short ratio, NVT.
- Sentiment: Fear & Greed index, Kp geomagnetic index.
- Upcoming orbital launches from Launch Library 2.

## Data sources

All data is fetched client-side from keyless public APIs (Binance, Yahoo
Finance, USGS, NOAA SWPC, Launch Library 2, wheretheiss.at) and edge-cached
by the site's Workers API. No API keys, no authentication.

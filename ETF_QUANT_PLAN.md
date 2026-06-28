# ETF WASM Analytics Plan

## Data Available (All Free)

| Source | Data | Via |
|--------|------|-----|
| Yahoo Finance | ETF OHLCV (daily/intraday), any timeframe | `/api/stock-chart` |
| Yahoo Finance | Multi-ETF real-time quotes | `/api/stock-quote` |
| Sector ETFs (XLK-XLRE) | GICS sector returns for factor decomp | `/api/stock-quote` |
| ETF Database (local) | 89 ETFs: sector alloc, region alloc, top holdings | `/data/etf-database.json` |
| Fama-French | Daily factor returns (Mkt-RF, SMB, HML, RF) | Dartmouth ZIP (runtime) |
| FRED | Risk-free rate (3M T-bill) | `/api/treasury-yields` |

## Ranked WASM Widget Table

| Rank | Widget | Visual | Utility | WASM Fit | Data Avail | Ease | Composite | PE/IB Use Case |
|------|--------|--------|---------|----------|------------|------|-----------|----------------|
| 1 | **Holdings Treemap (weighted)** | 10 | 10 | 7 | 10 | 8 | 45/50 | Portfolio composition at a glance. Size = weight, colour = sector. Standard in every IB pitch deck. |
| 2 | **Factor Exposure Regression** | 8 | 10 | 10 | 9 | 5 | 42/50 | Fama-French 3-factor regression. Shows market beta, size tilt, value tilt. Core for PE due diligence. |
| 3 | **Sector Radar Chart** | 10 | 9 | 6 | 10 | 7 | 42/50 | 11-axis radar showing sector allocation vs benchmark. Instantly shows style (growth/value/defensive). |
| 4 | **Holdings Overlap Matrix** | 9 | 10 | 8 | 10 | 6 | 43/50 | How much do two ETFs overlap? Critical for diversification analysis. WASM computes Jaccard + weighted overlap. |
| 5 | **Drawdown Analysis** | 9 | 9 | 9 | 10 | 8 | 45/50 | Underwater curve + recovery periods + max drawdown duration. PE teams live by drawdown. |
| 6 | **Efficient Frontier (ETFs)** | 9 | 9 | 10 | 10 | 6 | 44/50 | Markowitz with ETF universe. Shows optimal allocation curve. Tangency portfolio with risk-free. |
| 7 | **Risk-Return Scatter** | 9 | 8 | 7 | 10 | 9 | 43/50 | All ETFs plotted on Sharpe-adjusted return vs risk. Bubble = AUM. Hover = full stats. |
| 8 | **Concentration (HHI)** | 7 | 10 | 9 | 10 | 8 | 44/50 | Herfindahl-Hirschman Index for holdings + sector concentration. DOJ threshold overlay. |
| 9 | **Stress Test Scenarios** | 9 | 9 | 10 | 8 | 5 | 41/50 | Apply historical shocks (2008, COVID, 2022 rate hike) to current portfolio. WASM Monte Carlo. |
| 10 | **Performance Attribution** | 8 | 10 | 9 | 8 | 4 | 39/50 | Brinson model: allocation vs selection effect. Decomposes outperformance source. |
| 11 | **Rolling Beta Heatmap** | 9 | 8 | 9 | 10 | 5 | 41/50 | 3-year rolling beta vs benchmark, rendered as time-coloured heatmap. Shows regime changes. |
| 12 | **Tracking Error** | 7 | 9 | 8 | 10 | 7 | 41/50 | Annualised TE + information ratio. Shows how closely an ETF tracks its index. |
| 13 | **Style Box (3x3)** | 8 | 8 | 5 | 9 | 8 | 38/50 | Morningstar-style value/blend/growth x small/mid/large. Computed from factor loadings. |
| 14 | **VaR / CVaR** | 7 | 10 | 10 | 10 | 8 | 45/50 | Already built in quant module. Apply to ETF portfolio. |
| 15 | **Correlation Network** | 10 | 8 | 8 | 10 | 5 | 41/50 | Force-directed graph of ETF correlations. Already built. |
| 16 | **Monte Carlo Projection** | 10 | 8 | 10 | 10 | 7 | 45/50 | Already built. Apply to ETF prices. |
| 17 | **Sector Rotation Momentum** | 8 | 7 | 8 | 10 | 6 | 39/50 | Relative strength of each sector vs SPY over N days. Renders as momentum bar race. |
| 18 | **Tail Risk (Cornish-Fisher)** | 7 | 9 | 10 | 9 | 5 | 40/50 | Skew-adjusted VaR using Cornish-Fisher expansion. More accurate than normal VaR for fat tails. |
| 19 | **Omega Ratio Surface** | 8 | 8 | 9 | 10 | 4 | 39/50 | Omega ratio across threshold levels. 3D surface plot. Better than Sharpe for non-normal returns. |
| 20 | **Information Ratio Time Series** | 7 | 8 | 7 | 10 | 7 | 39/50 | Rolling IR with confidence bands. Shows active management quality over time. |

## Implementation Phases

### Phase 1: Core Portfolio Analytics (WASM + SolidJS)

| Widget | New WASM? | Effort | Depends On |
|--------|-----------|--------|------------|
| Holdings Treemap | Reuse existing | 4h | None |
| Drawdown Analysis | New `drawdown.rs` | 4h | None |
| Concentration (HHI) | New `concentration.rs` | 3h | None |
| Risk-Return Scatter | Client-side JS | 3h | None |
| VaR/CVaR | Reuse `quant_var` | 2h | None |
| Monte Carlo | Reuse `quant_montecarlo` | 2h | None |

### Phase 2: Factor Analysis

| Widget | New WASM? | Effort | Depends On |
|--------|-----------|--------|------------|
| Factor Exposure Regression | New `factor.rs` | 6h | Fama-French data |
| Style Box | Uses factor loadings | 3h | Phase 2 |
| Sector Radar Chart | Client-side JS | 4h | None |
| Rolling Beta Heatmap | New `rolling.rs` | 5h | None |

### Phase 3: Advanced IB/PE

| Widget | New WASM? | Effort | Depends On |
|--------|-----------|--------|------------|
| Holdings Overlap Matrix | New `overlap.rs` | 5h | None |
| Efficient Frontier (ETFs) | Reuse `portfolio.rs` | 4h | None |
| Stress Test Scenarios | New `stress.rs` | 6h | Phase 1 |
| Performance Attribution | New `attribution.rs` | 8h | Factor data |
| Sector Rotation Momentum | New `momentum.rs` | 4h | None |

## New WASM Modules Required

```
packages/widgets/src/quant/
  + drawdown.rs       -- underwater curve, max DD duration, recovery analysis
  + concentration.rs  -- HHI, effective number of positions, entropy
  + factor.rs         -- OLS regression, Fama-French, factor loadings, R-squared
  + overlap.rs        -- Jaccard index, weighted overlap, union/intersection
  + stress.rs         -- historical scenario replay, Monte Carlo stress
  + attribution.rs    -- Brinson multi-period, allocation/selection/interaction
  + rolling.rs        -- rolling regression, rolling beta, rolling correlation
  + momentum.rs       -- relative strength, momentum score, sector ranking
```

## SolidJS Components Required

```
apps/site/src/components/solid/quant/
  + EtfHoldingsTreemap.tsx
  + EtfDrawdownChart.tsx
  + EtfConcentrationGauge.tsx
  + EtfRiskReturnScatter.tsx
  + EtfFactorExposure.tsx
  + EtfSectorRadar.tsx
  + EtfOverlapMatrix.tsx
  + EtfEfficientFrontier.tsx
  + EtfStressTest.tsx
  + EtfStyleBox.tsx
  + EtfRollingBeta.tsx
  + EtfMonteCarlo.tsx
```

## Data Pipeline

All price data fetched client-side via existing endpoints:
- `/api/stock-chart?symbol=SPY&range=1y&interval=1d` -- historical OHLCV
- `/api/stock-quote?symbols=SPY,QQQ,...` -- real-time quotes
- `/data/etf-database.json` -- static holdings/allocations (already shipped)

Fama-French factors loaded at runtime from Dartmouth:
- `https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_Factors_daily_CSV.zip`
- Parsed client-side (small CSV, ~500KB uncompressed)
- Cached in localStorage with 24h TTL

## ETF Page Layout (Proposed)

```
ETF INTELLIGENCE
  [Search Bar + ETF Detail]
  [Quick Picks Grid]

PORTFOLIO ANALYTICS (WASM)
  Row 1: Holdings Treemap | Sector Radar
  Row 2: Drawdown Analysis | Concentration Gauge
  Row 3: Risk-Return Scatter | Monte Carlo Projection

FACTOR ANALYSIS (WASM)
  Row 4: Factor Exposure Regression | Style Box
  Row 5: Rolling Beta Heatmap | Tracking Error

COMPARISON TOOLS (WASM)
  Row 6: Overlap Matrix | Efficient Frontier
  Row 7: VaR/CVaR | Stress Test

EXISTING
  Row 8: Correlation Matrix | Correlation Network
```

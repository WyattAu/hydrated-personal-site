# Quant Dashboard Implementation Plan

## Objective

Transform the `/world` page from a data-display dashboard into a client-side quantitative analysis terminal. Every computation runs in Rust/WASM on the user's CPU. Zero server-side math. All data sourced from verified free APIs.

## Architecture

```
User Browser
  |
  +-- WASM Module (packages/widgets/src/quant/)
  |     |-- montecarlo.rs    (GBM path simulation)
  |     |-- blackscholes.rs  (option pricing + Greeks)
  |     |-- portfolio.rs     (Markowitz optimization)
  |     |-- risk.rs          (VaR, ES, drawdown)
  |     |-- volatility.rs    (GARCH, EWMA, realized vol)
  |     |-- stats.rs         (correlation, regression, PCA)
  |     +-- yieldcurve.rs    (Nelson-Siegel fitting)
  |
  +-- SolidJS Islands (apps/site/src/components/solid/quant/)
  |     |-- MonteCarloFan.tsx     (prediction fan chart)
  |     |-- GreeksDashboard.tsx   (5 Greek curves)
  |     |-- EfficientFrontier.tsx (scatter + frontier)
  |     |-- RiskMetrics.tsx       (VaR histogram)
  |     |-- VolatilityForecast.tsx(GARCH forecast band)
  |     |-- CorrelationNetwork.tsx(force-directed graph)
  |     +-- YieldCurveChart.tsx   (Treasury curve + recession flag)
  |
  +-- API Endpoints (worker + astro SSR)
        |-- /api/binance-klines     (existing, crypto OHLCV)
        |-- /api/stock-chart        (existing, Yahoo equities)
        |-- /api/deribit-options    (NEW, crypto options + IV)
        |-- /api/treasury-yields    (NEW, FRED yield curve)
        +-- /api/funding-rates      (NEW, Binance perp funding)
```

## Data Sources (All Verified Free)

| Source | Endpoint | Data | Rate Limit | Auth |
|--------|----------|------|------------|------|
| Binance | `/api/v3/klines` | Crypto OHLCV (any timeframe) | 1200/min | None |
| Binance | `/api/v3/depth` | Order book (20 levels) | 1200/min | None |
| Binance | `/api/v3/aggTrades` | Tick-by-tick trade data | 1200/min | None |
| Binance | `/fapi/v1/premiumIndex` | Perp funding rates (807 pairs) | 1200/min | None |
| Yahoo Finance | `query2.../v8/finance/chart` | Stocks, ETFs, front-month futures | ~100/hr | User-Agent |
| Deribit | `/api/v2/public/get_book_summary_by_currency` | BTC/ETH options chain + IV (892 contracts) | 20/sec | None |
| FRED | `fredgraph.csv?id=DGS*` | Treasury yields 1MO-30Y | 120/min | None |

## Implementation Phases

### Phase 1: Monte Carlo Price Prediction Fan

**Goal:** Price chart that fans into probabilistic future paths.

**WASM (`montecarlo.rs`):**
- Input: current price, annualized volatility (computed from historical returns), drift (computed from historical mean return), time horizon (days), number of paths (default 1000), time steps (default 252 for 1Y).
- Simulation: Geometric Brownian Motion. For each path, at each time step:
  ```
  S(t+dt) = S(t) * exp((drift - 0.5 * vol^2) * dt + vol * sqrt(dt) * Z)
  ```
  where Z is a standard normal random draw (Box-Muller transform).
- Output: array of 1000 price paths, each 252 steps. Client-side sorts into percentile bands (P5, P25, P50, P75, P95).
- Performance: 1000 paths x 252 steps = 252,000 iterations with exp/sqrt/random. WASM target: <10ms. JS equivalent: ~80ms.

**SolidJS (`MonteCarloFan.tsx`):**
- Canvas chart. Left 70% shows historical price line (from klines data). Right 30% shows the translucent fan with 5 percentile bands.
- Controls: symbol selector (dropdown of tracked assets), horizon slider (7d, 30d, 90d, 180d, 365d), volatility source toggle (historical vs user-input).
- Colours: P5/P95 band = lightest accent, P25/P75 = medium, P50 = solid line. Band edges render with additive blending for a glow effect.
- Update: re-simulate on control change or every 60 seconds when price updates.

**API:** Existing `/api/binance-klines` and `/api/stock-chart` provide historical OHLCV. No new endpoint needed. The WASM module computes volatility from the returned kline data.

**Data flow:**
1. SolidJS fetches klines (e.g. BTCUSDT 1d x 365).
2. Passes the close prices to WASM `create_montecarlo`.
3. WASM computes log returns, mean, std dev, then simulates 1000 GBM paths.
4. Returns paths array to SolidJS.
5. SolidJS sorts paths into percentile bands and renders on canvas.

---

### Phase 2: Efficient Frontier (Markowitz Portfolio Optimization)

**Goal:** Scatter cloud of 10,000 random portfolios with the efficient frontier curve highlighted.

**WASM (`portfolio.rs`):**
- Input: matrix of asset returns (N assets x T periods), number of random portfolios (default 10,000), risk-free rate (from FRED DGS3MO).
- Computation:
  1. Compute mean return vector (N x 1) and covariance matrix (N x N).
  2. For each of 10,000 random weight vectors (Dirichlet distribution to ensure weights sum to 1):
     - Portfolio return = w^T * mean
     - Portfolio risk = sqrt(w^T * Cov * w)
     - Sharpe = (return - rf) / risk
  3. Find the tangency portfolio (max Sharpe) via the closed-form solution:
     ```
     w_tangent = (Cov^-1 * (mean - rf)) / (1^T * Cov^-1 * (mean - rf))
     ```
  4. Compute the efficient frontier analytically by sweeping target returns and solving the quadratic program.
- Output: array of {return, risk, sharpe} for each random portfolio, plus the frontier curve points and the tangency portfolio weights.
- Performance: 10,000 portfolio evaluations with N=8 assets. Covariance is 8x8, weight matrix is 8-dim. Each evaluation is 8 multiplies + 1 sqrt. WASM target: <15ms.

**SolidJS (`EfficientFrontier.tsx`):**
- Canvas scatter plot. X = risk (std dev), Y = return. Each dot coloured by Sharpe ratio (cool = low, hot = high).
- Efficient frontier curve overlaid in accent colour.
- Tangency portfolio marked with a star.
- Hover on any dot shows the portfolio weights (bar mini-chart in tooltip).
- Controls: asset multi-selector (pick from tracked assets), risk-free rate display (auto from FRED), constraint toggle (long-only vs allow shorts).

**API:** Existing klines endpoints. Fetch 90d daily closes for each selected asset, compute returns client-side.

---

### Phase 3: Black-Scholes Greeks Dashboard

**Goal:** Five synchronized mini-charts showing Delta, Gamma, Theta, Vega, Rho as functions of spot price.

**WASM (`blackscholes.rs`):**
- Input: spot price range (min, max, steps), strike, time to expiry (years), risk-free rate, implied volatility.
- Computation: For each spot price in the range, compute:
  ```
  d1 = (ln(S/K) + (r + 0.5*sigma^2) * T) / (sigma * sqrt(T))
  d2 = d1 - sigma * sqrt(T)
  N(x) = 0.5 * (1 + erf(x / sqrt(2)))     // CDF via error function
  
  Delta_call = N(d1)
  Delta_put  = N(d1) - 1
  Gamma      = n(d1) / (S * sigma * sqrt(T))     // n = PDF
  Theta_call = -(S * n(d1) * sigma) / (2*sqrt(T)) - r*K*exp(-r*T)*N(d2)
  Vega       = S * n(d1) * sqrt(T)
  Rho_call   = K * T * exp(-r*T) * N(d2)
  ```
  where n(x) is the standard normal PDF: `(1/sqrt(2*pi)) * exp(-0.5*x^2)`.
- The error function (erf) uses the Abramowitz-Stegun approximation (max error 1.5e-7).
- Output: 5 arrays of Greek values across the spot range, for both call and put.
- Performance: 200 spot steps x 5 Greeks = 1000 erf/exp evaluations. WASM: <1ms.

**SolidJS (`GreeksDashboard.tsx`):**
- Grid of 5 canvas mini-charts (2 columns x 3 rows, last cell for summary stats).
- Each chart shows the Greek as a curve over spot price, with a vertical line at current spot.
- Dropdown: select from Deribit BTC/ETH options (auto-fills strike, expiry, IV from Deribit data) OR manual input mode.
- Summary cell shows: current Greek values numerically, option type (call/put), theoretical price.

**API:** New endpoint `/api/deribit-options` proxies Deribit's `get_book_summary_by_currency` and caches for 5 minutes. Returns strike, expiry, IV, mark price, volume, OI for all BTC/ETH option contracts.

---

### Phase 4: GARCH(1,1) Volatility Forecast

**Goal:** Historical realized volatility with a GARCH forecast band extending into the future.

**WASM (`volatility.rs`):**
- Input: array of log returns (at least 252 data points).
- Computation:
  1. Compute squared returns.
  2. Estimate GARCH(1,1) parameters (omega, alpha, beta) via maximum likelihood. Use the method of moments for initial guess, then refine with bounded Newton-Raphson (5-10 iterations is sufficient for convergence).
  3. The GARCH variance recursion:
     ```
     sigma^2(t) = omega + alpha * r^2(t-1) + beta * sigma^2(t-1)
     ```
  4. Forecast: iterate the recursion forward N steps using the unconditional variance as the long-run anchor:
     ```
     sigma^2_forecast = omega / (1 - alpha - beta)  [long-run variance]
     ```
  5. Also compute EWMA (exponentially weighted) volatility with lambda=0.94 for comparison.
- Output: arrays of {realized_vol, ewma_vol, garch_vol, garch_forecast_lower, garch_forecast_upper} for each time step.
- Performance: MLE iteration + 500-step recursion. WASM: <5ms.

**SolidJS (`VolatilityForecast.tsx`):**
- Canvas chart. Historical section shows realized vol (thin line) and EWMA vol (thick line). Forecast section shows GARCH forecast with confidence band (dashed lines).
- Y-axis: annualized volatility (%). X-axis: time (trailing 180d historical + 30d forecast).
- Highlight: when GARCH forecast exceeds the 90th percentile of historical realized vol, render in warning colour.

**API:** Existing klines endpoints. Compute returns client-side from close prices.

---

### Phase 5: VaR and Expected Shortfall

**Goal:** Histogram of simulated portfolio returns with VaR and ES thresholds highlighted.

**WASM (`risk.rs`):**
- Input: array of historical portfolio returns OR array of simulated returns (from Monte Carlo).
- Computation (Historical VaR):
  1. Sort returns ascending.
  2. VaR(95%) = return at the 5th percentile.
  3. VaR(99%) = return at the 1st percentile.
  4. ES(95%) = mean of all returns below VaR(95%).
  5. ES(99%) = mean of all returns below VaR(99%).
- Computation (Parametric VaR):
  1. Compute mean and std dev of returns.
  2. VaR(95%) = mean - 1.645 * std_dev.
  3. VaR(99%) = mean - 2.326 * std_dev.
  4. ES = mean - (pdf(z) / alpha) * std_dev, where z is the z-score.
- Output: histogram bins, VaR thresholds, ES values, confidence intervals.
- Performance: sorting 5000 returns. WASM: <1ms.

**SolidJS (`RiskMetrics.tsx`):**
- Canvas histogram with VaR(95%) and VaR(99%) vertical lines in warning colours.
- Tail beyond VaR rendered in a distinct colour.
- ES value annotated as a horizontal line within the tail.
- Toggle: Historical vs Parametric vs Monte Carlo method.

**API:** Uses returns computed from existing klines data. Can also ingest Monte Carlo paths from Phase 1.

---

### Phase 6: Correlation Network Graph

**Goal:** Force-directed graph where assets cluster by correlation. Reveals diversification breakdown during stress.

**WASM (`stats.rs` + reuse `nbody.rs` physics):**
- Input: matrix of asset returns (N assets x T periods), correlation threshold.
- Computation:
  1. Compute N x N Pearson correlation matrix.
  2. Create edges: for each pair (i,j) where |corr(i,j)| > threshold, create an edge with weight = |corr(i,j)| and sign = sign(corr(i,j)).
  3. Run Barnes-Hut force simulation (reuse existing N-body physics):
     - Repulsive force between all nodes (prevents overlap).
     - Attractive force along edges, proportional to correlation magnitude.
     - Negative correlations push apart, positive pull together.
  4. Run 500 iterations to settle.
- Output: {x, y} positions for each node, edge list with weights and signs.
- Performance: 500 iterations of Barnes-Hut on ~20 nodes. WASM: <5ms per re-layout.

**SolidJS (`CorrelationNetwork.tsx`):**
- Canvas with animated force-directed layout. Nodes are circles labelled with asset symbols. Node size = volatility. Node colour = recent return (green = positive, red = negative).
- Edges: thickness = |correlation|, colour = green (positive) or red (negative).
- Layout updates when correlation window changes or when new price data arrives.
- During market stress (high average correlation), the graph visibly contracts. A "correlation regime" indicator shows: "Diversified" (spread out), "Moderate" (some clusters), "Stress" (tight ball).

**API:** Existing klines endpoints for multiple assets.

---

### Phase 7: Yield Curve with Recession Signal

**Goal:** Treasury yield curve with Nelson-Siegel parametric fit and recession-probability overlay.

**WASM (`yieldcurve.rs`):**
- Input: arrays of maturities (in years) and yields (%) for the current date, plus historical yield data for recession analysis.
- Computation (Nelson-Siegel):
  1. Fit the 4-parameter Nelson-Siegel model via nonlinear least squares (Levenberg-Marquardt, 20 iterations):
     ```
     y(tau) = beta0 + beta1 * [(1-exp(-tau/lambda)) / (tau/lambda)]
                      + beta2 * [(1-exp(-tau/lambda)) / (tau/lambda) - exp(-tau/lambda)]
     ```
  2. beta0 = long-run level, beta1 = slope, beta2 = curvature, lambda = decay.
- Computation (Recession probability):
  1. Spread = yield(10Y) - yield(3M). Negative spread = inversion.
  2. Logistic model: P(recession in 12M) = 1 / (1 + exp(-(a + b*spread))).
  3. Calibrate a,b from historical FRED recession data (pre-computed constants).
- Output: fitted curve points, NS parameters, spread value, recession probability.

**SolidJS (`YieldCurveChart.tsx`):**
- Canvas line chart. X = maturity (1MO to 30Y on log scale). Y = yield (%).
- Raw yield points as dots. Nelson-Siegel fitted curve as a smooth line.
- Recession probability gauge in the corner. 2Y-10Y and 3M-10Y spreads annotated.
- When the curve inverts (short rates above long rates), the chart background shifts to a warning colour and a "RECESSION SIGNAL" label appears.

**API:** New endpoint `/api/treasury-yields` fetches DGS1MO, DGS3MO, DGS6MO, DGS1, DGS2, DGS5, DGS7, DGS10, DGS20, DGS30 from FRED. Cache 1 hour.

---

### Phase 8: Options P&L Payoff Diagram

**Goal:** Options strategy payoff curves with breakeven and max profit/loss annotations.

**WASM (reuse `blackscholes.rs`):**
- Input: array of legs, each with {type: call/put, strike, premium, quantity, action: buy/sell}, spot price range.
- Computation: For each spot price in the range, sum the payoff of all legs at expiry (intrinsic value) and subtract the net premium. Also compute the "value at time T" using Black-Scholes for a user-selected time-to-expiry slider.
- Output: payoff curve at expiry, payoff curve at selected time, breakeven points, max profit, max loss.

**SolidJS (`OptionsPayoff.tsx`):**
- Canvas line chart. X = underlying price. Y = profit/loss.
- Solid line = payoff at expiry. Dashed line = payoff at current time (B-S valued).
- Zero line (breakeven) clearly marked. Profit zone shaded green, loss zone shaded red.
- Strategy presets: Long Call, Long Put, Bull Call Spread, Iron Condor, Straddle, Covered Call.
- User adds legs via a form. If Deribit data is available for BTC/ETH, auto-fill strikes and premiums from the options chain.

**API:** Reuses `/api/deribit-options` from Phase 3 for auto-filling.

---

### Phase 9: Rolling Correlation Heatmap

**Goal:** Animated heatmap matrix showing how correlations between assets change over time.

**WASM (`stats.rs`):**
- Input: returns matrix (N assets x T periods), window size (default 60 days).
- Computation: For each window position t, compute the N x N rolling correlation matrix. Output as a time series of matrices (or sample at intervals).
- Output: 3D array [time_steps, N, N] of correlation values. Client renders as a heatmap with a time slider.

**SolidJS (`RollingCorrelationHeatmap.tsx`):**
- Canvas heatmap. N x N grid of coloured cells. Colour scale: deep red (-1) through white (0) to deep green (+1). Diagonal always green (self-correlation = 1).
- Time slider below the heatmap scrubs through the rolling windows. As the user drags, the heatmap animates.
- Auto-play mode: cycles through windows at 2 FPS.
- Asset labels on both axes.

**API:** Existing klines endpoints for multiple assets.

---

### Phase 10: Funding Rate Heatmap

**Goal:** Heatmap of perpetual futures funding rates across assets, revealing long/short bias.

**WASM (minimal computation, mostly rendering):**
- Input: array of {symbol, fundingRate, nextFundingTime} for 50+ perpetual contracts.
- Computation: Normalise rates to basis points, compute z-scores relative to historical mean (if available).
- Output: sorted array with colour values.

**SolidJS (`FundingRateHeatmap.tsx`):**
- Canvas bar chart or treemap. Each bar/cell represents a perp contract. Height/size = open interest. Colour = funding rate (green = positive = longs pay shorts, red = negative = shorts pay longs).
- Sortable: by rate, by volume, by OI.
- When the aggregate funding rate across all contracts is negative (shorts dominant), a market sentiment indicator shows "BEARISH FUNDING".

**API:** New endpoint `/api/funding-rates` proxies Binance `/fapi/v1/premiumIndex`. Cache 1 minute.

---

## Execution Order

| Order | Phase | Effort | Depends On | New API? |
|-------|-------|--------|------------|----------|
| 1 | Monte Carlo Fan | 6h | None | No |
| 2 | Efficient Frontier | 8h | None | No |
| 3 | Correlation Network | 6h | None | No |
| 4 | GARCH Volatility | 5h | None | No |
| 5 | VaR / Expected Shortfall | 4h | Phase 1 (optional) | No |
| 6 | Yield Curve + Recession | 6h | None | `/api/treasury-yields` |
| 7 | Black-Scholes Greeks | 8h | None | `/api/deribit-options` |
| 8 | Options P&L Payoff | 4h | Phase 7 | Reuses Phase 7 API |
| 9 | Rolling Correlation Heatmap | 5h | None | No |
| 10 | Funding Rate Heatmap | 3h | None | `/api/funding-rates` |
| **Total** | | **55h** | | **3 new endpoints** |

## New API Endpoints

### `/api/deribit-options`
```
GET /api/deribit-options?currency=BTC
Proxy: https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option
Cache: 5 minutes
Response: [{ instrument, strike, expiry, iv, mark_price, volume, oi, underlying_price }]
```

### `/api/treasury-yields`
```
GET /api/treasury-yields
Proxy: FRED CSV for DGS1MO, DGS3MO, DGS6MO, DGS1, DGS2, DGS5, DGS7, DGS10, DGS20, DGS30
Cache: 1 hour
Response: [{ maturity: "1MO", yield: 4.05 }, ...]
```

### `/api/funding-rates`
```
GET /api/funding-rates
Proxy: https://fapi.binance.com/fapi/v1/premiumIndex
Cache: 1 minute
Response: [{ symbol: "BTCUSDT", rate: 0.0001, nextFunding: timestamp }]
```

## WASM Module Structure

```
packages/widgets/src/
  quant/
    mod.rs              -- module declarations, re-exports
    montecarlo.rs       -- GBM simulation, Box-Muller random
    blackscholes.rs     -- BS pricing, Greeks, erf approximation
    portfolio.rs        -- Markowitz, covariance, frontier
    risk.rs             -- VaR, ES, drawdown, Sharpe
    volatility.rs       -- GARCH(1,1) MLE, EWMA, realized vol
    stats.rs            -- correlation, regression, PCA, cointegration
    yieldcurve.rs       -- Nelson-Siegel, recession probability
    rng.rs              -- xorshift128+ PRNG (faster than Math.random)
  lib.rs                -- add `mod quant;` and re-exports
```

Each quant function follows the existing `create_*` / `update_*` pattern:
```rust
#[wasm_bindgen]
pub fn create_montecarlo(canvas_id: &str, w: u32, h: u32) { ... }

#[wasm_bindgen]
pub fn update_montecarlo(canvas_id: &str, w: u32, h: u32, params_json: &str) { ... }
```

The `params_json` parameter carries typed input from SolidJS:
```json
{
  "paths": [[65000, 65100, ...], ...],
  "percentiles": { "p5": [...], "p25": [...], ... },
  "historical": [58000, 58500, ...],
  "config": { "horizon_days": 90, "colors": { ... } }
}
```

## SolidJS Component Pattern

Each quant component follows this structure:
```tsx
export default function MonteCarloFan(props: { symbol: string }) {
  const [paths, setPaths] = createSignal<number[][]>([]);
  const [percentiles, setPercentiles] = createSignal<...>({});

  onMount(async () => {
    // 1. Fetch historical data
    const klines = await fetch(`/api/binance-klines?symbol=${props.symbol}&interval=1d&limit=365`);
    const closes = (await klines.json()).map(k => k.close);

    // 2. Load WASM module
    const wasm = await import('/wasm/hydrated_widgets.js');
    await wasm.default();

    // 3. Compute (could also be done in WASM via canvas)
    // For non-canvas computations, expose pure functions:
    const result = wasm.simulate_montecarlo(
      new Float64Array(closes),
      1000,  // paths
      252,   // steps
    );

    // 4. Process results
    setPaths(result.paths);
    setPercentiles(computePercentiles(result.paths));
  });

  // 5. Render canvas
  return <canvas ref={canvasRef} ... />;
}
```

## Testing Strategy

Each WASM module gets a Rust unit test:
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_blackscholes_atm() {
        // ATM call with S=K=100, T=1, r=0.05, sigma=0.2
        // Theoretical price = 10.4506
        let price = bs_call(100.0, 100.0, 1.0, 0.05, 0.2);
        assert!((price - 10.4506).abs() < 0.01);
    }

    #[test]
    fn test_garch_convergence() {
        // GARCH params should converge to known values on synthetic data
    }

    #[test]
    fn test_montecarlo_martingale() {
        // Average of GBM paths should be close to S0 * exp(drift * T)
    }
}
```

Each SolidJS component gets a test verifying it renders and updates:
```tsx
// Deferred until vite-plugin-solid Vite 8 compat is resolved
```

## Performance Budget

| Feature | WASM Time | JS Equivalent | Speedup | Canvas FPS |
|---------|-----------|---------------|---------|------------|
| Monte Carlo (1000 paths) | <10ms | ~80ms | 8x | 60 |
| Markowitz (10k portfolios) | <15ms | ~120ms | 8x | 60 |
| Black-Scholes (200 points) | <1ms | ~8ms | 8x | 60 |
| GARCH MLE | <5ms | ~40ms | 8x | n/a |
| VaR sort (5000 returns) | <1ms | ~3ms | 3x | n/a |
| Correlation network (500 iter) | <5ms | ~30ms | 6x | 30 |
| Nelson-Siegel fit | <2ms | ~15ms | 7x | n/a |

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Yahoo Finance API breaks | Twelve Data as backup (free tier). Circuit breaker on worker catches failures. |
| Deribit API rate limit | Cache 5 min. 892 contracts in one response, so one call suffices. |
| Binance geo-blocking | CoinGecko fallback already implemented. |
| WASM load time | Shared module already loaded for existing widgets. Quant functions add ~20KB to the existing 256KB binary. |
| Canvas performance on low-end devices | Cap path count and animation FPS based on `navigator.hardwareConcurrency`. |
| Data staleness | StaleIndicator component already tracks fetch timestamps per endpoint. |

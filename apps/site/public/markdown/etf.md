# ETF Intelligence — database and analysis

ETF database with 89 ETFs: allocation analysis, portfolio comparison,
correlation matrix, Monte Carlo simulation, VaR, portfolio backtesting,
and walk-forward analysis.

## What can I analyze on the ETF page?

- Search and compare 89 ETFs by asset class and provider.
- Allocation breakdown and correlation matrices.
- Monte Carlo simulation and Value-at-Risk (VaR) for portfolio construction.
- Walk-forward backtesting of allocation strategies.
- Efficient frontier and HRP allocation demos.

All quantitative computation runs client-side in Rust/WebAssembly — no
server round-trips, no data leaves the browser.

## Frequently asked questions

**How many ETFs are in the database?** 89 ETFs with allocation analysis, correlation matrices, Monte Carlo simulation, VaR, portfolio backtesting, and walk-forward analysis.

**Does the ETF analysis send my data anywhere?** No. All quantitative computation runs client-side in Rust compiled to WebAssembly — no server round-trips, no data leaves the browser.

**What can I backtest?** Allocation strategies with walk-forward analysis, Monte Carlo forecast paths, drawdown profiles, and risk/return scatter against the selected benchmark.

//! Hydrated Widgets — Rust/WASM module collection for client-side computation.
//!
//! 16 canvas widgets grouped under four domains (science, finance, devtools,
//! creative) plus a quant module for client-side quantitative finance
//! computation (Monte Carlo, Black-Scholes, Markowitz, GARCH, VaR, etc.).
//! Canvas widgets follow the `create_<widget>` / `update_<widget>` naming
//! convention. Quant functions are pure (no canvas binding) and return
//! typed structs for the caller to render.

// web-sys marks `CanvasRenderingContext2d::set_fill_style` / `set_stroke_style`
// as deprecated in favour of struct-field assignment, but the setter remains
// the only ergonomic path when the caller holds a `JsValue`-backed style
// string. The trait-based replacement requires `FillStyle` conversions that
// would balloon boilerplate across 16 widgets without behavioural benefit.
#![allow(deprecated)]

mod science;
mod devtools;
mod finance;
mod creative;
pub mod quant;
pub mod showcase;
pub mod data_structures;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

pub use science::fourier::create_fourier_viz;
pub use science::cellular::create_cellular_automata;
pub use science::climate::{create_climate, update_climate};
pub use science::physics::create_physics;
pub use science::audio_viz::create_audio_visualizer;
pub use science::nbody::create_nbody_simulation;
pub use science::terrain::create_terrain_generator;

pub use devtools::regex::{create_regex_playground, update_regex_playground};
pub use devtools::network::{create_network, update_network};

pub use finance::order_book::{create_order_book, update_order_book};
pub use finance::treemap::{create_treemap, update_treemap};
pub use finance::btc_health::{create_btc_health, update_btc_health};
pub use finance::correlation::{create_correlation, update_correlation};
pub use finance::backtest::{create_backtest, update_backtest};

pub use creative::generative::{create_generative, update_generative};
pub use creative::colorblind::{create_colorblind, update_colorblind};

// ============================================================
// QUANT MODULE — WASM-callable pure computation functions.
// These return JSON strings that SolidJS deserializes and renders.
// No canvas binding; caller controls rendering.
// ============================================================

/// Monte Carlo GBM simulation from historical close prices.
/// Returns JSON: { drift, volatility, s0, p5, p25, p50, p75, p95 }
#[wasm_bindgen]
pub fn quant_montecarlo(
    closes: &[f64],
    periods_per_year: u32,
    horizon_days: usize,
    num_paths: usize,
) -> String {
    plycompute::wasm::quant_montecarlo(closes, periods_per_year, horizon_days, num_paths)
}

/// Black-Scholes call Greeks across a spot price range.
/// Returns JSON: { spot: [...], delta: [...], gamma: [...], theta: [...], vega: [...], rho: [...] }
#[wasm_bindgen]
pub fn quant_greeks(
    spot_min: f64,
    spot_max: f64,
    num_points: usize,
    strike: f64,
    time_to_expiry: f64,
    risk_free_rate: f64,
    implied_vol: f64,
    is_call: bool,
) -> String {
    plycompute::wasm::quant_greeks(spot_min, spot_max, num_points, strike, time_to_expiry, risk_free_rate, implied_vol, is_call)
}

/// Value at Risk and Expected Shortfall from a return series.
#[wasm_bindgen]
pub fn quant_var(returns: &[f64], alpha: f64) -> String {
    plycompute::wasm::quant_var(returns, alpha)
}

/// GARCH(1,1) fit and forecast.
#[wasm_bindgen]
pub fn quant_garch(returns: &[f64], forecast_steps: usize) -> String {
    plycompute::wasm::quant_garch(returns, forecast_steps)
}

/// Correlation matrix from a returns matrix (N assets x T periods, row-major).
#[wasm_bindgen]
pub fn quant_correlation_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> String {
    plycompute::wasm::quant_correlation_matrix(returns, n_assets, n_periods)
}

/// Nelson-Siegel yield curve fit.
#[wasm_bindgen]
pub fn quant_yield_curve(maturities: &[f64], yields: &[f64]) -> String {
    plycompute::wasm::quant_yield_curve(maturities, yields)
}

/// Seed the WASM PRNG from JS (use crypto.getRandomValues for entropy).
#[wasm_bindgen]
pub fn quant_seed(s0: f64, s1: f64) {
    plycompute::wasm::quant_seed(s0, s1)
}

/// Drawdown analysis from price series.
/// Returns JSON: { underwater, max_drawdown, max_dd_duration, current_drawdown, calmar, ulcer, pain }
#[wasm_bindgen]
pub fn quant_drawdown(prices: &[f64], periods_per_year: u32) -> String {
    plycompute::wasm::quant_drawdown(prices, periods_per_year)
}

/// Concentration analysis from portfolio weights.
/// Returns JSON: { hhi, normalised_hhi, effective_n, entropy, max_entropy, top5, top10, gini, classification }
#[wasm_bindgen]
pub fn quant_concentration(weights: &[f64]) -> String {
    plycompute::wasm::quant_concentration(weights)
}

/// Factor exposure regression (OLS).
/// Returns JSON: { alpha, betas, r_squared, adj_r_squared, f_statistic, t_stats }
#[wasm_bindgen]
pub fn quant_factor_regression(
    y: &[f64],
    x: &[f64],
    n_factors: usize,
    n_obs: usize,
) -> String {
    plycompute::wasm::quant_factor_regression(y, x, n_factors, n_obs)
}

/// Efficient frontier computation.
/// Returns JSON: {
///   random: [{ret, risk, sharpe}, ...],
///   frontier: [{ret, risk, sharpe}, ...],
///   assets: [{label, ret, risk}, ...],
///   tangency: {ret, risk, sharpe},
///   min_variance: {ret, risk}
/// }
#[wasm_bindgen]
pub fn quant_efficient_frontier(
    returns: &[f64],
    n_assets: usize,
    n_periods: usize,
    risk_free: f64,
    n_random: usize,
    n_frontier: usize,
    periods_per_year: u32,
) -> String {
    plycompute::wasm::quant_efficient_frontier(returns, n_assets, n_periods, risk_free, n_random, n_frontier, periods_per_year)
}

/// Engle-Granger cointegration test for two price series.
/// Returns JSON: { hedge_ratio, intercept, adf_statistic, half_life, is_cointegrated, z_score }
#[wasm_bindgen]
pub fn quant_cointegration(y: &[f64], x: &[f64]) -> String {
    plycompute::wasm::quant_cointegration(y, x)
}

/// Liquidity analysis from OHLCV data.
/// Returns JSON: { amihud, cs_spread, roll_spread, kyle_lambda, avg_dollar_volume }
#[wasm_bindgen]
pub fn quant_liquidity(highs: &[f64], lows: &[f64], closes: &[f64], volumes: &[f64]) -> String {
    plycompute::wasm::quant_liquidity(highs, lows, closes, volumes)
}

/// Realized volatility decomposition (bipower variation).
/// Returns JSON: { realized_var, bipower_var, continuous_var, jump_var, jump_ratio, annualized_vol, jump_days }
#[wasm_bindgen]
pub fn quant_realized_vol(returns: &[f64]) -> String {
    plycompute::wasm::quant_realized_vol(returns)
}

/// Tail dependence (copula) analysis for two return series.
/// Returns JSON: { lower, upper, kendall_tau, spearman_rho }
#[wasm_bindgen]
pub fn quant_tail_dependence(x: &[f64], y: &[f64]) -> String {
    plycompute::wasm::quant_tail_dependence(x, y)
}

/// Market regime detection via 2-state Gaussian HMM.
/// Returns JSON: { states_tail, transition, means, variances, probs_tail, current_regime, regime_label }
#[wasm_bindgen]
pub fn quant_regime(returns: &[f64]) -> String {
    plycompute::wasm::quant_regime(returns)
}

/// Holdings overlap analysis (Jaccard index).
#[wasm_bindgen]
pub fn quant_holdings_overlap(a: &str, b: &str) -> String {
    plycompute::wasm::quant_holdings_overlap(a, b)
}

/// Pairs trading signal from two cointegrated price series.
#[wasm_bindgen]
pub fn quant_pairs_signal(y: &[f64], x: &[f64]) -> String {
    plycompute::wasm::quant_pairs_signal(y, x)
}

/// Historical stress test on a portfolio.
#[wasm_bindgen]
pub fn quant_stress_test(symbols_json: &str, weights: &[f64]) -> String {
    plycompute::wasm::quant_stress_test(symbols_json, weights)
}

/// Component VaR decomposition.
#[wasm_bindgen]
pub fn quant_component_var(
    returns: &[f64], n_assets: usize, n_periods: usize, weights: &[f64], alpha: f64,
) -> String {
    plycompute::wasm::quant_component_var(returns, n_assets, n_periods, weights, alpha)
}

/// Kelly criterion analysis from returns.
#[wasm_bindgen]
pub fn quant_kelly(returns: &[f64]) -> String {
    plycompute::wasm::quant_kelly(returns)
}

/// Hierarchical Risk Parity allocation.
#[wasm_bindgen]
pub fn quant_hrp(returns: &[f64], n_assets: usize, n_periods: usize) -> String {
    plycompute::wasm::quant_hrp(returns, n_assets, n_periods)
}

/// Black-Scholes implied volatility solver (Newton-Raphson).
#[wasm_bindgen]
pub fn quant_implied_vol(market_price: f64, spot: f64, strike: f64, t: f64, r: f64, is_call: bool) -> f64 {
    plycompute::wasm::quant_implied_vol(market_price, spot, strike, t, r, is_call)
}

/// Risk-adjusted return ratios (Sharpe, Sortino, Calmar, Treynor).
#[wasm_bindgen]
pub fn quant_risk_ratios(closes: &[f64], risk_free: f64, periods_per_year: u32) -> String {
    plycompute::wasm::quant_risk_ratios(closes, risk_free, periods_per_year)
}

/// Forward rate curve from Nelson-Siegel parameters.
/// Derives instantaneous forward rates: f(τ) = d/dτ [τ · y(τ)]
#[wasm_bindgen]
pub fn quant_forward_rates(maturities: &[f64], yields: &[f64]) -> String {
    plycompute::wasm::quant_forward_rates(maturities, yields)
}

/// Full weighted ETF holdings overlap analysis.
#[wasm_bindgen]
pub fn quant_full_overlap(
    tickers_a: &str, weights_a: &[f64],
    tickers_b: &str, weights_b: &[f64],
) -> String {
    plycompute::wasm::quant_full_overlap(tickers_a, weights_a, tickers_b, weights_b)
}

/// N×N tail dependence matrix (lower tail, 5% level).
#[wasm_bindgen]
pub fn quant_tail_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> String {
    plycompute::wasm::quant_tail_matrix(returns, n_assets, n_periods)
}

/// Rolling multi-factor regression time series.
#[wasm_bindgen]
pub fn quant_rolling_factor(
    y: &[f64], x: &[f64], n_factors: usize, window: usize, step: usize,
) -> String {
    plycompute::wasm::quant_rolling_factor(y, x, n_factors, window, step)
}

/// Black-Litterman portfolio optimization.
/// Combines market equilibrium prior with investor views.
#[wasm_bindgen]
pub fn quant_black_litterman(
    returns: &[f64], n_assets: usize, n_periods: usize,
    views: &[f64],    // Q vector (n_views)
    picking: &[f64],  // P matrix (n_views × n_assets), row-major
    n_views: usize,
    risk_free: f64,
    tau: f64,
) -> String {
    plycompute::wasm::quant_black_litterman(returns, n_assets, n_periods, views, picking, n_views, risk_free, tau)
}

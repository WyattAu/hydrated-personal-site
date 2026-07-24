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

use quant::montecarlo;
use quant::blackscholes;
use quant::risk;
use quant::volatility;
use quant::stats;
use quant::yieldcurve;
use quant::rng;
use quant::drawdown;
use quant::concentration;
use quant::factor;
use quant::portfolio;
use quant::cointegration;
use quant::liquidity;
use quant::realizedvol;
use quant::copula;
use quant::regime;
use quant::pairs;
use quant::stress;
use quant::risk_decomp;
use quant::hrp;
use quant::overlap;

/// Monte Carlo GBM simulation from historical close prices.
/// Returns JSON: { drift, volatility, s0, p5, p25, p50, p75, p95 }
#[wasm_bindgen]
pub fn quant_montecarlo(
    closes: &[f64],
    periods_per_year: u32,
    horizon_days: usize,
    num_paths: usize,
) -> String {
    let result = montecarlo::montecarlo_from_prices(closes, periods_per_year, horizon_days, num_paths);
    serde_json::to_string(&serde_json::json!({
        "drift": result.drift,
        "volatility": result.volatility,
        "s0": result.s0,
        "p5": result.p5,
        "p25": result.p25,
        "p50": result.p50,
        "p75": result.p75,
        "p95": result.p95,
    })).unwrap_or_else(|_| "{}".to_string())
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
    let step = (spot_max - spot_min) / (num_points.max(1) - 1).max(1) as f64;
    let mut spots = Vec::with_capacity(num_points);
    let mut deltas = Vec::with_capacity(num_points);
    let mut gammas = Vec::with_capacity(num_points);
    let mut thetas = Vec::with_capacity(num_points);
    let mut vegas = Vec::with_capacity(num_points);
    let mut rhos = Vec::with_capacity(num_points);

    for i in 0..num_points {
        let s = spot_min + i as f64 * step;
        let (d, g, t, v, r) = if is_call {
            blackscholes::call_greeks(s, strike, time_to_expiry, risk_free_rate, implied_vol)
        } else {
            blackscholes::put_greeks(s, strike, time_to_expiry, risk_free_rate, implied_vol)
        };
        spots.push(s);
        deltas.push(d);
        gammas.push(g);
        thetas.push(t);
        vegas.push(v);
        rhos.push(r);
    }

    serde_json::to_string(&serde_json::json!({
        "spot": spots, "delta": deltas, "gamma": gammas,
        "theta": thetas, "vega": vegas, "rho": rhos,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Value at Risk and Expected Shortfall from a return series.
#[wasm_bindgen]
pub fn quant_var(returns: &[f64], alpha: f64) -> String {
    let var_hist = risk::var_historical(returns, alpha);
    let es_hist = risk::expected_shortfall(returns, alpha);
    let m = montecarlo::mean(returns);
    let s = montecarlo::std_dev(returns);
    let var_par = risk::var_parametric(m, s, alpha);
    let es_par = risk::es_parametric(m, s, alpha);
    let (edges, counts) = risk::histogram(returns, 50);

    serde_json::to_string(&serde_json::json!({
        "var_historical": var_hist,
        "es_historical": es_hist,
        "var_parametric": var_par,
        "es_parametric": es_par,
        "histogram_edges": edges,
        "histogram_counts": counts,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// GARCH(1,1) fit and forecast.
#[wasm_bindgen]
pub fn quant_garch(returns: &[f64], forecast_steps: usize) -> String {
    let result = volatility::fit_garch11(returns, forecast_steps);
    let ewma = volatility::ewma_volatility(returns, 0.94);
    let realized = volatility::realized_volatility(returns, 21.min(returns.len()));

    serde_json::to_string(&serde_json::json!({
        "omega": result.omega,
        "alpha": result.alpha,
        "beta": result.beta,
        "long_run_var": result.long_run_var,
        "conditional_vars": result.conditional_vars,
        "forecast": result.forecast,
        "ewma_vol": ewma,
        "realized_vol": realized,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Correlation matrix from a returns matrix (N assets x T periods, row-major).
#[wasm_bindgen]
pub fn quant_correlation_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> String {
    let matrix = stats::correlation_matrix(returns, n_assets, n_periods);
    serde_json::to_string(&serde_json::json!({
        "matrix": matrix,
        "n_assets": n_assets,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Nelson-Siegel yield curve fit.
#[wasm_bindgen]
pub fn quant_yield_curve(maturities: &[f64], yields: &[f64]) -> String {
    let fit = yieldcurve::fit_nelson_siegel(maturities, yields);
    let spread_10y_3m = {
        let mut y10 = 0.0;
        let mut y3m = 0.0;
        for i in 0..maturities.len().min(yields.len()) {
            if (maturities[i] - 10.0).abs() < 0.1 { y10 = yields[i]; }
            if (maturities[i] - 0.25).abs() < 0.1 { y3m = yields[i]; }
        }
        y10 - y3m
    };
    let recession_prob = yieldcurve::recession_probability(spread_10y_3m);

    serde_json::to_string(&serde_json::json!({
        "beta0": fit.beta0,
        "beta1": fit.beta1,
        "beta2": fit.beta2,
        "lambda": fit.lambda,
        "fitted": fit.fitted,
        "spread_10y_3m": spread_10y_3m,
        "recession_probability": recession_prob,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Seed the WASM PRNG from JS (use crypto.getRandomValues for entropy).
#[wasm_bindgen]
pub fn quant_seed(s0: f64, s1: f64) {
    rng::seed(s0 as u64, s1 as u64);
}

/// Drawdown analysis from price series.
/// Returns JSON: { underwater, max_drawdown, max_dd_duration, current_drawdown, calmar, ulcer, pain }
#[wasm_bindgen]
pub fn quant_drawdown(prices: &[f64], periods_per_year: u32) -> String {
    let dd = drawdown::analyze_drawdowns(prices);
    let calmar = drawdown::calmar_ratio(prices, periods_per_year);
    let ulcer = drawdown::ulcer_index(prices);
    let pain = drawdown::pain_index(prices);
    serde_json::to_string(&serde_json::json!({
        "underwater": dd.underwater,
        "max_drawdown": dd.max_drawdown,
        "max_dd_duration": dd.max_dd_duration,
        "current_drawdown": dd.current_drawdown,
        "calmar": calmar,
        "ulcer_index": ulcer,
        "pain_index": pain,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Concentration analysis from portfolio weights.
/// Returns JSON: { hhi, normalised_hhi, effective_n, entropy, max_entropy, top5, top10, gini, classification }
#[wasm_bindgen]
pub fn quant_concentration(weights: &[f64]) -> String {
    let result = concentration::full_analysis(weights);
    serde_json::to_string(&serde_json::json!({
        "hhi": result.hhi,
        "normalised_hhi": result.normalised_hhi,
        "effective_n": result.effective_n,
        "entropy": result.entropy,
        "max_entropy": result.max_entropy,
        "top5_concentration": result.top5_concentration,
        "top10_concentration": result.top10_concentration,
        "gini": result.gini,
        "classification": result.classification,
    })).unwrap_or_else(|_| "{}".to_string())
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
    let result = factor::ols_regression(y, x, n_factors, n_obs);
    serde_json::to_string(&serde_json::json!({
        "alpha": result.alpha,
        "betas": result.betas,
        "r_squared": result.r_squared,
        "adj_r_squared": result.adj_r_squared,
        "f_statistic": result.f_statistic,
        "t_stats": result.t_stats,
    })).unwrap_or_else(|_| "{}".to_string())
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
    // Compute random portfolio cloud
    let rand_pts = portfolio::random_portfolios(
        returns, n_assets, n_periods, n_random, risk_free, periods_per_year,
    );
    let rand_json: Vec<_> = rand_pts.iter().map(|p| {
        serde_json::json!({ "ret": p.ret * 100.0, "risk": p.risk * 100.0, "sharpe": p.sharpe })
    }).collect();

    // Compute analytical efficient frontier
    let front_pts = portfolio::efficient_frontier(
        returns, n_assets, n_periods, risk_free, n_frontier, periods_per_year,
    );
    let front_json: Vec<_> = front_pts.iter().map(|p| {
        serde_json::json!({ "ret": p.ret * 100.0, "risk": p.risk * 100.0, "sharpe": p.sharpe })
    }).collect();

    // Individual asset positions on the risk/return plot
    let mean_vec: Vec<f64> = (0..n_assets)
        .map(|i| {
            let row: Vec<f64> = (0..n_periods).map(|t| returns[i * n_periods + t]).collect();
            montecarlo::mean(&row) * periods_per_year as f64
        })
        .collect();
    let cov = stats::covariance_matrix(returns, n_assets, n_periods);
    let asset_json: Vec<_> = (0..n_assets).map(|i| {
        let asset_risk = (cov[i * n_assets + i] * periods_per_year as f64).sqrt() * 100.0;
        serde_json::json!({ "idx": i, "ret": mean_vec[i] * 100.0, "risk": asset_risk })
    }).collect();

    // Tangency portfolio (max Sharpe) — best point on the frontier
    let tan = front_pts.iter()
        .max_by(|a, b| a.sharpe.partial_cmp(&b.sharpe).unwrap_or(std::cmp::Ordering::Equal));
    let min_var = front_pts.iter()
        .min_by(|a, b| a.risk.partial_cmp(&b.risk).unwrap_or(std::cmp::Ordering::Equal));

    serde_json::to_string(&serde_json::json!({
        "random": rand_json,
        "frontier": front_json,
        "assets": asset_json,
        "tangency": tan.map(|p| serde_json::json!({
            "ret": p.ret * 100.0, "risk": p.risk * 100.0, "sharpe": p.sharpe
        })).unwrap_or(serde_json::json!(null)),
        "min_variance": min_var.map(|p| serde_json::json!({
            "ret": p.ret * 100.0, "risk": p.risk * 100.0
        })).unwrap_or(serde_json::json!(null)),
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Engle-Granger cointegration test for two price series.
/// Returns JSON: { hedge_ratio, intercept, adf_statistic, half_life, is_cointegrated, z_score }
#[wasm_bindgen]
pub fn quant_cointegration(y: &[f64], x: &[f64]) -> String {
    let result = cointegration::engle_granger(y, x);
    serde_json::to_string(&serde_json::json!({
        "hedge_ratio": result.hedge_ratio,
        "intercept": result.intercept,
        "adf_statistic": result.adf_statistic,
        "half_life": result.half_life,
        "is_cointegrated": result.is_cointegrated,
        "z_score": result.z_score,
        "spread_tail": result.spread.iter().rev().take(60).cloned().collect::<Vec<_>>(),
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Liquidity analysis from OHLCV data.
/// Returns JSON: { amihud, cs_spread, roll_spread, kyle_lambda, avg_dollar_volume }
#[wasm_bindgen]
pub fn quant_liquidity(highs: &[f64], lows: &[f64], closes: &[f64], volumes: &[f64]) -> String {
    let result = liquidity::analyze(highs, lows, closes, volumes);
    serde_json::to_string(&serde_json::json!({
        "amihud": result.amihud,
        "cs_spread": result.cs_spread,
        "roll_spread": result.roll_spread,
        "kyle_lambda": result.kyle_lambda,
        "avg_dollar_volume": result.avg_dollar_volume,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Realized volatility decomposition (bipower variation).
/// Returns JSON: { realized_var, bipower_var, continuous_var, jump_var, jump_ratio, annualized_vol, jump_days }
#[wasm_bindgen]
pub fn quant_realized_vol(returns: &[f64]) -> String {
    let result = realizedvol::decompose(returns);
    serde_json::to_string(&serde_json::json!({
        "realized_var": result.realized_var,
        "bipower_var": result.bipower_var,
        "continuous_var": result.continuous_var,
        "jump_var": result.jump_var,
        "jump_ratio": result.jump_ratio,
        "annualized_vol": result.annualized_vol,
        "jump_days": result.jump_days,
        "daily_rv_tail": result.daily_rv.iter().rev().take(90).cloned().collect::<Vec<_>>(),
        "daily_bv_tail": result.daily_bv.iter().rev().take(90).cloned().collect::<Vec<_>>(),
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Tail dependence (copula) analysis for two return series.
/// Returns JSON: { lower, upper, kendall_tau, spearman_rho }
#[wasm_bindgen]
pub fn quant_tail_dependence(x: &[f64], y: &[f64]) -> String {
    let result = copula::tail_dependence(x, y, 0.05);
    serde_json::to_string(&serde_json::json!({
        "lower": result.lower,
        "upper": result.upper,
        "kendall_tau": result.kendall_tau,
        "spearman_rho": result.spearman_rho,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Market regime detection via 2-state Gaussian HMM.
/// Returns JSON: { states_tail, transition, means, variances, probs_tail, current_regime, regime_label }
#[wasm_bindgen]
pub fn quant_regime(returns: &[f64]) -> String {
    let result = regime::detect_regimes(returns, 50);
    let current = result.states.last().copied().unwrap_or(0);
    let label = if current == 0 { "LOW-VOL" } else { "HIGH-VOL" };
    serde_json::to_string(&serde_json::json!({
        "states_tail": result.states.iter().rev().take(120).cloned().collect::<Vec<_>>(),
        "transition": result.transition,
        "means": result.means,
        "variances": result.variances,
        "probs_tail": result.probabilities.iter().rev().take(120).cloned().collect::<Vec<_>>(),
        "current_regime": current,
        "regime_label": label,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Holdings overlap analysis (Jaccard index).
#[wasm_bindgen]
pub fn quant_holdings_overlap(a: &str, b: &str) -> String {
    let set_a: Vec<String> = a.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
    let set_b: Vec<String> = b.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
    let jaccard = quant::overlap::jaccard_index(&set_a, &set_b);
    let intersection = set_a.iter().filter(|x| set_b.contains(x)).count();
    let union_count = set_a.iter().chain(set_b.iter()).collect::<std::collections::HashSet<_>>().len();
    serde_json::to_string(&serde_json::json!({
        "jaccard": jaccard,
        "a_count": set_a.len(),
        "b_count": set_b.len(),
        "intersection": intersection,
        "union": union_count,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Pairs trading signal from two cointegrated price series.
#[wasm_bindgen]
pub fn quant_pairs_signal(y: &[f64], x: &[f64]) -> String {
    let result = pairs::pairs_signal(y, x, 2.0, 0.5, 3.5);
    serde_json::to_string(&serde_json::json!({
        "hedge_ratio": result.hedge_ratio,
        "z_score": result.z_score,
        "signal": result.signal,
        "is_cointegrated": result.is_cointegrated,
        "half_life": result.half_life,
        "spread_tail": result.spread_tail,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Historical stress test on a portfolio.
#[wasm_bindgen]
pub fn quant_stress_test(symbols_json: &str, weights: &[f64]) -> String {
    let symbols: Vec<String> = symbols_json
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let results = stress::stress_test(&symbols, weights);
    let json_results: Vec<_> = results.iter().map(|r| {
        serde_json::json!({
            "scenario": r.scenario,
            "description": r.description,
            "year": r.year,
            "portfolio_pnl": r.portfolio_pnl,
            "assets": r.asset_pnls.iter().map(|(sym, cat, shock, contrib)| {
                serde_json::json!({"symbol": sym, "category": cat, "shock_pct": shock, "contribution": contrib})
            }).collect::<Vec<_>>(),
        })
    }).collect();
    serde_json::to_string(&json_results).unwrap_or_else(|_| "[]".to_string())
}

/// Component VaR decomposition.
#[wasm_bindgen]
pub fn quant_component_var(
    returns: &[f64], n_assets: usize, n_periods: usize, weights: &[f64], alpha: f64,
) -> String {
    let result = risk_decomp::component_var(returns, n_assets, n_periods, weights, alpha);
    let pct: Vec<f64> = result.contributions.iter()
        .map(|c| if result.total_var.abs() > 1e-12 { c / result.total_var } else { 0.0 })
        .collect();
    serde_json::to_string(&serde_json::json!({
        "portfolio_var": result.portfolio_var,
        "contributions": result.contributions,
        "percentages": pct,
        "total_var": result.total_var,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Kelly criterion analysis from returns.
#[wasm_bindgen]
pub fn quant_kelly(returns: &[f64]) -> String {
    let result = risk_decomp::kelly_from_returns(returns);
    serde_json::to_string(&serde_json::json!({
        "full_kelly": result.full_kelly,
        "half_kelly": result.half_kelly,
        "quarter_kelly": result.quarter_kelly,
        "win_rate": result.win_rate,
        "profit_factor": result.profit_factor,
        "avg_win": result.avg_win,
        "avg_loss": result.avg_loss,
        "geometric_growth": result.geometric_growth,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Hierarchical Risk Parity allocation.
#[wasm_bindgen]
pub fn quant_hrp(returns: &[f64], n_assets: usize, n_periods: usize) -> String {
    let weights = hrp::hrp_allocate(returns, n_assets, n_periods);
    serde_json::to_string(&serde_json::json!({
        "weights": weights,
        "method": "Hierarchical Risk Parity (Lopez de Prado)",
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Black-Scholes implied volatility solver (Newton-Raphson).
#[wasm_bindgen]
pub fn quant_implied_vol(market_price: f64, spot: f64, strike: f64, t: f64, r: f64, is_call: bool) -> f64 {
    if t <= 0.0 || market_price <= 0.0 || spot <= 0.0 || strike <= 0.0 {
        return 0.0;
    }
    blackscholes::implied_vol(market_price, spot, strike, t, r, is_call)
}

/// Risk-adjusted return ratios (Sharpe, Sortino, Calmar, Treynor).
#[wasm_bindgen]
pub fn quant_risk_ratios(closes: &[f64], risk_free: f64, periods_per_year: u32) -> String {
    let ppy = periods_per_year as f64;
    let rets: Vec<f64> = (1..closes.len()).map(|i| (closes[i] / closes[i - 1]).ln()).collect();
    let sharpe = risk::sharpe_ratio(&rets, risk_free / ppy, periods_per_year);
    let sortino = risk::sortino_ratio(&rets, risk_free / ppy, periods_per_year);
    let calmar = drawdown::calmar_ratio(closes, periods_per_year);
    let dd = drawdown::analyze_drawdowns(closes);
    let mean: f64 = rets.iter().sum::<f64>() / rets.len().max(1) as f64;
    let ann_ret = mean * ppy * 100.0;
    let var: f64 = rets.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / rets.len().max(1) as f64;
    let ann_vol = var.sqrt() * ppy.sqrt() * 100.0;
    let treynor = if ann_vol > 0.0 { (ann_ret - risk_free * 100.0) / (ann_vol / 100.0) } else { 0.0 };
    serde_json::to_string(&serde_json::json!({
        "sharpe": sharpe,
        "sortino": sortino,
        "calmar": calmar,
        "treynor": treynor,
        "ann_return": ann_ret,
        "ann_volatility": ann_vol,
        "max_drawdown": dd.max_drawdown,
        "current_drawdown": dd.current_drawdown,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Forward rate curve from Nelson-Siegel parameters.
/// Derives instantaneous forward rates: f(τ) = d/dτ [τ · y(τ)]
#[wasm_bindgen]
pub fn quant_forward_rates(maturities: &[f64], yields: &[f64]) -> String {
    let fit = yieldcurve::fit_nelson_siegel(maturities, yields);
    let forwards: Vec<f64> = maturities.iter().map(|&tau| {
        yieldcurve::ns_evaluate(&fit, tau)
    }).collect();
    serde_json::to_string(&serde_json::json!({
        "maturities": maturities,
        "spot_rates": yields,
        "forward_rates": forwards,
        "params": {
            "beta0": fit.beta0, "beta1": fit.beta1,
            "beta2": fit.beta2, "lambda": fit.lambda,
        },
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Full weighted ETF holdings overlap analysis.
#[wasm_bindgen]
pub fn quant_full_overlap(
    tickers_a: &str, weights_a: &[f64],
    tickers_b: &str, weights_b: &[f64],
) -> String {
    let ta: Vec<String> = tickers_a.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
    let tb: Vec<String> = tickers_b.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
    let result = overlap::analyze_overlap(&ta, &weights_a, &tb, &weights_b);
    serde_json::to_string(&serde_json::json!({
        "jaccard": result.jaccard_index,
        "weighted_overlap": result.weighted_overlap,
        "common_count": result.common_holdings_count,
        "a_count": ta.len(),
        "b_count": tb.len(),
        "union_count": result.union_count,
        "common_holdings": result.common_holdings.iter().map(|(t, wa, wb)| {
            serde_json::json!({"ticker": t, "weight_a": wa, "weight_b": wb})
        }).collect::<Vec<_>>(),
    })).unwrap_or_else(|_| "{}".to_string())
}

/// N×N tail dependence matrix (lower tail, 5% level).
#[wasm_bindgen]
pub fn quant_tail_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> String {
    let matrix = copula::tail_matrix(returns, n_assets, n_periods);
    serde_json::to_string(&serde_json::json!({
        "matrix": matrix,
        "n_assets": n_assets,
    })).unwrap_or_else(|_| "{}".to_string())
}

/// Rolling multi-factor regression time series.
#[wasm_bindgen]
pub fn quant_rolling_factor(
    y: &[f64], x: &[f64], n_factors: usize, window: usize, step: usize,
) -> String {
    let results = factor::rolling_regression(y, x, n_factors, window, step);
    let series: Vec<_> = results.iter().map(|betas| {
        serde_json::json!({ "betas": betas })
    }).collect();
    serde_json::to_string(&serde_json::json!({
        "series": series,
        "n_points": results.len(),
        "window": window,
        "step": step,
    })).unwrap_or_else(|_| "{}".to_string())
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
    let ppy = n_periods as f64;
    let cov_daily = stats::covariance_matrix(returns, n_assets, n_periods);
    let cov: Vec<f64> = cov_daily.iter().map(|&x| x * ppy).collect();

    // Market equilibrium returns (equal weight prior)
    let eq_returns: Vec<f64> = (0..n_assets).map(|i| {
        let mut sum = 0.0;
        for j in 0..n_assets { sum += cov[i * n_assets + j]; }
        sum * (risk_free + 0.03) / n_assets as f64 // risk premium * cov row sum
    }).collect();

    // Ω = diag(P · τΣ · P') — uncertainty of views
    let omega: Vec<f64> = (0..n_views).map(|k| {
        let mut val = 0.0;
        for i in 0..n_assets {
            for j in 0..n_assets {
                val += picking[k * n_assets + i] * tau * cov[i * n_assets + j] * picking[k * n_assets + j];
            }
        }
        val.max(1e-12)
    }).collect();

    // Posterior returns: E[R] = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ · [(τΣ)⁻¹Π + P'Ω⁻¹Q]
    // Build the matrices and solve
    let tau_sigma: Vec<f64> = cov.iter().map(|&x| x * tau).collect();
    let ts_inv = match stats::matrix_inverse(&tau_sigma, n_assets) {
        Some(inv) => inv,
        None => return "{}".to_string(),
    };

    // P'Ω⁻¹P (n_assets × n_assets)
    let mut p_op_p: Vec<f64> = vec![0.0; n_assets * n_assets];
    for i in 0..n_assets {
        for j in 0..n_assets {
            for k in 0..n_views {
                p_op_p[i * n_assets + j] += picking[k * n_assets + i] * (1.0 / omega[k]) * picking[k * n_assets + j];
            }
        }
    }

    // A = (τΣ)⁻¹ + P'Ω⁻¹P
    let mut a_mat = vec![0.0; n_assets * n_assets];
    for i in 0..n_assets * n_assets {
        a_mat[i] = ts_inv[i] + p_op_p[i];
    }
    let a_inv = match stats::matrix_inverse(&a_mat, n_assets) {
        Some(inv) => inv,
        None => return "{}".to_string(),
    };

    // b = (τΣ)⁻¹Π + P'Ω⁻¹Q
    let mut b_vec = vec![0.0; n_assets];
    for i in 0..n_assets {
        for j in 0..n_assets {
            b_vec[i] += ts_inv[i * n_assets + j] * eq_returns[j];
        }
        for k in 0..n_views {
            b_vec[i] += picking[k * n_assets + i] * (1.0 / omega[k]) * views[k];
        }
    }

    // Posterior returns
    let bl_returns: Vec<f64> = (0..n_assets).map(|i| {
        let mut sum = 0.0;
        for j in 0..n_assets { sum += a_inv[i * n_assets + j] * b_vec[j]; }
        sum
    }).collect();

    // Tangency portfolio on posterior
    let bl_w = stats::tangency_portfolio(&cov, &bl_returns, risk_free, n_assets);
    let bl_ret: f64 = (0..n_assets).map(|i| bl_w[i] * bl_returns[i]).sum();
    let bl_risk = {
        let mut var = 0.0;
        for i in 0..n_assets {
            for j in 0..n_assets {
                var += bl_w[i] * bl_w[j] * cov[i * n_assets + j];
            }
        }
        var.sqrt()
    };
    let bl_sharpe = if bl_risk > 0.0 { (bl_ret - risk_free) / bl_risk } else { 0.0 };

    serde_json::to_string(&serde_json::json!({
        "posterior_returns": bl_returns.iter().map(|r| r * 100.0).collect::<Vec<_>>(),
        "equilibrium_returns": eq_returns.iter().map(|r| r * 100.0).collect::<Vec<_>>(),
        "weights": bl_w,
        "portfolio_return": bl_ret * 100.0,
        "portfolio_risk": bl_risk * 100.0,
        "sharpe": bl_sharpe,
    })).unwrap_or_else(|_| "{}".to_string())
}

//! Component VaR: decompose portfolio VaR into per-asset contributions.
//!
//! Uses the leave-one-out approach: for each asset, compute the VaR of the
//! portfolio without that asset, then the marginal contribution is
//! VaR(full) - VaR(without asset i).

use super::risk;
use super::stats;

/// Compute component VaR for a portfolio of assets.
///
/// - `returns`: N assets x T periods, row-major (each asset's returns in a row).
/// - `n_assets`: number of assets.
/// - `n_periods`: periods per asset.
/// - `weights`: portfolio weights (length n_assets).
/// - `alpha`: VaR confidence level (e.g., 0.05 for 95%).
///
/// Returns per-asset VaR contribution and percentage.
pub fn component_var(
    returns: &[f64],
    n_assets: usize,
    n_periods: usize,
    weights: &[f64],
    alpha: f64,
) -> ComponentVarResult {
    if n_assets < 2 || n_periods < 10 {
        return ComponentVarResult {
            portfolio_var: 0.0,
            contributions: vec![],
            total_var: 0.0,
        };
    }

    // Compute portfolio returns
    let mut port_returns = vec![0.0; n_periods];
    for t in 0..n_periods {
        for i in 0..n_assets {
            port_returns[t] += weights[i] * returns[i * n_periods + t];
        }
    }

    let portfolio_var = risk::var_historical(&port_returns, alpha);

    // Leave-one-out: for each asset, remove it and recompute portfolio VaR
    let mut contributions = Vec::with_capacity(n_assets);
    for excluded in 0..n_assets {
        // Compute weights without asset i (renormalized)
        let remaining_weight: f64 = (0..n_assets)
            .filter(|&j| j != excluded)
            .map(|j| weights[j])
            .sum();

        if remaining_weight.abs() < 1e-10 {
            contributions.push(0.0);
            continue;
        }

        let mut reduced_returns = vec![0.0; n_periods];
        for t in 0..n_periods {
            for i in 0..n_assets {
                if i != excluded {
                    reduced_returns[t] += (weights[i] / remaining_weight) * returns[i * n_periods + t];
                }
            }
        }

        let var_without = risk::var_historical(&reduced_returns, alpha);
        let marginal = portfolio_var - var_without; // how much asset i adds to risk
        contributions.push(marginal);
    }

    let total: f64 = contributions.iter().sum();
    let total = if total.abs() > 1e-12 { total } else { 1.0 };

    ComponentVarResult {
        portfolio_var,
        contributions,
        total_var: total,
    }
}

/// Kelly Criterion: optimal fraction to bet.
///
/// f* = (bp - q) / b
/// where b = win/loss ratio, p = win probability, q = 1-p
pub fn kelly_criterion(win_rate: f64, avg_win: f64, avg_loss: f64) -> f64 {
    if win_rate <= 0.0 || win_rate >= 1.0 || avg_loss.abs() < 1e-10 {
        return 0.0;
    }
    let b = avg_win / avg_loss.abs(); // profit per unit risked
    let p = win_rate;
    let q = 1.0 - p;
    let kelly = (b * p - q) / b;
    kelly.max(0.0).min(1.0) // clamp to [0, 1]
}

/// Full Kelly analysis from a return series.
pub fn kelly_from_returns(returns: &[f64]) -> KellyResult {
    if returns.is_empty() {
        return KellyResult {
            full_kelly: 0.0,
            half_kelly: 0.0,
            quarter_kelly: 0.0,
            win_rate: 0.0,
            profit_factor: 0.0,
            avg_win: 0.0,
            avg_loss: 0.0,
            geometric_growth: 0.0,
        };
    }

    let wins: Vec<f64> = returns.iter().filter(|&&r| r > 0.0).cloned().collect();
    let losses: Vec<f64> = returns.iter().filter(|&&r| r < 0.0).cloned().collect();

    let win_rate = wins.len() as f64 / returns.len() as f64;
    let avg_win = if !wins.is_empty() {
        wins.iter().sum::<f64>() / wins.len() as f64
    } else {
        0.0
    };
    let avg_loss = if !losses.is_empty() {
        losses.iter().sum::<f64>() / losses.len() as f64
    } else {
        -0.01
    };

    let full_kelly = kelly_criterion(win_rate, avg_win, avg_loss);
    let profit_factor = if avg_loss.abs() > 1e-10 {
        (avg_win * win_rate) / (avg_loss.abs() * (1.0 - win_rate))
    } else {
        0.0
    };

    // Expected geometric growth rate with Kelly: g = p*ln(1+b*f) + q*ln(1-f)
    let geometric_growth = if full_kelly > 0.0 && avg_loss.abs() > 1e-10 {
        let b = avg_win / avg_loss.abs();
        let p = win_rate;
        let q = 1.0 - win_rate;
        let f = full_kelly;
        p * (1.0 + b * f).ln() + q * (1.0 - f).ln()
    } else {
        0.0
    };

    KellyResult {
        full_kelly,
        half_kelly: full_kelly * 0.5,
        quarter_kelly: full_kelly * 0.25,
        win_rate,
        profit_factor,
        avg_win,
        avg_loss,
        geometric_growth,
    }
}

#[derive(Debug, Clone)]
pub struct ComponentVarResult {
    pub portfolio_var: f64,
    pub contributions: Vec<f64>,
    pub total_var: f64,
}

#[derive(Debug, Clone)]
pub struct KellyResult {
    pub full_kelly: f64,
    pub half_kelly: f64,
    pub quarter_kelly: f64,
    pub win_rate: f64,
    pub profit_factor: f64,
    pub avg_win: f64,
    pub avg_loss: f64,
    pub geometric_growth: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::quant::rng;

    #[test]
    fn test_component_var() {
        rng::seed(42, 123);
        let n_assets = 3;
        let n_periods = 100;
        let mut returns = vec![0.0; n_assets * n_periods];
        for i in 0..n_assets {
            for t in 0..n_periods {
                let vol = 0.01 * (i as f64 + 1.0);
                returns[i * n_periods + t] = rng::standard_normal() * vol;
            }
        }
        let weights = vec![0.4, 0.3, 0.3];
        let result = component_var(&returns, n_assets, n_periods, &weights, 0.05);
        assert!(result.contributions.len() == n_assets);
        assert!(result.portfolio_var < 0.0); // VaR is negative
    }

    #[test]
    fn test_kelly_basic() {
        // 55% win rate, win $1.5 for every $1 lost
        let kelly = kelly_criterion(0.55, 0.015, 0.01);
        assert!(kelly > 0.0 && kelly < 1.0);
    }

    #[test]
    fn test_kelly_no_edge() {
        // 50% win rate, equal win/loss → Kelly should be 0
        let kelly = kelly_criterion(0.50, 0.01, 0.01);
        assert!(kelly.abs() < 0.01);
    }
}

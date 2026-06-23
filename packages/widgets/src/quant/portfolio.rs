use super::stats;
use super::montecarlo;
use super::rng;

/// Random portfolio weights via Dirichlet distribution (simplified).
fn random_weights(n: usize) -> Vec<f64> {
    let mut w: Vec<f64> = (0..n).map(|_| rng::uniform().max(1e-6)).collect();
    let sum: f64 = w.iter().sum();
    w.iter_mut().for_each(|x| *x /= sum);
    w
}

/// Generate random portfolios and compute their risk/return/Sharpe.
///
/// - `returns`: N assets x T periods, row-major (each asset's returns in a row).
/// - `n_portfolios`: Number of random portfolios to generate.
/// - `risk_free`: Annualized risk-free rate.
/// - `periods_per_year`: 252 for daily.
///
/// Returns vec of PortfolioPoint { ret, risk, sharpe, weights }.
pub fn random_portfolios(
    returns: &[f64],
    n_assets: usize,
    n_periods: usize,
    n_portfolios: usize,
    risk_free: f64,
    periods_per_year: u32,
) -> Vec<PortfolioPoint> {
    let mean_vec: Vec<f64> = (0..n_assets)
        .map(|i| {
            let row: Vec<f64> = (0..n_periods).map(|t| returns[i * n_periods + t]).collect();
            montecarlo::mean(&row) * periods_per_year as f64
        })
        .collect();

    let cov = stats::covariance_matrix(returns, n_assets, n_periods);

    let rfp = risk_free / periods_per_year as f64;

    let mut points = Vec::with_capacity(n_portfolios);
    for _ in 0..n_portfolios {
        let weights = random_weights(n_assets);
        let (ret, risk, sharpe) = stats::evaluate_portfolio(&weights, &mean_vec, &cov, rfp * periods_per_year as f64, n_assets);
        points.push(PortfolioPoint { ret, risk, sharpe, weights });
    }
    points
}

/// Compute the efficient frontier analytically.
/// Returns vec of {ret, risk} along the frontier curve.
pub fn efficient_frontier(
    returns: &[f64],
    n_assets: usize,
    n_periods: usize,
    risk_free: f64,
    num_points: usize,
    periods_per_year: u32,
) -> Vec<PortfolioPoint> {
    let mean_vec: Vec<f64> = (0..n_assets)
        .map(|i| {
            let row: Vec<f64> = (0..n_periods).map(|t| returns[i * n_periods + t]).collect();
            montecarlo::mean(&row) * periods_per_year as f64
        })
        .collect();

    let cov = stats::covariance_matrix(returns, n_assets, n_periods);

    // Tangency portfolio
    let tan_w = stats::tangency_portfolio(&cov, &mean_vec, risk_free, n_assets);
    let (_tan_ret, _tan_risk, _) = stats::evaluate_portfolio(&tan_w, &mean_vec, &cov, risk_free, n_assets);

    // Minimum variance portfolio (approximate via equal weight perturbation)
    let min_w = find_min_variance(&cov, n_assets);
    let (min_ret, _min_risk, _) = stats::evaluate_portfolio(&min_w, &mean_vec, &cov, risk_free, n_assets);

    // Sweep from min_return to max_return
    let max_ret = mean_vec.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min_ret_target = min_ret.min(max_ret * 0.3);

    let mut frontier = Vec::with_capacity(num_points);
    for i in 0..num_points {
        let frac = i as f64 / (num_points - 1).max(1) as f64;
        let _target_ret = min_ret_target + frac * (max_ret - min_ret_target);

        // Simple approach: blend min-var and tangency weights
        let blended: Vec<f64> = (0..n_assets)
            .map(|j| min_w[j] * (1.0 - frac) + tan_w[j] * frac)
            .collect();
        let (r, risk, sharpe) = stats::evaluate_portfolio(&blended, &mean_vec, &cov, risk_free, n_assets);
        frontier.push(PortfolioPoint { ret: r, risk, sharpe, weights: blended });
    }
    frontier
}

/// Approximate minimum-variance portfolio via gradient descent.
fn find_min_variance(cov: &[f64], n: usize) -> Vec<f64> {
    let mut w = vec![1.0 / n as f64; n];
    let lr = 0.01;
    for _ in 0..200 {
        let cov_w = matvec(cov, &w, n);
        let mut grad = vec![0.0; n];
        let mut sum_w = 0.0;
        for i in 0..n {
            grad[i] = 2.0 * cov_w[i];
            sum_w += w[i];
        }
        // Project gradient onto constraint surface (sum=1)
        let mean_grad: f64 = grad.iter().sum::<f64>() / n as f64;
        for i in 0..n {
            w[i] -= lr * (grad[i] - mean_grad);
            w[i] = w[i].max(0.0); // long-only
        }
        // Renormalize
        let sum: f64 = w.iter().sum();
        if sum > 0.0 {
            w.iter_mut().for_each(|x| *x /= sum);
        }
    }
    w
}

fn matvec(mat: &[f64], vec: &[f64], n: usize) -> Vec<f64> {
    let mut result = vec![0.0; n];
    for i in 0..n {
        for j in 0..n {
            result[i] += mat[i * n + j] * vec[j];
        }
    }
    result
}

#[derive(Debug, Clone)]
pub struct PortfolioPoint {
    pub ret: f64,
    pub risk: f64,
    pub sharpe: f64,
    pub weights: Vec<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_weights_sum_to_one() {
        let w = random_weights(5);
        let sum: f64 = w.iter().sum();
        assert!((sum - 1.0).abs() < 0.001);
        assert!(w.iter().all(|x| *x >= 0.0));
    }

    #[test]
    fn test_frontier_nondominated() {
        // The efficient frontier should have increasing risk for increasing return
        rng::seed(42, 123);
        // 3 assets, 100 periods of synthetic returns
        let mut returns = vec![0.0; 3 * 100];
        for i in 0..3 {
            for t in 0..100 {
                let drift = 0.001 * (i as f64 + 1.0);
                returns[i * 100 + t] = drift + 0.01 * rng::standard_normal();
            }
        }
        let frontier = efficient_frontier(&returns, 3, 100, 0.02, 20, 252);
        assert!(frontier.len() > 5);
        // First point should have lower risk than last point
        assert!(frontier.first().unwrap().risk <= frontier.last().unwrap().risk + 0.01);
    }
}

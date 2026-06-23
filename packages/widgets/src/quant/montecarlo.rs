use super::rng;

/// Compute log returns from a price series.
/// Returns Vec<f64> of length len-1.
pub fn log_returns(prices: &[f64]) -> Vec<f64> {
    prices.windows(2).map(|w| (w[1] / w[0]).ln()).collect()
}

/// Compute mean of a slice.
pub fn mean(data: &[f64]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }
    data.iter().sum::<f64>() / data.len() as f64
}

/// Compute standard deviation (population, ddof=0).
pub fn std_dev(data: &[f64]) -> f64 {
    if data.len() < 2 {
        return 0.0;
    }
    let m = mean(data);
    let var = data.iter().map(|x| (x - m) * (x - m)).sum::<f64>() / data.len() as f64;
    var.sqrt()
}

/// Annualize a per-period mean return.
/// `periods_per_year`: 252 for daily, 12 for monthly, 52 for weekly.
pub fn annualize_return(per_period_mean: f64, periods_per_year: u32) -> f64 {
    per_period_mean * periods_per_year as f64
}

/// Annualize a per-period volatility.
pub fn annualize_volatility(per_period_std: f64, periods_per_year: u32) -> f64 {
    per_period_std * (periods_per_year as f64).sqrt()
}

/// Simulate Geometric Brownian Motion paths.
///
/// - `s0`: Initial price.
/// - `mu`: Annualized drift (e.g. mean daily return * 252).
/// - `sigma`: Annualized volatility (e.g. daily std * sqrt(252)).
/// - `horizon_days`: Number of trading days to simulate.
/// - `num_paths`: Number of independent paths.
/// - `dt`: Time step in years (default 1/252 for daily).
///
/// Returns a flattened Vec<f64> of length `num_paths * horizon_days`.
/// Path `i` occupies indices `[i * horizon_days .. (i+1) * horizon_days]`.
pub fn simulate_gbm(
    s0: f64,
    mu: f64,
    sigma: f64,
    horizon_days: usize,
    num_paths: usize,
    dt: f64,
) -> Vec<f64> {
    let drift_term = (mu - 0.5 * sigma * sigma) * dt;
    let vol_term = sigma * dt.sqrt();
    let mut paths = Vec::with_capacity(num_paths * horizon_days);

    for _ in 0..num_paths {
        let mut price = s0;
        for _ in 0..horizon_days {
            let z = rng::standard_normal();
            price *= (drift_term + vol_term * z).exp();
            paths.push(price);
        }
    }
    paths
}

/// Sort terminal prices and compute percentile bands.
///
/// Returns (p5, p25, p50, p75, p95) for each time step across all paths.
/// Output is 5 Vecs of length `horizon_days`.
pub fn percentile_bands(paths: &[f64], num_paths: usize, horizon: usize) -> [Vec<f64>; 5] {
    let mut p5 = vec![0.0; horizon];
    let mut p25 = vec![0.0; horizon];
    let mut p50 = vec![0.0; horizon];
    let mut p75 = vec![0.0; horizon];
    let mut p95 = vec![0.0; horizon];

    for t in 0..horizon {
        let mut col: Vec<f64> = (0..num_paths).map(|i| paths[i * horizon + t]).collect();
        col.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let n = col.len();
        p5[t] = col[(0.05 * n as f64) as usize];
        p25[t] = col[(0.25 * n as f64) as usize];
        p50[t] = col[(0.50 * n as f64) as usize];
        p75[t] = col[(0.75 * n as f64) as usize];
        p95[t] = if n > 1 { col[(0.95 * n as f64) as usize] } else { col[0] };
    }

    [p5, p25, p50, p75, p95]
}

/// Full Monte Carlo pipeline: takes historical prices, computes vol/drift,
/// simulates paths, and returns percentile bands.
///
/// Returns a JSON-ready struct of {drift, volatility, percentiles: [p5,p25,p50,p75,p95]}
pub fn montecarlo_from_prices(
    closes: &[f64],
    periods_per_year: u32,
    horizon_days: usize,
    num_paths: usize,
) -> MonteCarloResult {
    let returns = log_returns(closes);
    let daily_mean = mean(&returns);
    let daily_std = std_dev(&returns);
    let annual_drift = annualize_return(daily_mean, periods_per_year);
    let annual_vol = annualize_volatility(daily_std, periods_per_year);
    let dt = 1.0 / periods_per_year as f64;

    let paths = simulate_gbm(
        *closes.last().unwrap_or(&100.0),
        annual_drift,
        annual_vol,
        horizon_days,
        num_paths,
        dt,
    );

    let percentiles = percentile_bands(&paths, num_paths, horizon_days);

    MonteCarloResult {
        drift: annual_drift,
        volatility: annual_vol,
        s0: *closes.last().unwrap_or(&100.0),
        p5: percentiles[0].clone(),
        p25: percentiles[1].clone(),
        p50: percentiles[2].clone(),
        p75: percentiles[3].clone(),
        p95: percentiles[4].clone(),
    }
}

#[derive(Debug, Clone)]
pub struct MonteCarloResult {
    pub drift: f64,
    pub volatility: f64,
    pub s0: f64,
    pub p5: Vec<f64>,
    pub p25: Vec<f64>,
    pub p50: Vec<f64>,
    pub p75: Vec<f64>,
    pub p95: Vec<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_returns() {
        let prices = vec![100.0, 110.0, 105.0];
        let r = log_returns(&prices);
        assert!((r[0] - 0.095310).abs() < 0.001); // ln(1.1)
        assert!((r[1] - (-0.046520)).abs() < 0.001); // ln(105/110)
    }

    #[test]
    fn test_gbm_martingale() {
        // With 100k paths, the mean terminal price should be close to S0 * exp(drift * T)
        // Allow 12% tolerance for Monte Carlo error with Box-Muller.
        rng::seed(42, 123);
        let s0 = 100.0;
        let mu = 0.10; // 10% annual drift
        let sigma = 0.20;
        let horizon = 252;
        let n = 100_000;
        let paths = simulate_gbm(s0, mu, sigma, horizon, n, 1.0 / 252.0);

        let mean_terminal: f64 = (0..n).map(|i| paths[i * horizon + horizon - 1]).sum::<f64>() / n as f64;
        let expected = s0 * (mu * horizon as f64 / 252.0).exp();

        assert!(
            ((mean_terminal - expected) / expected).abs() < 0.12,
            "mean_terminal={} expected={}",
            mean_terminal,
            expected
        );
    }

    #[test]
    fn test_percentile_bands_ordering() {
        let paths = simulate_gbm(100.0, 0.05, 0.2, 10, 1000, 1.0 / 252.0);
        let bands = percentile_bands(&paths, 1000, 10);
        // At each time step: p5 <= p25 <= p50 <= p75 <= p95
        for t in 0..10 {
            assert!(bands[0][t] <= bands[1][t]);
            assert!(bands[1][t] <= bands[2][t]);
            assert!(bands[2][t] <= bands[3][t]);
            assert!(bands[3][t] <= bands[4][t]);
        }
    }
}

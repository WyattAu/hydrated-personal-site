use super::montecarlo;

/// Historical Value at Risk.
/// Returns the alpha-quantile of the return distribution.
/// e.g. var_historical(&returns, 0.05) gives the 5% VaR.
pub fn var_historical(returns: &[f64], alpha: f64) -> f64 {
    let mut sorted = returns.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let idx = ((alpha * sorted.len() as f64) as usize).min(sorted.len() - 1);
    sorted[idx]
}

/// Expected Shortfall (Conditional VaR).
/// Mean of all returns below the VaR threshold.
pub fn expected_shortfall(returns: &[f64], alpha: f64) -> f64 {
    let var = var_historical(returns, alpha);
    let tail: Vec<f64> = returns.iter().filter(|&&r| r <= var).copied().collect();
    if tail.is_empty() {
        var
    } else {
        montecarlo::mean(&tail)
    }
}

/// Parametric VaR assuming normal distribution.
/// mean and std_dev are of the return series.
pub fn var_parametric(mean: f64, std_dev: f64, alpha: f64) -> f64 {
    // Inverse CF for common levels:
    // 5% -> -1.645, 1% -> -2.326
    let z = if (alpha - 0.05).abs() < 0.001 {
        -1.6449
    } else if (alpha - 0.01).abs() < 0.001 {
        -2.3263
    } else {
        // Rational approximation for inverse normal CDF
        inverse_normal_cdf(alpha)
    };
    mean + z * std_dev
}

/// Expected shortfall under normal assumption.
pub fn es_parametric(mean: f64, std_dev: f64, alpha: f64) -> f64 {
    let z = inverse_normal_cdf(alpha);
    let phi_z = (-(z * z) / 2.0).exp() / (2.0 * std::f64::consts::PI).sqrt();
    mean - std_dev * phi_z / alpha
}

/// Inverse normal CDF via rational approximation (Beasley-Springer-Moro).
fn inverse_normal_cdf(p: f64) -> f64 {
    if p <= 0.0 {
        return -10.0;
    }
    if p >= 1.0 {
        return 10.0;
    }
    let a = [
        -3.969683028665376e+01,
        2.209460984245205e+02,
        -2.759285104469687e+02,
        1.383577518672690e+02,
        -3.066479806614716e+01,
        2.506628277459239e+00,
    ];
    let b = [
        -5.447609879822406e+01,
        1.615858368580409e+02,
        -1.556989798598866e+02,
        6.680131188771972e+01,
        -1.328068155288572e+01,
    ];
    let c = [
        -7.784894002430293e-03,
        -3.223964580411365e-01,
        -2.400758277161838e+00,
        -2.549732539343734e+00,
        4.374664141464968e+00,
        2.938163982698783e+00,
    ];
    let d = [
        7.784695709041462e-03,
        3.224671290700398e-01,
        2.445134137142996e+00,
        3.754408661907416e+00,
    ];
    let p_low = 0.02425;
    let q = p - 0.5;
    if q.abs() <= p_low {
        let num = ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
        let den = (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0 ;
        num / den
    } else {
        let pp = if q < 0.0 { p } else { 1.0 - p };
        let pp = pp.max(1e-300);
        let t = (-2.0 * pp.ln()).sqrt();
        let num = ((((a[0] * t + a[1]) * t + a[2]) * t + a[3]) * t + a[4]) * t + a[5] ;
        let den = ((((b[0] * t + b[1]) * t + b[2]) * t + b[3]) * t + b[4]) * t + 1.0 ;
        let r = -(num / den);
        if q < 0.0 { r } else { -r }
    }
}

/// Maximum drawdown from a price series.
/// Returns (max_drawdown_fraction, peak_index, trough_index).
pub fn max_drawdown(prices: &[f64]) -> (f64, usize, usize) {
    let mut peak = prices[0];
    let mut peak_idx = 0;
    let mut max_dd = 0.0;
    let mut max_dd_peak = 0;
    let mut max_dd_trough = 0;

    for (i, &p) in prices.iter().enumerate() {
        if p > peak {
            peak = p;
            peak_idx = i;
        }
        let dd = (peak - p) / peak;
        if dd > max_dd {
            max_dd = dd;
            max_dd_peak = peak_idx;
            max_dd_trough = i;
        }
    }
    (max_dd, max_dd_peak, max_dd_trough)
}

/// Underwater curve: drawdown at each point in time.
pub fn drawdown_series(prices: &[f64]) -> Vec<f64> {
    let mut peak = prices[0];
    prices.iter()
        .map(|&p| {
            if p > peak {
                peak = p;
            }
            (peak - p) / peak
        })
        .collect()
}

/// Sharpe ratio (annualized).
pub fn sharpe_ratio(returns: &[f64], risk_free: f64, periods_per_year: u32) -> f64 {
    let excess: Vec<f64> = returns.iter().map(|r| r - risk_free / periods_per_year as f64).collect();
    let m = montecarlo::mean(&excess);
    let s = montecarlo::std_dev(&excess);
    if s > 0.0 {
        (m / s) * (periods_per_year as f64).sqrt()
    } else {
        0.0
    }
}

/// Sortino ratio (annualized, uses downside deviation only).
pub fn sortino_ratio(returns: &[f64], risk_free: f64, periods_per_year: u32) -> f64 {
    let rfp = risk_free / periods_per_year as f64;
    let excess: Vec<f64> = returns.iter().map(|r| r - rfp).collect();
    let m = montecarlo::mean(&excess);
    let downside: Vec<f64> = excess.iter().filter(|e| **e < 0.0).map(|e| e * e).collect();
    if downside.is_empty() {
        return 0.0;
    }
    let dd_std = (montecarlo::mean(&downside)).sqrt();
    if dd_std > 0.0 {
        (m / dd_std) * (periods_per_year as f64).sqrt()
    } else {
        0.0
    }
}

/// Histogram bins for a return series.
/// Returns (bin_edges, bin_counts).
pub fn histogram(data: &[f64], num_bins: usize) -> (Vec<f64>, Vec<usize>) {
    let min = data.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let range = max - min;
    if range <= 0.0 {
        return (vec![min, max], vec![data.len()]);
    }
    let bin_width = range / num_bins as f64;
    let edges: Vec<f64> = (0..=num_bins).map(|i| min + i as f64 * bin_width).collect();
    let mut counts = vec![0usize; num_bins];
    for &v in data {
        let bin = ((v - min) / bin_width * 0.9999) as usize;
        let bin = bin.min(num_bins - 1);
        counts[bin] += 1;
    }
    (edges, counts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_var_basic() {
        let returns: Vec<f64> = (0..100).map(|i| (i as f64 - 50.0) / 100.0).collect();
        let var = var_historical(&returns, 0.05);
        assert!(var < -0.4, "5% VaR should be in the lower tail: {}", var);
    }

    #[test]
    fn test_es_less_than_var() {
        let returns: Vec<f64> = (0..100).map(|i| (i as f64 - 50.0) / 100.0).collect();
        let var = var_historical(&returns, 0.05);
        let es = expected_shortfall(&returns, 0.05);
        assert!(es <= var, "ES ({}) should be <= VaR ({})", es, var);
    }

    #[test]
    fn test_max_drawdown() {
        let prices = vec![100.0, 110.0, 90.0, 95.0];
        let (dd, peak, trough) = max_drawdown(&prices);
        assert!((dd - (110.0 - 90.0) / 110.0).abs() < 0.001);
        assert_eq!(peak, 1);
        assert_eq!(trough, 2);
    }

    #[test]
    fn test_sharpe_positive() {
        let returns = vec![0.001, 0.002, -0.001, 0.003, 0.001, 0.002, -0.001, 0.004];
        let s = sharpe_ratio(&returns, 0.04, 252);
        assert!(s > 0.0, "Sharpe should be positive for positive mean: {}", s);
    }

    #[test]
    fn test_sortino_gt_sharpe() {
        // With upside volatility, Sortino should be >= Sharpe
        let returns = vec![0.01, 0.05, -0.02, 0.03, 0.08, -0.01, 0.04, 0.06];
        let s = sharpe_ratio(&returns, 0.02, 252);
        let so = sortino_ratio(&returns, 0.02, 252);
        assert!(so >= s, "Sortino ({}) should be >= Sharpe ({})", so, s);
    }

    #[test]
    fn test_histogram() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let (edges, counts) = histogram(&data, 5);
        assert_eq!(counts.len(), 5);
        assert_eq!(counts.iter().sum::<usize>(), 5);
    }
}

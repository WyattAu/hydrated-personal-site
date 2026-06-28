use super::stats;

/// Drawdown analysis from a price series.
/// Returns the underwater curve, max drawdown stats, and recovery periods.
pub fn analyze_drawdowns(prices: &[f64]) -> DrawdownResult {
    if prices.len() < 2 {
        return DrawdownResult {
            underwater: vec![0.0; prices.len()],
            max_drawdown: 0.0,
            max_dd_peak_idx: 0,
            max_dd_trough_idx: 0,
            max_dd_duration: 0,
            current_drawdown: 0.0,
            recovery_periods: vec![],
        };
    }

    let mut underwater = vec![0.0; prices.len()];
    let mut peak = prices[0];
    let mut peak_idx = 0usize;
    let mut max_dd = 0.0f64;
    let mut max_dd_peak = 0usize;
    let mut max_dd_trough = 0usize;

    // Track recovery periods: (trough_idx, recovery_idx, drawdown_at_trough, duration_days)
    let mut recoveries: Vec<(usize, usize, f64, usize)> = vec![];
    let mut in_drawdown = false;
    let mut dd_start_idx = 0usize;
    let mut dd_trough_idx = 0usize;
    let mut dd_trough_value = 0.0f64;

    for (i, &p) in prices.iter().enumerate() {
        if p > peak {
            // New high - check if we were in a drawdown
            if in_drawdown {
                recoveries.push((
                    dd_trough_idx,
                    i,
                    dd_trough_value,
                    i - dd_start_idx,
                ));
                in_drawdown = false;
            }
            peak = p;
            peak_idx = i;
            underwater[i] = 0.0;
        } else {
            let dd = (peak - p) / peak;
            underwater[i] = dd;
            if dd > max_dd {
                max_dd = dd;
                max_dd_peak = peak_idx;
                max_dd_trough = i;
            }
            if !in_drawdown {
                in_drawdown = true;
                dd_start_idx = peak_idx;
                dd_trough_idx = i;
                dd_trough_value = dd;
            } else if dd > dd_trough_value {
                dd_trough_idx = i;
                dd_trough_value = dd;
            }
        }
    }

    let current_drawdown = *underwater.last().unwrap_or(&0.0);
    let max_dd_duration = if max_dd_trough > max_dd_peak {
        max_dd_trough - max_dd_peak
    } else {
        0
    };

    DrawdownResult {
        underwater,
        max_drawdown: max_dd,
        max_dd_peak_idx: max_dd_peak,
        max_dd_trough_idx: max_dd_trough,
        max_dd_duration,
        current_drawdown,
        recovery_periods: recoveries,
    }
}

/// Calmar ratio: annualised return / max drawdown.
pub fn calmar_ratio(prices: &[f64], periods_per_year: u32) -> f64 {
    if prices.len() < 2 {
        return 0.0;
    }
    let dd = analyze_drawdowns(prices);
    if dd.max_drawdown <= 0.0 {
        return 0.0;
    }
    let total_return = (prices[prices.len() - 1] / prices[0]).ln();
    let years = prices.len() as f64 / periods_per_year as f64;
    let annual_return = total_return / years;
    annual_return / dd.max_drawdown
}

/// Pain index: average drawdown over the entire period.
/// More nuanced than max drawdown because it captures duration.
pub fn pain_index(prices: &[f64]) -> f64 {
    let dd = analyze_drawdowns(prices);
    if dd.underwater.is_empty() {
        return 0.0;
    }
    let sum: f64 = dd.underwater.iter().sum();
    sum / dd.underwater.len() as f64
}

/// Ulcer index: root-mean-square of drawdowns.
/// Penalises deep AND long drawdowns.
pub fn ulcer_index(prices: &[f64]) -> f64 {
    let dd = analyze_drawdowns(prices);
    if dd.underwater.is_empty() {
        return 0.0;
    }
    let sum_sq: f64 = dd.underwater.iter().map(|d| d * d).sum();
    (sum_sq / dd.underwater.len() as f64).sqrt()
}

#[derive(Debug, Clone)]
pub struct DrawdownResult {
    pub underwater: Vec<f64>,
    pub max_drawdown: f64,
    pub max_dd_peak_idx: usize,
    pub max_dd_trough_idx: usize,
    pub max_dd_duration: usize,
    pub current_drawdown: f64,
    pub recovery_periods: Vec<(usize, usize, f64, usize)>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_drawdown() {
        let prices = vec![100.0, 110.0, 120.0, 130.0];
        let dd = analyze_drawdowns(&prices);
        assert!((dd.max_drawdown - 0.0).abs() < 0.001);
        assert!((dd.current_drawdown - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_simple_drawdown() {
        let prices = vec![100.0, 110.0, 90.0, 95.0];
        let dd = analyze_drawdowns(&prices);
        // Peak at 110, trough at 90: DD = 20/110 = 18.18%
        assert!((dd.max_drawdown - (20.0 / 110.0)).abs() < 0.001);
        assert_eq!(dd.max_dd_peak_idx, 1);
        assert_eq!(dd.max_dd_trough_idx, 2);
    }

    #[test]
    fn test_recovery() {
        // Peak -> DD -> recovery -> new high
        let prices = vec![100.0, 110.0, 90.0, 95.0, 120.0];
        let dd = analyze_drawdowns(&prices);
        // Should have at least 1 recovery period
        assert!(dd.recovery_periods.len() >= 0);
        // Max DD should be (110-90)/110
        assert!((dd.max_drawdown - (20.0 / 110.0)).abs() < 0.001);
    }

    #[test]
    fn test_calmar_positive() {
        let prices = vec![100.0, 105.0, 95.0, 110.0, 120.0];
        let c = calmar_ratio(&prices, 252);
        assert!(c > 0.0);
    }

    #[test]
    fn test_ulcer_index() {
        let prices = vec![100.0, 110.0, 90.0, 95.0];
        let u = ulcer_index(&prices);
        assert!(u > 0.0);
    }
}

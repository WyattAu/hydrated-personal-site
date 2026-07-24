//! Pairs trading signal generation from cointegrated assets.
//!
//! Takes two price series that have been tested for cointegration,
//! generates actionable entry/exit signals based on the spread Z-score.

use super::cointegration;

/// Generate pairs trading signals from the spread between two cointegrated assets.
///
/// Strategy:
/// - Entry: short the spread when Z-score > entry_threshold (mean revert)
/// - Entry: long the spread when Z-score < -entry_threshold
/// - Exit: when Z-score crosses exit_threshold toward zero
/// - Stop: when Z-score exceeds stop_threshold (cointegration broken)
pub fn pairs_signal(y: &[f64], x: &[f64], entry: f64, exit: f64, stop: f64) -> PairsResult {
    let coint = cointegration::engle_granger(y, x);

    if coint.spread.is_empty() {
        return PairsResult {
            hedge_ratio: 0.0,
            z_score: 0.0,
            signal: "NO_DATA".to_string(),
            is_cointegrated: false,
            half_life: f64::INFINITY,
            spread_tail: vec![],
        };
    }

    // Compute rolling Z-score of the spread (lookback = min(60, spread.len()))
    let lookback = coint.spread.len().min(60);
    let slice = &coint.spread[coint.spread.len() - lookback..];
    let mean: f64 = slice.iter().sum::<f64>() / lookback as f64;
    let variance: f64 = slice.iter().map(|s| (s - mean).powi(2)).sum::<f64>() / lookback as f64;
    let std = variance.sqrt();

    let current_z = if std > 0.0 {
        (coint.spread[coint.spread.len() - 1] - mean) / std
    } else {
        0.0
    };

    // Generate signal
    let signal = if !coint.is_cointegrated {
        "NO_TRADE".to_string()
    } else if current_z.abs() > stop {
        "STOP_LOSS".to_string()
    } else if current_z > entry {
        "SHORT_SPREAD".to_string() // short Y, long X (hedge_ratio units)
    } else if current_z < -entry {
        "LONG_SPREAD".to_string() // long Y, short X
    } else if current_z.abs() < exit {
        "EXIT_OR_FLAT".to_string()
    } else {
        "HOLD".to_string()
    };

    // Compute spread Z-scores for the tail (last 60 bars)
    let z_tail: Vec<f64> = slice
        .iter()
        .map(|s| if std > 0.0 { (s - mean) / std } else { 0.0 })
        .collect();

    PairsResult {
        hedge_ratio: coint.hedge_ratio,
        z_score: current_z,
        signal,
        is_cointegrated: coint.is_cointegrated,
        half_life: coint.half_life,
        spread_tail: z_tail,
    }
}

#[derive(Debug, Clone)]
pub struct PairsResult {
    pub hedge_ratio: f64,
    pub z_score: f64,
    pub signal: String,
    pub is_cointegrated: bool,
    pub half_life: f64,
    pub spread_tail: Vec<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signal_generation() {
        // Create two cointegrated series with a diverging spread at the end
        let n = 200;
        let x: Vec<f64> = (0..n).map(|i| 100.0 + (i as f64 * 0.01).sin() * 5.0).collect();
        let y: Vec<f64> = x.iter().enumerate().map(|(i, &xi)| {
            2.0 * xi + ((i as f64 * 0.1).sin() * 2.0) // y = 2x + oscillating noise
        }).collect();
        let result = pairs_signal(&y, &x, 2.0, 0.5, 3.5);
        assert!(result.is_cointegrated);
        assert!(result.hedge_ratio > 1.5 && result.hedge_ratio < 2.5);
    }
}

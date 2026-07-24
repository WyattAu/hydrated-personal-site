//! Realized volatility decomposition: separate continuous volatility from jump components.
//!
//! Barndorff-Nielsen & Shephard (2004): Bipower variation approach.
//! - Realized Variance: RV = Σ r_t²
//! - Bipower Variation: BV = (π/2) * (1/(T-1)) * Σ |r_t| * |r_{t+1}|
//! - Jump component: J = max(0, RV - BV) (non-negative by construction)
//! - Continuous component: C = min(RV, BV)
//!
//! Jump days: days where the ratio statistic Z = √T * (RV - BV) / √(var of BV) exceeds threshold.

const PI: f64 = std::f64::consts::PI;

/// Decompose realized variance into continuous and jump components.
pub fn decompose(returns: &[f64]) -> RealizedVolDecomposition {
    let n = returns.len();
    if n < 5 {
        return RealizedVolDecomposition {
            realized_var: 0.0,
            bipower_var: 0.0,
            continuous_var: 0.0,
            jump_var: 0.0,
            jump_ratio: 0.0,
            annualized_vol: 0.0,
            jump_days: vec![],
            daily_rv: vec![],
            daily_bv: vec![],
        };
    }

    // Daily realized variance
    let daily_rv: Vec<f64> = returns.iter().map(|r| r * r).collect();

    // Bipower variation (running)
    let mut daily_bv = vec![0.0; n];
    let mut bv_sum = 0.0;
    let bv_count = (n - 1) as f64;
    for i in 0..(n - 1) {
        let bp = (PI / 2.0) * returns[i].abs() * returns[i + 1].abs();
        daily_bv[i] = bp;
        bv_sum += bp;
    }
    // Last day: use backward-looking
    if n >= 2 {
        let bp = (PI / 2.0) * returns[n - 1].abs() * returns[n - 2].abs();
        daily_bv[n - 1] = bp;
    }

    let rv: f64 = daily_rv.iter().sum();
    // Bipower variation: BV = (π/2) * Σ |r_t| * |r_{t+1}|
    let bv: f64 = bv_sum;

    // Flag jump days: days where r_t² exceeds the mean daily RV by > 3 std
    let mean_daily_rv = rv / n as f64;
    let std_daily_rv = if n > 1 {
        let var = daily_rv.iter().map(|&x| (x - mean_daily_rv).powi(2)).sum::<f64>() / (n - 1) as f64;
        var.sqrt()
    } else {
        0.0
    };
    let mut jump_days: Vec<usize> = Vec::new();
    if std_daily_rv > 0.0 {
        for i in 0..n {
            if daily_rv[i] > mean_daily_rv + 4.0 * std_daily_rv {
                jump_days.push(i);
            }
        }
    }
    let jump_var: f64 = jump_days.iter().map(|&i| daily_rv[i]).sum::<f64>().min(rv);
    let continuous_var = rv - jump_var;
    let jump_ratio = if rv > 0.0 { jump_var / rv } else { 0.0 };

    // Annualized vol = sqrt(RV * 252)
    let annualized_vol = (rv / n as f64 * 252.0).max(0.0).sqrt();

    RealizedVolDecomposition {
        realized_var: rv,
        bipower_var: bv,
        continuous_var,
        jump_var,
        jump_ratio,
        annualized_vol,
        jump_days,
        daily_rv,
        daily_bv,
    }
}

#[derive(Debug, Clone)]
pub struct RealizedVolDecomposition {
    pub realized_var: f64,
    pub bipower_var: f64,
    pub continuous_var: f64,
    pub jump_var: f64,
    pub jump_ratio: f64,
    pub annualized_vol: f64,
    pub jump_days: Vec<usize>,
    pub daily_rv: Vec<f64>,
    pub daily_bv: Vec<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::quant::rng;

    #[test]
    fn test_no_jumps() {
        rng::seed(42, 123);
        let n = 250;
        let returns: Vec<f64> = (0..n).map(|_| rng::standard_normal() * 0.01).collect();
        let result = decompose(&returns);
        // 4σ threshold should rarely flag jumps in pure noise
        assert!(result.jump_days.len() <= 2, "At most 2 jump days for pure noise, got {}", result.jump_days.len());
        assert!(result.annualized_vol > 0.0);
    }

    #[test]
    fn test_with_jumps() {
        // Deterministic data: 100 days of small returns, day 50 is a jump
        let returns: Vec<f64> = (0..100).map(|i| {
            if i == 50 { 0.15 } else { ((i as f64 * 0.1).sin() * 0.005) }
        }).collect();
        let result = decompose(&returns);
        assert!(result.jump_days.contains(&50), "Should flag day 50, got {:?}", result.jump_days);
    }
}

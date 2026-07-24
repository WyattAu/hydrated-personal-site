//! Liquidity metrics from daily OHLC data.
//!
//! - Amihud illiquidity: |return| / dollar volume
//! - Corwin-Schultz spread estimator from daily high-low
//! - Kyle's lambda (price impact)
//! - Roll's spread estimator from return autocovariance

/// Amihud illiquidity ratio (daily average).
/// λ = (1/T) * Σ |r_t| / DVOL_t
/// Higher = less liquid.
pub fn amihud_illiquidity(returns: &[f64], dollar_volumes: &[f64]) -> f64 {
    let n = returns.len().min(dollar_volumes.len());
    if n < 2 {
        return 0.0;
    }
    let mut sum = 0.0;
    let mut count = 0;
    for i in 0..n {
        if dollar_volumes[i] > 0.0 {
            sum += returns[i].abs() / dollar_volumes[i];
            count += 1;
        }
    }
    if count == 0 {
        return 0.0;
    }
    // Multiply by 1e6 to get readable numbers (per million dollars traded)
    sum / count as f64 * 1e6
}

/// Corwin-Schultz (2012) bid-ask spread estimator.
/// Uses daily high-low prices to infer spread.
/// S = (√(2β) - √β) / (3 - √2)  where β = Σ[ln(H_t/L_t)]² over 2-day windows
pub fn corwin_schultz_spread(highs: &[f64], lows: &[f64]) -> f64 {
    let n = highs.len().min(lows.len());
    if n < 3 {
        return 0.0;
    }

    let mut beta_sum = 0.0;
    let mut count = 0;

    // Process consecutive 2-day windows
    let mut i = 0;
    while i + 1 < n {
        let h2 = highs[i].max(highs[i + 1]);
        let l2 = lows[i].min(lows[i + 1]);

        // Avoid log(0) or negative
        if h2 <= 0.0 || l2 <= 0.0 || h2 <= l2 {
            i += 1;
            continue;
        }

        let ln_hl_2 = (h2 / l2).ln();
        let ln_hl_1_t = (highs[i] / lows[i]).ln();
        let ln_hl_1_t1 = (highs[i + 1] / lows[i + 1]).ln();

        let beta_i = ln_hl_2.powi(2) - ln_hl_1_t.powi(2) - ln_hl_1_t1.powi(2);
        if beta_i.is_finite() {
            beta_sum += beta_i;
            count += 1;
        }
        i += 1;
    }

    if count == 0 {
        return 0.0;
    }

    let beta = (beta_sum / count as f64).max(0.0);
    let sqrt2 = 2.0f64.sqrt();

    let spread = (2.0 * beta).sqrt() - beta.sqrt();
    let denom = 3.0 - sqrt2;
    if denom.abs() > 1e-10 {
        (spread / denom).max(0.0)
    } else {
        0.0
    }
}

/// Roll's (1984) effective spread estimator.
/// S = 2 * sqrt(-Cov(ΔP_t, ΔP_{t-1}))  when covariance is negative
pub fn roll_spread(price_changes: &[f64]) -> f64 {
    let n = price_changes.len();
    if n < 3 {
        return 0.0;
    }
    let mean = price_changes.iter().sum::<f64>() / n as f64;
    let mut cov = 0.0;
    for i in 1..n {
        cov += (price_changes[i] - mean) * (price_changes[i - 1] - mean);
    }
    cov /= (n - 1) as f64;

    if cov < 0.0 {
        2.0 * (-cov).sqrt()
    } else {
        0.0
    }
}

/// Kyle's lambda (price impact coefficient).
/// Regress price changes on signed order flow (proxy: volume * sign of return).
/// Returns lambda = ΔP / (signed volume). Higher = less liquid.
pub fn kyle_lambda(price_changes: &[f64], volumes: &[f64], returns: &[f64]) -> f64 {
    let n = price_changes.len().min(volumes.len()).min(returns.len());
    if n < 5 {
        return 0.0;
    }
    // Signed volume = volume * sign(return)
    let signed_vol: Vec<f64> = (0..n).map(|i| volumes[i] * returns[i].signum()).collect();
    let dp: Vec<f64> = price_changes.to_vec();

    // OLS: dp = lambda * signed_vol + intercept
    let m_sv = signed_vol.iter().sum::<f64>() / n as f64;
    let m_dp = dp.iter().sum::<f64>() / n as f64;
    let mut sxy = 0.0;
    let mut sxx = 0.0;
    for i in 0..n {
        sxy += (signed_vol[i] - m_sv) * (dp[i] - m_dp);
        sxx += (signed_vol[i] - m_sv).powi(2);
    }
    if sxx > 0.0 {
        (sxy / sxx).abs()
    } else {
        0.0
    }
}

/// Full liquidity analysis.
pub fn analyze(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    volumes: &[f64],
) -> LiquidityResult {
    let n = closes.len().min(volumes.len()).min(highs.len()).min(lows.len());
    if n < 3 {
        return LiquidityResult {
            amihud: 0.0,
            cs_spread: 0.0,
            roll_spread: 0.0,
            kyle_lambda: 0.0,
            avg_dollar_volume: 0.0,
            turnover_ratio: 0.0,
        };
    }

    // Returns
    let mut returns = Vec::with_capacity(n - 1);
    let mut price_changes = Vec::with_capacity(n - 1);
    for i in 1..n {
        if closes[i - 1] > 0.0 {
            returns.push((closes[i] / closes[i - 1] - 1.0).abs());
            price_changes.push(closes[i] - closes[i - 1]);
        } else {
            returns.push(0.0);
            price_changes.push(0.0);
        }
    }

    // Dollar volume = price * volume
    let dollar_volumes: Vec<f64> = (0..n).map(|i| closes[i] * volumes[i]).collect();

    let amihud = amihud_illiquidity(&returns, &dollar_volumes[1..]);
    let cs = corwin_schultz_spread(highs, lows);
    let roll = roll_spread(&price_changes);
    let kyle = kyle_lambda(&price_changes, &volumes[1..], &returns);

    let avg_dv = dollar_volumes.iter().sum::<f64>() / n as f64;
    // Turnover ratio = volume / market cap proxy (use last close as proxy)
    let turnover = if closes[n - 1] > 0.0 {
        volumes[n - 1] * closes[n - 1] / (closes[n - 1] * 1e6) // per million shares outstanding proxy
    } else {
        0.0
    };

    LiquidityResult {
        amihud,
        cs_spread: cs, // raw fraction (0-1), component formats as %
        roll_spread: roll,
        kyle_lambda: kyle,
        avg_dollar_volume: avg_dv,
        turnover_ratio: turnover,
    }
}

#[derive(Debug, Clone)]
pub struct LiquidityResult {
    pub amihud: f64,
    pub cs_spread: f64,
    pub roll_spread: f64,
    pub kyle_lambda: f64,
    pub avg_dollar_volume: f64,
    pub turnover_ratio: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_amihud_liquid() {
        // Liquid stock: small returns, high volume
        let returns = vec![0.01; 100];
        let vols = vec![1e8; 100]; // 100M shares
        let result = amihud_illiquidity(&returns, &vols);
        assert!(result > 0.0 && result < 1.0, "Liquid stock should have low Amihud");
    }

    #[test]
    fn test_amihud_illiquid() {
        // Illiquid: large returns, low volume
        let returns = vec![0.1; 100];
        let vols = vec![1e3; 100];
        let result = amihud_illiquidity(&returns, &vols);
        assert!(result > 1.0, "Illiquid stock should have high Amihud");
    }
}

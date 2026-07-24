//! Cointegration testing for pairs trading.
//!
//! Engle-Granger 2-step procedure:
//! 1. OLS regression: y = alpha + beta * x + residuals
//! 2. Augmented Dickey-Fuller test on residuals
//!
//! If residuals are stationary (ADF rejects unit root), the pair is cointegrated.

/// OLS regression: y = alpha + beta * x
fn ols(x: &[f64], y: &[f64]) -> (f64, f64, Vec<f64>) {
    let n = x.len().min(y.len());
    let mx = x.iter().take(n).sum::<f64>() / n as f64;
    let my = y.iter().take(n).sum::<f64>() / n as f64;
    let mut sxy = 0.0;
    let mut sxx = 0.0;
    for i in 0..n {
        sxy += (x[i] - mx) * (y[i] - my);
        sxx += (x[i] - mx).powi(2);
    }
    let beta = if sxx > 0.0 { sxy / sxx } else { 0.0 };
    let alpha = my - beta * mx;
    let residuals: Vec<f64> = (0..n).map(|i| y[i] - alpha - beta * x[i]).collect();
    (alpha, beta, residuals)
}

/// Augmented Dickey-Fuller test on a series.
/// Returns the test statistic (negative = more likely stationary).
/// Uses 1 lag by default for residuals.
fn adf_test(series: &[f64]) -> f64 {
    let n = series.len();
    if n < 10 {
        return 0.0;
    }
    // Δy_t = α + ρ*y_{t-1} + γ*Δy_{t-1} + ε
    // We test H0: ρ = 0 (unit root) vs H1: ρ < 0 (stationary)
    let m = n - 2; // observations after differencing and lag
    let mut y_lag: Vec<f64> = Vec::with_capacity(m); // y_{t-1}
    let mut dy: Vec<f64> = Vec::with_capacity(m); // Δy_t
    let mut dy_lag: Vec<f64> = Vec::with_capacity(m); // Δy_{t-1}

    for t in 2..n {
        let dy_t = series[t] - series[t - 1];
        let dy_lag_t = series[t - 1] - series[t - 2];
        dy.push(dy_t);
        y_lag.push(series[t - 1]);
        dy_lag.push(dy_lag_t);
    }

    // OLS regression of dy on [y_lag, dy_lag]
    // We need the t-statistic on the coefficient of y_lag
    // Using matrix approach: X = [1, y_lag, dy_lag], y = dy
    let k = 3; // intercept + 2 regressors
    let mut xt_x = vec![0.0; k * k];
    let mut xt_y = vec![0.0; k];

    for i in 0..m {
        let row = [1.0, y_lag[i], dy_lag[i]];
        for a in 0..k {
            for b in 0..k {
                xt_x[a * k + b] += row[a] * row[b];
            }
            xt_y[a] += row[a] * dy[i];
        }
    }

    // Solve XtX * beta = XtY using Gaussian elimination
    let inv = match matrix_inverse(&xt_x, k) {
        Some(inv) => inv,
        None => return 0.0,
    };

    // beta = inv * XtY
    let mut beta_hat = vec![0.0; k];
    for i in 0..k {
        for j in 0..k {
            beta_hat[i] += inv[i * k + j] * xt_y[j];
        }
    }

    // Compute residuals and standard error
    let mut ssr = 0.0;
    for i in 0..m {
        let fitted = beta_hat[0] + beta_hat[1] * y_lag[i] + beta_hat[2] * dy_lag[i];
        let resid = dy[i] - fitted;
        ssr += resid * resid;
    }

    let df = m as f64 - k as f64;
    if df <= 0.0 {
        return 0.0;
    }
    let sigma2 = ssr / df;

    // Standard error of beta_hat[1] (coefficient on y_lag)
    // se = sqrt(sigma2 * (XtX^{-1})[1,1])
    let se = (sigma2 * inv[1 * k + 1]).max(1e-20).sqrt();

    // t-statistic
    if se > 0.0 {
        beta_hat[1] / se
    } else {
        0.0
    }
}

fn matrix_inverse(m: &[f64], n: usize) -> Option<Vec<f64>> {
    let mut aug = vec![0.0; n * 2 * n];
    for i in 0..n {
        for j in 0..n {
            aug[i * 2 * n + j] = m[i * n + j];
        }
        aug[i * 2 * n + n + i] = 1.0;
    }
    for col in 0..n {
        let mut pivot = col;
        for row in (col + 1)..n {
            if aug[row * 2 * n + col].abs() > aug[pivot * 2 * n + col].abs() {
                pivot = row;
            }
        }
        if aug[pivot * 2 * n + col].abs() < 1e-12 {
            return None;
        }
        if pivot != col {
            for j in 0..(2 * n) {
                let tmp = aug[col * 2 * n + j];
                aug[col * 2 * n + j] = aug[pivot * 2 * n + j];
                aug[pivot * 2 * n + j] = tmp;
            }
        }
        let pivot_val = aug[col * 2 * n + col];
        for j in 0..(2 * n) {
            aug[col * 2 * n + j] /= pivot_val;
        }
        for row in 0..n {
            if row == col {
                continue;
            }
            let factor = aug[row * 2 * n + col];
            for j in 0..(2 * n) {
                aug[row * 2 * n + j] -= factor * aug[col * 2 * n + j];
            }
        }
    }
    let mut inv = Vec::with_capacity(n * n);
    for i in 0..n {
        for j in n..(2 * n) {
            inv.push(aug[i * 2 * n + j]);
        }
    }
    Some(inv)
}

/// Engle-Granger cointegration test for two price series.
/// Returns (beta, adf_statistic, half_life, is_cointegrated).
pub fn engle_granger(y: &[f64], x: &[f64]) -> CointegrationResult {
    let (alpha, beta, residuals) = ols(x, y);
    let adf_stat = adf_test(&residuals);

    // MacKinnon critical values for Engle-Granger (2 variables):
    // 1%: -3.9001, 5%: -3.3393, 10%: -3.0462
    let is_cointegrated_5pct = adf_stat < -3.3393;

    // Half-life of mean reversion from the residuals
    // If ρ is the AR(1) coefficient from Δε_t = ρ*ε_{t-1} + noise
    // then half-life = -ln(2) / ln(1 + ρ)
    // We approximate ρ from the ADF regression coefficient
    let n = residuals.len();
    let mut rho_sum = 0.0;
    let mut lag_sum = 0.0;
    for t in 1..n {
        let dres = residuals[t] - residuals[t - 1];
        rho_sum += dres * residuals[t - 1];
        lag_sum += residuals[t - 1].powi(2);
    }
    let rho = if lag_sum > 0.0 { rho_sum / lag_sum } else { 0.0 };
    let half_life = if rho < 0.0 && rho > -2.0 {
        let denom = (1.0 + rho).ln();
        if denom.abs() > 1e-10 {
            let hl = -(2.0f64).ln() / denom;
            if hl.is_finite() && hl > 0.0 { hl } else { 9999.0 }
        } else {
            9999.0
        }
    } else {
        9999.0
    };

    // Spread = y - beta*x (the hedged portfolio)
    let spread: Vec<f64> = y.iter().zip(x.iter()).map(|(&yi, &xi)| yi - alpha - beta * xi).collect();

    let z_score = if !spread.is_empty() {
        let mean = spread.iter().sum::<f64>() / spread.len() as f64;
        let var = spread.iter().map(|s| (s - mean).powi(2)).sum::<f64>() / spread.len() as f64;
        let std = var.sqrt();
        if std > 0.0 {
            (spread[spread.len() - 1] - mean) / std
        } else {
            0.0
        }
    } else {
        0.0
    };

    CointegrationResult {
        hedge_ratio: beta,
        intercept: alpha,
        adf_statistic: adf_stat,
        half_life,
        is_cointegrated: is_cointegrated_5pct,
        spread,
        z_score,
    }
}

#[derive(Debug, Clone)]
pub struct CointegrationResult {
    pub hedge_ratio: f64,
    pub intercept: f64,
    pub adf_statistic: f64,
    pub half_life: f64,
    pub is_cointegrated: bool,
    pub spread: Vec<f64>,
    pub z_score: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cointegrated_pair() {
        // Two synthetic cointegrated series: y = 2*x + noise(0, 0.1)
        let n = 200;
        let x: Vec<f64> = (0..n).map(|i| (i as f64 * 0.01).sin() * 10.0 + 100.0).collect();
        let y: Vec<f64> = x.iter().map(|&xi| 2.0 * xi + (xi % 3.0 - 1.5) * 0.05).collect();
        let result = engle_granger(&y, &x);
        assert!(result.is_cointegrated, "Should be cointegrated");
        assert!((result.hedge_ratio - 2.0).abs() < 0.1, "Hedge ratio should be ~2");
        assert!(result.half_life < 50.0, "Half-life should be short");
    }

    #[test]
    fn test_non_cointegrated() {
        // Two random walks
        let n = 200;
        let mut x = vec![100.0; n];
        let mut y = vec![50.0; n];
        for i in 1..n {
            x[i] = x[i - 1] + ((i as f64 * 7.0) % 2.0 - 1.0);
            y[i] = y[i - 1] + ((i as f64 * 11.0) % 2.0 - 1.0);
        }
        let result = engle_granger(&y, &x);
        assert!(!result.is_cointegrated, "Random walks should not be cointegrated");
    }
}

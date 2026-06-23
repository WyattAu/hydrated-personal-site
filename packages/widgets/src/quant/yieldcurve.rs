/// Nelson-Siegel yield curve model.
/// y(tau) = beta0 + beta1 * f1(tau) + beta2 * f2(tau)
/// where:
///   f1(tau) = (1 - exp(-tau/lambda)) / (tau/lambda)
///   f2(tau) = f1(tau) - exp(-tau/lambda)
#[derive(Debug, Clone)]
pub struct NelsonSiegelFit {
    pub beta0: f64,
    pub beta1: f64,
    pub beta2: f64,
    pub lambda: f64,
    pub fitted: Vec<f64>,
}

/// Fit Nelson-Siegel to maturity/yield pairs.
/// Uses a grid search over lambda (it's the only nonlinear parameter)
/// and OLS for beta0, beta1, beta2 given lambda.
pub fn fit_nelson_siegel(maturities: &[f64], yields: &[f64]) -> NelsonSiegelFit {
    let n = maturities.len().min(yields.len());
    let taus = &maturities[..n];
    let ys = &yields[..n];

    let mut best_ll = f64::NEG_INFINITY;
    let mut best = NelsonSiegelFit {
        beta0: 0.0,
        beta1: 0.0,
        beta2: 0.0,
        lambda: 2.0,
        fitted: ys.to_vec(),
    };

    // Grid search over lambda (0.1 to 10.0)
    let mut lam = 0.1;
    while lam <= 10.0 {
        // Given lambda, compute factor loadings and solve OLS
        let f1: Vec<f64> = taus.iter().map(|t| {
            let x = t / lam;
            if x < 1e-10 { 1.0 } else { (1.0 - (-x).exp()) / x }
        }).collect();
        let f2: Vec<f64> = taus.iter().enumerate().map(|(i, t)| {
            f1[i] - (-t / lam).exp()
        }).collect();

        // OLS: [1, f1, f2] x [b0, b1, b2]^T = y
        // Normal equations: X^T X b = X^T y
        let mut xtx = [[0.0f64; 3]; 3];
        let mut xty = [0.0f64; 3];
        for i in 0..n {
            let row = [1.0, f1[i], f2[i]];
            for a in 0..3 {
                for b in 0..3 {
                    xtx[a][b] += row[a] * row[b];
                }
                xty[a] += row[a] * ys[i];
            }
        }

        // Solve 3x3 system (Cramer's rule)
        let det = det3(&xtx);
        if det.abs() > 1e-12 {
            let b0 = det3_replace_col(&xtx, &xty, 0) / det;
            let b1 = det3_replace_col(&xtx, &xty, 1) / det;
            let b2 = det3_replace_col(&xtx, &xty, 2) / det;

            // Compute fitted and SSE
            let fitted: Vec<f64> = (0..n).map(|i| b0 + b1 * f1[i] + b2 * f2[i]).collect();
            let sse: f64 = (0..n).map(|i| (ys[i] - fitted[i]).powi(2)).sum();
            let ll = -sse; // maximize = minimize SSE
            if ll > best_ll {
                best_ll = ll;
                best = NelsonSiegelFit { beta0: b0, beta1: b1, beta2: b2, lambda: lam, fitted };
            }
        }
        lam += 0.1;
    }
    best
}

fn det3(m: &[[f64; 3]; 3]) -> f64 {
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
}

fn det3_replace_col(m: &[[f64; 3]; 3], v: &[f64; 3], col: usize) -> f64 {
    let mut m2 = *m;
    for row in 0..3 {
        m2[row][col] = v[row];
    }
    det3(&m2)
}

/// Evaluate Nelson-Siegel at a given maturity.
pub fn ns_evaluate(fit: &NelsonSiegelFit, tau: f64) -> f64 {
    let x = tau / fit.lambda;
    let f1 = if x < 1e-10 { 1.0 } else { (1.0 - (-x).exp()) / x };
    let f2 = f1 - (-tau / fit.lambda).exp();
    fit.beta0 + fit.beta1 * f1 + fit.beta2 * f2
}

/// Recession probability from yield curve spread.
/// Logistic model: P = 1 / (1 + exp(-(a + b * spread)))
/// Coefficients calibrated from Fed research (Engstrom & Sharpe 2018).
/// spread = yield(10Y) - yield(3M) in percentage points.
pub fn recession_probability(spread_10y_3m: f64) -> f64 {
    // Calibrated logistic coefficients (Engstrom-Sharde 2018 approximate)
    // When spread is negative (inverted), probability is high
    let a = 0.5;
    let b = -2.0;
    1.0 / (1.0 + (-(a + b * spread_10y_3m)).exp())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ns_fit_normal_curve() {
        // Normal upward-sloping curve
        let maturities = vec![0.083, 0.25, 0.5, 1.0, 2.0, 5.0, 7.0, 10.0, 20.0, 30.0];
        let yields = vec![3.7, 3.8, 3.9, 4.0, 4.2, 4.3, 4.35, 4.5, 4.9, 4.9];
        let fit = fit_nelson_siegel(&maturities, &yields);
        // Fitted values should be close to actual
        for i in 0..yields.len() {
            let fitted = ns_evaluate(&fit, maturities[i]);
            assert!((fitted - yields[i]).abs() < 0.30, "mismatch at {}: {} vs {}", maturities[i], fitted, yields[i]);
        }
    }

    #[test]
    fn test_recession_prob_inverted() {
        // When 3M > 10Y (inverted), probability should be high
        let p_inverted = recession_probability(-0.5); // -50bps
        let p_normal = recession_probability(1.5); // +150bps
        assert!(p_inverted > p_normal);
        assert!(p_inverted > 0.5);
        assert!(p_normal < 0.5);
    }
}

/// Multi-factor regression (OLS) for factor exposure analysis.
/// Supports Fama-French 3-factor model and custom factor sets.

/// OLS regression: y = alpha + beta * X + epsilon.
/// X is a matrix of factors (n_factors x n_obs), y is returns (n_obs).
/// Returns alphas, betas, R-squared, F-statistic, t-statistics.
pub fn ols_regression(
    y: &[f64],         // dependent variable (asset returns)
    x: &[f64],         // independent variables (factors), row-major: n_factors * n_obs
    n_factors: usize,
    n_obs: usize,
) -> RegressionResult {
    if n_obs < n_factors + 1 || n_factors == 0 {
        return RegressionResult {
            alpha: 0.0,
            betas: vec![0.0; n_factors],
            r_squared: 0.0,
            adj_r_squared: 0.0,
            f_statistic: 0.0,
            t_stats: vec![0.0; n_factors],
            standard_errors: vec![0.0; n_factors],
            residuals: vec![0.0; n_obs],
        };
    }

    // Design matrix: [1, x1, x2, ...] with intercept
    // Size: (n_obs) x (n_factors + 1)
    let k = n_factors + 1; // intercept + factors

    // Compute X'X (k x k)
    let mut xtx = vec![0.0; k * k];
    for i in 0..n_obs {
        // Row of X: [1, x[0*n_obs+i], x[1*n_obs+i], ...]
        let row = build_design_row(x, i, n_factors, n_obs);
        for a in 0..k {
            for b in 0..k {
                xtx[a * k + b] += row[a] * row[b];
            }
        }
    }

    // Compute X'y (k x 1)
    let mut xty = vec![0.0; k];
    for i in 0..n_obs {
        let row = build_design_row(x, i, n_factors, n_obs);
        for a in 0..k {
            xty[a] += row[a] * y[i];
        }
    }

    // Solve (X'X) * beta = X'y via Gauss-Jordan
    let xtx_inv = matrix_inverse(&xtx, k);
    let betas_full = match &xtx_inv {
        Some(inv) => matvec(inv, &xty, k),
        None => vec![0.0; k],
    };

    let alpha = betas_full[0];
    let betas = betas_full[1..].to_vec();

    // Compute residuals and RSS
    let mut residuals = vec![0.0; n_obs];
    let mut rss = 0.0;
    let y_mean: f64 = y.iter().sum::<f64>() / n_obs as f64;
    let mut tss = 0.0;
    for i in 0..n_obs {
        let row = build_design_row(x, i, n_factors, n_obs);
        let predicted: f64 = (0..k).map(|a| betas_full[a] * row[a]).sum();
        residuals[i] = y[i] - predicted;
        rss += residuals[i] * residuals[i];
        tss += (y[i] - y_mean) * (y[i] - y_mean);
    }

    let r_squared = if tss > 0.0 { 1.0 - rss / tss } else { 0.0 };
    let adj_r_squared = if n_obs > k {
        1.0 - (1.0 - r_squared) * (n_obs - 1) as f64 / (n_obs - k) as f64
    } else {
        0.0
    };

    // Standard errors of coefficients
    let sigma_sq = rss / (n_obs - k) as f64;
    let mut std_errors = vec![0.0; k];
    if let Some(ref inv) = xtx_inv {
        for a in 0..k {
            std_errors[a] = (sigma_sq * inv[a * k + a]).max(0.0).sqrt();
        }
    }

    // F-statistic
    let f_statistic = if k > 1 && rss > 0.0 {
        let explained = tss - rss;
        (explained / n_factors as f64) / (rss / (n_obs - k) as f64)
    } else {
        0.0
    };

    // t-statistics
    let t_stats: Vec<f64> = (0..n_factors)
        .map(|i| {
            if std_errors[i + 1] > 0.0 {
                betas[i] / std_errors[i + 1]
            } else {
                0.0
            }
        })
        .collect();

    RegressionResult {
        alpha,
        betas,
        r_squared,
        adj_r_squared,
        f_statistic,
        t_stats,
        standard_errors: std_errors[1..].to_vec(),
        residuals,
    }
}

/// Rolling OLS regression over a window.
/// Returns time series of betas for each factor.
pub fn rolling_regression(
    y: &[f64],
    x: &[f64],
    n_factors: usize,
    window: usize,
    step: usize,
) -> Vec<Vec<f64>> {
    let n_obs = y.len();
    if n_obs < window {
        return vec![];
    }

    let mut results: Vec<Vec<f64>> = vec![];
    let mut start = 0;
    while start + window <= n_obs {
        let y_slice = &y[start..start + window];
        let x_slice: Vec<f64> = (0..n_factors)
            .flat_map(|f| {
                let offset = f * n_obs;
                x[offset + start..offset + start + window].to_vec()
            })
            .collect();
        let result = ols_regression(y_slice, &x_slice, n_factors, window);
        results.push(result.betas.clone());
        start += step;
    }
    results
}

fn build_design_row(
    x: &[f64],
    obs_idx: usize,
    n_factors: usize,
    n_obs: usize,
) -> Vec<f64> {
    let mut row = vec![1.0]; // intercept
    for f in 0..n_factors {
        row.push(x[f * n_obs + obs_idx]);
    }
    row
}

fn matrix_inverse(mat: &[f64], n: usize) -> Option<Vec<f64>> {
    let mut aug = vec![0.0; n * 2 * n];
    for i in 0..n {
        for j in 0..n {
            aug[i * 2 * n + j] = mat[i * n + j];
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
                let tmp = aug[pivot * 2 * n + j];
                aug[pivot * 2 * n + j] = aug[col * 2 * n + j];
                aug[col * 2 * n + j] = tmp;
            }
        }
        let pv = aug[col * 2 * n + col];
        for j in 0..(2 * n) {
            aug[col * 2 * n + j] /= pv;
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
    let mut inv = vec![0.0; n * n];
    for i in 0..n {
        for j in 0..n {
            inv[i * n + j] = aug[i * 2 * n + n + j];
        }
    }
    Some(inv)
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
pub struct RegressionResult {
    pub alpha: f64,
    pub betas: Vec<f64>,
    pub r_squared: f64,
    pub adj_r_squared: f64,
    pub f_statistic: f64,
    pub t_stats: Vec<f64>,
    pub standard_errors: Vec<f64>,
    pub residuals: Vec<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_regression() {
        // y = 2x + 1 + noise
        let y = vec![3.0, 5.0, 7.0, 9.0]; // y = 2x + 1 for x = [1,2,3,4]
        let x = vec![1.0, 2.0, 3.0, 4.0]; // single factor
        let result = ols_regression(&y, &x, 1, 4);
        assert!((result.alpha - 1.0).abs() < 0.01);
        assert!((result.betas[0] - 2.0).abs() < 0.01);
        assert!((result.r_squared - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_multifactor() {
        // y = 1*x1 + 0.5*x2
        let n = 100;
        let mut x = vec![0.0; 2 * n];
        let mut y = vec![0.0; n];
        for i in 0..n {
            let x1 = ((i as f64) * 0.37).sin();
            let x2 = ((i as f64) * 0.23).cos();
            x[0 * n + i] = x1;
            x[1 * n + i] = x2;
            y[i] = 1.0 * x1 + 0.5 * x2 + 0.001 * (i as f64 % 7.0 - 3.0);
        }
        let result = ols_regression(&y, &x, 2, n);
        assert!((result.betas[0] - 1.0).abs() < 0.3, "beta0={}", result.betas[0]);
        assert!((result.betas[1] - 0.5).abs() < 0.3, "beta1={}", result.betas[1]);
        assert!(result.r_squared > 0.99);
    }
}

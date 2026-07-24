use super::montecarlo;

/// Compute Pearson correlation between two arrays.
pub fn correlation(a: &[f64], b: &[f64]) -> f64 {
    let n = a.len().min(b.len()) as f64;
    if n < 2.0 {
        return 0.0;
    }
    let ma = montecarlo::mean(a);
    let mb = montecarlo::mean(b);
    let mut cov = 0.0;
    let mut va = 0.0;
    let mut vb = 0.0;
    for i in 0..n as usize {
        let da = a[i] - ma;
        let db = b[i] - mb;
        cov += da * db;
        va += da * da;
        vb += db * db;
    }
    if va == 0.0 || vb == 0.0 {
        return 0.0;
    }
    cov / (va * vb).sqrt()
}

/// NxN correlation matrix from a returns matrix.
/// `returns`: N assets x T periods, row-major.
pub fn correlation_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> Vec<f64> {
    let mut result = vec![0.0; n_assets * n_assets];
    for i in 0..n_assets {
        let row_i: Vec<f64> = (0..n_periods).map(|t| returns[i * n_periods + t]).collect();
        result[i * n_assets + i] = 1.0; // diagonal
        for j in (i + 1)..n_assets {
            let row_j: Vec<f64> = (0..n_periods).map(|t| returns[j * n_periods + t]).collect();
            let c = correlation(&row_i, &row_j);
            result[i * n_assets + j] = c;
            result[j * n_assets + i] = c;
        }
    }
    result
}

/// NxN covariance matrix from a returns matrix.
pub fn covariance_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> Vec<f64> {
    // Compute means
    let means: Vec<f64> = (0..n_assets)
        .map(|i| {
            let sum: f64 = (0..n_periods).map(|t| returns[i * n_periods + t]).sum();
            sum / n_periods as f64
        })
        .collect();

    let mut cov = vec![0.0; n_assets * n_assets];
    for i in 0..n_assets {
        for j in i..n_assets {
            let mut s = 0.0;
            for t in 0..n_periods {
                s += (returns[i * n_periods + t] - means[i]) * (returns[j * n_periods + t] - means[j]);
            }
            let v = s / (n_periods as f64 - 1.0);
            cov[i * n_assets + j] = v;
            cov[j * n_assets + i] = v;
        }
    }
    cov
}

/// Simple linear regression: y = alpha + beta * x.
/// Returns (alpha, beta, r_squared).
pub fn linear_regression(x: &[f64], y: &[f64]) -> (f64, f64, f64) {
    let _n = x.len() as f64;
    let mx = montecarlo::mean(x);
    let my = montecarlo::mean(y);
    let mut sxy = 0.0;
    let mut sxx = 0.0;
    let mut syy = 0.0;
    for i in 0..x.len() {
        let dx = x[i] - mx;
        sxy += dx * (y[i] - my);
        sxx += dx * dx;
        syy += (y[i] - my) * (y[i] - my);
    }
    let beta = if sxx > 0.0 { sxy / sxx } else { 0.0 };
    let alpha = my - beta * mx;
    let r_sq = if syy > 0.0 { (sxy * sxy) / (sxx * syy) } else { 0.0 };
    (alpha, beta, r_sq)
}

/// Matrix multiply for small matrices (NxN * Nx1 = Nx1).
fn matvec(mat: &[f64], vec: &[f64], n: usize) -> Vec<f64> {
    let mut result = vec![0.0; n];
    for i in 0..n {
        for j in 0..n {
            result[i] += mat[i * n + j] * vec[j];
        }
    }
    result
}

/// Gauss-Jordan matrix inverse for small NxN matrices.
pub fn matrix_inverse(mat: &[f64], n: usize) -> Option<Vec<f64>> {
    let mut aug = vec![0.0; n * 2 * n];
    for i in 0..n {
        for j in 0..n {
            aug[i * 2 * n + j] = mat[i * n + j];
        }
        aug[i * 2 * n + n + i] = 1.0; // identity on right
    }
    for col in 0..n {
        // Find pivot
        let mut pivot = col;
        for row in (col + 1)..n {
            if aug[row * 2 * n + col].abs() > aug[pivot * 2 * n + col].abs() {
                pivot = row;
            }
        }
        if aug[pivot * 2 * n + col].abs() < 1e-12 {
            return None; // singular
        }
        // Swap rows
        if pivot != col {
            for j in 0..(2 * n) {
                let tmp = aug[pivot * 2 * n + j];
                aug[pivot * 2 * n + j] = aug[col * 2 * n + j];
                aug[col * 2 * n + j] = tmp;
            }
        }
        // Scale pivot row
        let pv = aug[col * 2 * n + col];
        for j in 0..(2 * n) {
            aug[col * 2 * n + j] /= pv;
        }
        // Eliminate
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

/// Markowitz tangency portfolio (maximum Sharpe ratio).
///
/// Returns weights vector of length n_assets.
pub fn tangency_portfolio(
    cov: &[f64],
    mean_returns: &[f64],
    risk_free: f64,
    n_assets: usize,
) -> Vec<f64> {
    let excess: Vec<f64> = mean_returns.iter().map(|m| m - risk_free).collect();

    let cov_inv = match matrix_inverse(cov, n_assets) {
        Some(inv) => inv,
        None => return vec![1.0 / n_assets as f64; n_assets], // equal weight fallback
    };

    let weighted = matvec(&cov_inv, &excess, n_assets);
    let sum: f64 = weighted.iter().sum();
    if sum.abs() < 1e-12 {
        return vec![1.0 / n_assets as f64; n_assets];
    }
    weighted.iter().map(|w| w / sum).collect()
}

/// Evaluate a portfolio: return, risk (std dev), Sharpe.
pub fn evaluate_portfolio(
    weights: &[f64],
    mean_returns: &[f64],
    cov: &[f64],
    risk_free: f64,
    n_assets: usize,
) -> (f64, f64, f64) {
    // Return = w^T * mean
    let ret: f64 = (0..n_assets).map(|i| weights[i] * mean_returns[i]).sum();
    // Risk = sqrt(w^T * Cov * w)
    let cov_w = matvec(cov, weights, n_assets);
    let var: f64 = (0..n_assets).map(|i| weights[i] * cov_w[i]).sum();
    let risk = var.max(0.0).sqrt();
    let sharpe = if risk > 0.0 { (ret - risk_free) / risk } else { 0.0 };
    (ret, risk, sharpe)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_correlation_identity() {
        let a = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert!((correlation(&a, &a) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_correlation_negative() {
        let a = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let b = vec![5.0, 4.0, 3.0, 2.0, 1.0];
        assert!((correlation(&a, &b) - (-1.0)).abs() < 0.001);
    }

    #[test]
    fn test_tangency_two_assets() {
        // Two assets: A (ret=0.10, vol=0.15), B (ret=0.05, vol=0.10), corr=0.3
        let mean = vec![0.10, 0.05];
        let cov = vec![0.0225, 0.0045, 0.0045, 0.01]; // 2x2
        let weights = tangency_portfolio(&cov, &mean, 0.02, 2);
        assert!((weights[0] + weights[1] - 1.0).abs() < 0.001);
        assert!(weights[0] > weights[1]); // higher return asset gets more weight
    }

    #[test]
    fn test_linear_regression() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0]; // y = 2x
        let (alpha, beta, r_sq) = linear_regression(&x, &y);
        assert!((alpha).abs() < 0.001);
        assert!((beta - 2.0).abs() < 0.001);
        assert!((r_sq - 1.0).abs() < 0.001);
    }
}

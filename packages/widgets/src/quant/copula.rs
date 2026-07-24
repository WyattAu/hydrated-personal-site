//! Tail dependence and copula metrics.
//!
//! Empirical tail dependence coefficients:
//! - Lower tail dependence λ⁻ = P(X < F⁻¹(q) | Y < G⁻¹(q))
//! - Upper tail dependence λ⁺ = P(X > F⁻¹(1-q) | Y > G⁻¹(1-q))
//!
//! These capture non-linear dependence in the tails (crashes, rallies)
//! that Pearson correlation completely misses.

/// Compute empirical tail dependence coefficients for two return series.
/// q is the quantile threshold (e.g., 0.05 for 5% tail).
pub fn tail_dependence(x: &[f64], y: &[f64], q: f64) -> TailDependence {
    let n = x.len().min(y.len());
    if n < 20 {
        return TailDependence {
            lower: 0.0,
            upper: 0.0,
            kendall_tau: 0.0,
            spearman_rho: 0.0,
        };
    }

    let q = q.max(0.01).min(0.20); // clamp

    // Sort copies to find quantile thresholds
    let mut x_sorted = x[..n].to_vec();
    let mut y_sorted = y[..n].to_vec();
    x_sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    y_sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let lower_idx = ((n as f64) * q).floor() as usize;
    let upper_idx = ((n as f64) * (1.0 - q)).ceil() as usize;

    let x_lower = x_sorted[lower_idx.min(n - 1)];
    let y_lower = y_sorted[lower_idx.min(n - 1)];
    let x_upper = x_sorted[upper_idx.min(n - 1)];
    let y_upper = y_sorted[upper_idx.min(n - 1)];

    // Lower tail: P(X < x_q | Y < y_q)
    let mut both_lower = 0;
    let mut y_lower_count = 0;
    for i in 0..n {
        if y[i] < y_lower {
            y_lower_count += 1;
            if x[i] < x_lower {
                both_lower += 1;
            }
        }
    }
    let lower = if y_lower_count > 0 {
        both_lower as f64 / y_lower_count as f64
    } else {
        0.0
    };

    // Upper tail: P(X > x_{1-q} | Y > y_{1-q})
    let mut both_upper = 0;
    let mut y_upper_count = 0;
    for i in 0..n {
        if y[i] > y_upper {
            y_upper_count += 1;
            if x[i] > x_upper {
                both_upper += 1;
            }
        }
    }
    let upper = if y_upper_count > 0 {
        both_upper as f64 / y_upper_count as f64
    } else {
        0.0
    };

    // Kendall's tau (rank correlation invariant to monotonic transforms)
    let mut concordant = 0i64;
    let mut discordant = 0i64;
    for i in 0..n {
        for j in (i + 1)..n {
            let dx = x[i] - x[j];
            let dy = y[i] - y[j];
            if (dx > 0.0 && dy > 0.0) || (dx < 0.0 && dy < 0.0) {
                concordant += 1;
            } else if (dx > 0.0 && dy < 0.0) || (dx < 0.0 && dy > 0.0) {
                discordant += 1;
            }
        }
    }
    let total = concordant + discordant;
    let kendall_tau = if total > 0 {
        (concordant - discordant) as f64 / total as f64
    } else {
        0.0
    };

    // Spearman's rho (rank-based Pearson)
    let mut x_ranks = rank(&x[..n]);
    let mut y_ranks = rank(&y[..n]);
    let spearman_rho = pearson(&x_ranks, &y_ranks);
    let _ = &mut x_ranks;
    let _ = &mut y_ranks;

    TailDependence {
        lower,
        upper,
        kendall_tau,
        spearman_rho,
    }
}

fn rank(data: &[f64]) -> Vec<f64> {
    let n = data.len();
    let mut indices: Vec<usize> = (0..n).collect();
    indices.sort_by(|&a, &b| data[a].partial_cmp(&data[b]).unwrap_or(std::cmp::Ordering::Equal));
    let mut ranks = vec![0.0; n];
    for (rank_val, &idx) in indices.iter().enumerate() {
        ranks[idx] = (rank_val + 1) as f64;
    }
    ranks
}

fn pearson(x: &[f64], y: &[f64]) -> f64 {
    let n = x.len().min(y.len());
    if n < 2 {
        return 0.0;
    }
    let mx = x.iter().sum::<f64>() / n as f64;
    let my = y.iter().sum::<f64>() / n as f64;
    let mut sxy = 0.0;
    let mut sxx = 0.0;
    let mut syy = 0.0;
    for i in 0..n {
        sxy += (x[i] - mx) * (y[i] - my);
        sxx += (x[i] - mx).powi(2);
        syy += (y[i] - my).powi(2);
    }
    if sxx > 0.0 && syy > 0.0 {
        sxy / (sxx * syy).sqrt()
    } else {
        0.0
    }
}

/// Compute tail dependence matrix for multiple assets.
/// Returns flat matrix (n_assets * n_assets, row-major) of lower-tail dependence.
pub fn tail_matrix(returns: &[f64], n_assets: usize, n_periods: usize) -> Vec<f64> {
    let mut matrix = vec![0.0; n_assets * n_assets];
    for i in 0..n_assets {
        let row_i: Vec<f64> = (0..n_periods).map(|t| returns[i * n_periods + t]).collect();
        for j in 0..n_assets {
            if i == j {
                matrix[i * n_assets + j] = 1.0;
            } else if j > i {
                let row_j: Vec<f64> = (0..n_periods).map(|t| returns[j * n_periods + t]).collect();
                let td = tail_dependence(&row_i, &row_j, 0.05);
                matrix[i * n_assets + j] = td.lower;
                matrix[j * n_assets + i] = td.lower;
            }
        }
    }
    matrix
}

#[derive(Debug, Clone)]
pub struct TailDependence {
    pub lower: f64,
    pub upper: f64,
    pub kendall_tau: f64,
    pub spearman_rho: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identical_series() {
        let x: Vec<f64> = (0..100).map(|i| (i as f64 * 0.1).sin()).collect();
        let td = tail_dependence(&x, &x, 0.05);
        assert!((td.lower - 1.0).abs() < 0.1, "Identical series: lower ~1, got {}", td.lower);
        assert!((td.upper - 1.0).abs() < 0.1, "Identical series: upper ~1, got {}", td.upper);
        assert!((td.kendall_tau - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_independent() {
        // Opposite series should have low tail dependence
        let x: Vec<f64> = (0..100).map(|i| (i as f64 * 0.1).sin()).collect();
        let y: Vec<f64> = x.iter().map(|v| -v).collect();
        let td = tail_dependence(&x, &y, 0.05);
        assert!(td.lower < 0.3, "Opposite series: low lower-tail, got {}", td.lower);
    }
}

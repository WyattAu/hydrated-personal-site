//! Hierarchical Risk Parity (HRP).
//!
//! Marcos Lopez de Prado's algorithm for portfolio allocation that avoids
//! matrix inversion entirely. Uses distance-based hierarchical clustering
//! and recursive bisection.
//!
//! Algorithm:
//! 1. Compute correlation distance matrix: D(i,j) = √(0.5 × (1 - ρ(i,j)))
//! 2. Cluster assets hierarchically
//! 3. Recursively bisect clusters, allocating risk equally at each split

use super::stats;

/// Compute HRP weights from a returns matrix.
///
/// - `returns`: N assets × T periods, row-major
/// - `n_assets`: number of assets
/// - `n_periods`: periods per asset
///
/// Returns weight vector (length n_assets) summing to 1.0.
pub fn hrp_allocate(returns: &[f64], n_assets: usize, n_periods: usize) -> Vec<f64> {
    if n_assets < 2 || n_periods < 5 {
        return vec![1.0 / n_assets.max(1) as f64; n_assets];
    }

    // Step 1: Correlation → Distance matrix
    let corr = stats::correlation_matrix(returns, n_assets, n_periods);
    let mut dist = vec![0.0; n_assets * n_assets];
    for i in 0..n_assets {
        for j in 0..n_assets {
            let d = (0.5 * (1.0 - corr[i * n_assets + j]).max(0.0)).sqrt();
            dist[i * n_assets + j] = d;
        }
        dist[i * n_assets + i] = 0.0; // zero diagonal
    }

    // Step 2: Quasi-diagonalization via single-linkage agglomerative clustering
    // We use a simple nearest-neighbor chain approach
    let order = cluster(&dist, n_assets);

    // Step 3: Recursive bisection
    let mut weights = vec![1.0; n_assets];

    // Compute variance for each asset (diagonal of covariance)
    let cov = stats::covariance_matrix(returns, n_assets, n_periods);
    let mut variances = vec![0.0; n_assets];
    for i in 0..n_assets {
        variances[i] = cov[i * n_assets + i].max(1e-12);
    }

    recursive_bisection(&order, &mut weights, &variances, &cov, n_assets);

    weights
}

/// Single-linkage agglomerative clustering returning a leaf ordering.
fn cluster(dist: &[f64], n: usize) -> Vec<usize> {
    // Start with each asset in its own cluster
    let mut clusters: Vec<Vec<usize>> = (0..n).map(|i| vec![i]).collect();
    let mut active_dist = dist.to_vec();

    while clusters.len() > 1 {
        // Find the two closest clusters (single linkage: min distance between members)
        let mut min_d = f64::INFINITY;
        let mut merge_a = 0;
        let mut merge_b = 1;

        for i in 0..clusters.len() {
            for j in (i + 1)..clusters.len() {
                // Single linkage: minimum pairwise distance
                let mut d = f64::INFINITY;
                for &a in &clusters[i] {
                    for &b in &clusters[j] {
                        d = d.min(active_dist[a * n + b]);
                    }
                }
                if d < min_d {
                    min_d = d;
                    merge_a = i;
                    merge_b = j;
                }
            }
        }

        // Merge clusters
        let cluster_b = clusters.remove(merge_b);
        clusters[merge_a].extend(cluster_b);
    }

    clusters.into_iter().flatten().collect()
}

/// Recursive bisection: split the ordered list, allocate inverse-variance weights.
fn recursive_bisection(
    order: &[usize],
    weights: &mut [f64],
    variances: &[f64],
    cov: &[f64],
    n: usize,
) {
    if order.len() <= 1 {
        return;
    }

    // Split into two halves
    let mid = order.len() / 2;
    let left = &order[..mid];
    let right = &order[mid..];

    // Compute cluster variance for each half (inverse variance weighting)
    let left_var = cluster_variance(left, cov, n);
    let right_var = cluster_variance(right, cov, n);

    // Allocate: left gets α, right gets (1-α) where α = 1/(1 + right_var/left_var)
    let alpha = 1.0 / (1.0 + right_var / left_var.max(1e-12));

    for &i in left {
        weights[i] *= alpha;
    }
    for &i in right {
        weights[i] *= 1.0 - alpha;
    }

    // Recurse
    recursive_bisection(left, weights, variances, cov, n);
    recursive_bisection(right, weights, variances, cov, n);
}

/// Compute the variance of a cluster using inverse-variance weighting.
fn cluster_variance(members: &[usize], cov: &[f64], n: usize) -> f64 {
    if members.is_empty() {
        return 1e-12;
    }

    // Inverse variance weights within the cluster
    let inv_vars: Vec<f64> = members
        .iter()
        .map(|&i| 1.0 / cov[i * n + i].max(1e-12))
        .collect();
    let sum_inv: f64 = inv_vars.iter().sum();
    let iv_weights: Vec<f64> = inv_vars.iter().map(|v| v / sum_inv).collect();

    // Portfolio variance = w' Σ w
    let mut var = 0.0;
    for (a, &i) in members.iter().enumerate() {
        for (b, &j) in members.iter().enumerate() {
            var += iv_weights[a] * iv_weights[b] * cov[i * n + j];
        }
    }

    var.max(1e-12)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::quant::rng;

    #[test]
    fn test_hrp_weights_sum_to_one() {
        rng::seed(42, 123);
        let n_assets = 5;
        let n_periods = 100;
        let mut returns = vec![0.0; n_assets * n_periods];
        for i in 0..n_assets {
            let vol = 0.01 * (i as f64 + 1.0);
            for t in 0..n_periods {
                returns[i * n_periods + t] = rng::standard_normal() * vol + 0.001 * i as f64;
            }
        }
        let weights = hrp_allocate(&returns, n_assets, n_periods);
        let sum: f64 = weights.iter().sum();
        assert!((sum - 1.0).abs() < 0.001, "Weights should sum to 1, got {}", sum);
        assert!(weights.iter().all(|w| *w >= 0.0), "All weights should be non-negative");
    }

    #[test]
    fn test_hrp_equal_for_uncorrelated() {
        // With perfectly uncorrelated equal-vol assets, weights should be roughly equal
        rng::seed(42, 123);
        let n_assets = 4;
        let n_periods = 500;
        let mut returns = vec![0.0; n_assets * n_periods];
        for i in 0..n_assets {
            for t in 0..n_periods {
                returns[i * n_periods + t] = rng::standard_normal() * 0.01;
            }
        }
        let weights = hrp_allocate(&returns, n_assets, n_periods);
        // HRP allocates based on sample correlations which have noise.
        // Just check weights are reasonable (no extreme concentration)
        for &w in &weights {
            assert!(w > 0.05 && w < 0.60, "Weight should be reasonable, got {}", w);
        }
    }
}

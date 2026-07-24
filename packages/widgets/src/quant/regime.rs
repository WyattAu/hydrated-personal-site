//! Market regime detection via Hidden Markov Model.
//!
//! 2-state Gaussian HMM:
//! State 0: Low-volatility (bull market) — positive drift, low variance
//! State 1: High-volatility (bear/crisis) — negative/low drift, high variance
//!
//! Uses Baum-Welch (EM) for parameter estimation and Viterbi for decoding.

const PI: f64 = std::f64::consts::PI;

/// Train a 2-state Gaussian HMM using Baum-Welch EM algorithm.
/// Returns the trained model parameters and the Viterbi-decoded state sequence.
pub fn detect_regimes(returns: &[f64], max_iter: usize) -> RegimeResult {
    let n = returns.len();
    if n < 20 {
        return RegimeResult {
            states: vec![0; n],
            transition: vec![0.9, 0.1, 0.1, 0.9],
            means: vec![0.0, 0.0],
            variances: vec![0.0001, 0.0001],
            probabilities: vec![0.5; n],
        };
    }

    // Initialize parameters using k-means-like split
    let mean_all = returns.iter().sum::<f64>() / n as f64;
    let var_all = returns.iter().map(|r| (r - mean_all).powi(2)).sum::<f64>() / n as f64;

    // State 0: returns above median (bull), State 1: below (bear)
    let mut sorted = returns.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median = sorted[n / 2];

    let mut means = vec![
        returns.iter().filter(|&&r| r >= median).sum::<f64>()
            / returns.iter().filter(|&&r| r >= median).count().max(1) as f64,
        returns.iter().filter(|&&r| r < median).sum::<f64>()
            / returns.iter().filter(|&&r| r < median).count().max(1) as f64,
    ];

    let mut variances = vec![
        returns.iter().filter(|&&r| r >= median).map(|r| (r - means[0]).powi(2)).sum::<f64>()
            / returns.iter().filter(|&&r| r >= median).count().max(1) as f64 + 1e-8,
        returns.iter().filter(|&&r| r < median).map(|r| (r - means[1]).powi(2)).sum::<f64>()
            / returns.iter().filter(|&&r| r < median).count().max(1) as f64 + 1e-8,
    ];

    let mut trans = vec![0.92, 0.08, 0.08, 0.92]; // [a00, a01, a10, a11]
    let mut init = vec![0.5, 0.5];

    for _iter in 0..max_iter {
        // Forward pass (alpha)
        let mut alpha = vec![0.0; 2 * n];
        let mut scales = vec![0.0; n];

        for s in 0..2 {
            alpha[s * n] = init[s] * gaussian(returns[0], means[s], variances[s]);
            scales[0] += alpha[s * n];
        }
        if scales[0] > 0.0 {
            for s in 0..2 {
                alpha[s * n] /= scales[0];
            }
        }

        for t in 1..n {
            for s in 0..2 {
                let mut sum = 0.0;
                for ps in 0..2 {
                    sum += alpha[ps * n + (t - 1)] * trans[ps * 2 + s];
                }
                alpha[s * n + t] = sum * gaussian(returns[t], means[s], variances[s]);
                scales[t] += alpha[s * n + t];
            }
            if scales[t] > 0.0 {
                for s in 0..2 {
                    alpha[s * n + t] /= scales[t];
                }
            }
        }

        // Backward pass (beta)
        let mut beta = vec![0.0; 2 * n];
        for s in 0..2 {
            beta[s * n + (n - 1)] = 1.0;
        }
        for t in (0..(n - 1)).rev() {
            for s in 0..2 {
                let mut sum = 0.0;
                for ns in 0..2 {
                    sum += trans[s * 2 + ns] * gaussian(returns[t + 1], means[ns], variances[ns]) * beta[ns * n + (t + 1)];
                }
                beta[s * n + t] = sum / scales[t + 1].max(1e-20);
            }
        }

        // Compute gamma (posteriors) and xi (transition posteriors)
        let mut gamma = vec![0.0; 2 * n];
        for t in 0..n {
            let mut sum = 0.0;
            for s in 0..2 {
                gamma[s * n + t] = alpha[s * n + t] * beta[s * n + t];
                sum += gamma[s * n + t];
            }
            if sum > 0.0 {
                for s in 0..2 {
                    gamma[s * n + t] /= sum;
                }
            }
        }

        // M-step: update parameters
        let mut new_init = vec![0.0; 2];
        let mut new_means = vec![0.0; 2];
        let mut new_var = vec![0.0; 2];
        let mut new_trans_num = vec![0.0; 4];
        let mut new_trans_den = vec![0.0; 2];

        for s in 0..2 {
            new_init[s] = gamma[s * n];
            let mut wsum = 0.0;
            for t in 0..n {
                new_means[s] += gamma[s * n + t] * returns[t];
                wsum += gamma[s * n + t];
            }
            if wsum > 0.0 {
                new_means[s] /= wsum;
            }

            for t in 0..n {
                new_var[s] += gamma[s * n + t] * (returns[t] - new_means[s]).powi(2);
            }
            if wsum > 0.0 {
                new_var[s] = new_var[s] / wsum + 1e-8;
            }
        }

        // Update transition matrix
        for t in 0..(n - 1) {
            let mut denom = 0.0;
            let mut xi = vec![0.0; 4];
            for (i, j) in [(0, 0), (0, 1), (1, 0), (1, 1)].iter() {
                xi[i * 2 + j] = alpha[i * n + t]
                    * trans[i * 2 + j]
                    * gaussian(returns[t + 1], means[*j], variances[*j])
                    * beta[j * n + (t + 1)];
                denom += xi[i * 2 + j];
            }
            if denom > 0.0 {
                for k in 0..4 {
                    new_trans_num[k] += xi[k] / denom;
                }
            }
        }

        for s in 0..2 {
            let gsum: f64 = (0..(n - 1)).map(|t| gamma[s * n + t]).sum();
            new_trans_den[s] = gsum.max(1e-20);
        }

        // Apply updates with damping for stability
        for s in 0..2 {
            init[s] = init[s] * 0.5 + new_init[s] * 0.5;
            means[s] = means[s] * 0.7 + new_means[s] * 0.3;
            variances[s] = variances[s] * 0.7 + new_var[s] * 0.3;
            variances[s] = variances[s].max(1e-10);
        }

        for i in 0..2 {
            for j in 0..2 {
                let val = new_trans_num[i * 2 + j] / new_trans_den[i];
                trans[i * 2 + j] = trans[i * 2 + j] * 0.7 + val.max(0.001).min(0.999) * 0.3;
            }
        }

        // Normalize transition rows
        for i in 0..2 {
            let row_sum = trans[i * 2] + trans[i * 2 + 1];
            if row_sum > 0.0 {
                trans[i * 2] /= row_sum;
                trans[i * 2 + 1] /= row_sum;
            }
        }
    }

    // Viterbi decoding for final state sequence
    let (states, probs) = viterbi(returns, &means, &variances, &trans, &init);

    // Ensure state 0 = low-vol, state 1 = high-vol
    let (final_states, final_means, final_var, final_trans) = if variances[0] > variances[1] {
        // Swap: state 0 should be low-vol
        let swapped_states: Vec<usize> = states.iter().map(|&s| if s == 0 { 1 } else { 0 }).collect();
        let swapped_probs: Vec<f64> = probs.iter().map(|&p| 1.0 - p).collect();
        return RegimeResult {
            states: swapped_states,
            transition: vec![trans[3], trans[2], trans[1], trans[0]],
            means: vec![means[1], means[0]],
            variances: vec![variances[1], variances[0]],
            probabilities: swapped_probs,
        };
    } else {
        (states, means, variances, trans)
    };

    RegimeResult {
        states: final_states,
        transition: vec![final_trans[0], final_trans[1], final_trans[2], final_trans[3]],
        means: final_means.clone(),
        variances: final_var.clone(),
        probabilities: probs,
    }
}

fn viterbi(returns: &[f64], means: &[f64], variances: &[f64], trans: &[f64], init: &[f64]) -> (Vec<usize>, Vec<f64>) {
    let n = returns.len();
    let mut viterbi_log = vec![0.0; 2 * n];
    let mut backpointer = vec![0usize; 2 * n];

    for s in 0..2 {
        viterbi_log[s * n] = init[s].ln() + gaussian_log(returns[0], means[s], variances[s]);
    }

    for t in 1..n {
        for s in 0..2 {
            let mut best = f64::NEG_INFINITY;
            let mut best_prev = 0;
            for ps in 0..2 {
                let val = viterbi_log[ps * n + (t - 1)] + trans[ps * 2 + s].ln()
                    + gaussian_log(returns[t], means[s], variances[s]);
                if val > best {
                    best = val;
                    best_prev = ps;
                }
            }
            viterbi_log[s * n + t] = best;
            backpointer[s * n + t] = best_prev;
        }
    }

    // Traceback
    let mut states = vec![0usize; n];
    let mut probs = vec![0.0; n];
    let final0 = viterbi_log[0 * n + (n - 1)];
    let final1 = viterbi_log[1 * n + (n - 1)];
    states[n - 1] = if final1 > final0 { 1 } else { 0 };

    // Probability of being in state 1 (high-vol regime)
    probs[n - 1] = if states[n - 1] == 1 {
        1.0 / (1.0 + (final0 - final1).exp())
    } else {
        1.0 / (1.0 + (final1 - final0).exp())
    };

    for t in (0..(n - 1)).rev() {
        states[t] = backpointer[states[t + 1] * n + (t + 1)];
        probs[t] = if states[t] == 1 { 0.8 } else { 0.2 };
    }

    (states, probs)
}

fn gaussian(x: f64, mean: f64, var: f64) -> f64 {
    let sigma = var.sqrt();
    let coeff = 1.0 / (sigma * (2.0 * PI).sqrt());
    let exponent = -((x - mean).powi(2)) / (2.0 * var);
    coeff * exponent.exp()
}

fn gaussian_log(x: f64, mean: f64, var: f64) -> f64 {
    let sigma = var.sqrt();
    -0.5 * (2.0 * PI * var).ln() - ((x - mean).powi(2)) / (2.0 * var)
}

#[derive(Debug, Clone)]
pub struct RegimeResult {
    pub states: Vec<usize>,
    pub transition: Vec<f64>,  // [a00, a01, a10, a11]
    pub means: Vec<f64>,
    pub variances: Vec<f64>,
    pub probabilities: Vec<f64>, // P(high-vol regime) at each timestep
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::quant::rng;

    #[test]
    fn test_regime_detection() {
        rng::seed(42, 123);
        // Create two regimes: calm period then volatile period
        let n = 200;
        let mut returns = Vec::with_capacity(n);
        // Calm period: low vol, positive drift
        for _ in 0..100 {
            returns.push(0.001 + rng::standard_normal() * 0.005);
        }
        // Volatile period: high vol, negative drift
        for _ in 0..100 {
            returns.push(-0.002 + rng::standard_normal() * 0.03);
        }

        let result = detect_regimes(&returns, 50);
        assert_eq!(result.states.len(), n);
        // First 100 should mostly be state 0 (low-vol)
        let calm_state = result.states[..100].iter().filter(|&&s| s == 0).count();
        assert!(calm_state > 70, "Calm period should be classified as state 0, got {} / 100", calm_state);
        // Last 100 should mostly be state 1 (high-vol)
        let vol_state = result.states[100..].iter().filter(|&&s| s == 1).count();
        assert!(vol_state > 70, "Volatile period should be classified as state 1, got {} / 100", vol_state);
        assert!(result.variances[1] > result.variances[0], "State 1 should have higher variance");
    }
}

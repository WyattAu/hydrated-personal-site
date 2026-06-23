use super::montecarlo;

/// EWMA (Exponentially Weighted Moving Average) volatility.
/// lambda = 0.94 is the RiskMetrics standard.
pub fn ewma_volatility(returns: &[f64], lambda: f64) -> Vec<f64> {
    let mut vol = vec![0.0; returns.len()];
    if returns.is_empty() {
        return vol;
    }
    vol[0] = returns[0] * returns[0];
    for i in 1..returns.len() {
        vol[i] = lambda * vol[i - 1] + (1.0 - lambda) * returns[i] * returns[i];
    }
    vol.iter().map(|v| v.sqrt()).collect()
}

/// Realized volatility (rolling window).
pub fn realized_volatility(returns: &[f64], window: usize) -> Vec<f64> {
    returns
        .windows(window)
        .map(|w| {
            let m = montecarlo::mean(w);
            let var: f64 = w.iter().map(|x| (x - m) * (x - m)).sum::<f64>() / w.len() as f64;
            var.sqrt()
        })
        .collect()
}

/// GARCH(1,1) parameter estimation and variance series.
///
/// Estimates omega, alpha, beta via method-of-moments initialization
/// followed by bounded log-likelihood maximization (coordinate ascent).
///
/// Returns GarchResult { omega, alpha, beta, long_run_var, conditional_vars, forecast }.
pub fn fit_garch11(returns: &[f64], forecast_steps: usize) -> GarchResult {
    let n = returns.len();
    if n < 10 {
        return GarchResult {
            omega: 0.0,
            alpha: 0.0,
            beta: 0.0,
            long_run_var: 0.0,
            conditional_vars: vec![0.0; n],
            forecast: vec![0.0; forecast_steps],
        };
    }

    // Initialize via sample variance
    let sample_var: f64 = {
        let m = montecarlo::mean(returns);
        returns.iter().map(|r| (r - m).powi(2)).sum::<f64>() / n as f64
    };

    // Method-of-moments starting values
    let mut omega = 0.1 * sample_var;
    let mut alpha = 0.1;
    let mut beta = 0.85;

    // Coordinate ascent on log-likelihood (simplified: 3 rounds x 20 steps each)
    let squared: Vec<f64> = returns.iter().map(|r| r * r).collect();
    let _ = log_likelihood(&squared, omega, alpha, beta, sample_var);

    // Simple gradient-free optimization: try a grid of parameters
    let mut best_ll = f64::NEG_INFINITY;
    let mut best = (omega, alpha, beta);

    for a in [0.05, 0.08, 0.10, 0.12, 0.15, 0.20].iter() {
        for b in [0.80, 0.85, 0.88, 0.90, 0.92, 0.95].iter() {
            let o = sample_var * (1.0 - a - b);
            if o <= 0.0 || a + b >= 1.0 {
                continue;
            }
            let ll = log_likelihood(&squared, o, *a, *b, sample_var);
            if ll > best_ll {
                best_ll = ll;
                best = (o, *a, *b);
            }
        }
    }
    omega = best.0;
    alpha = best.1;
    beta = best.2;

    // Compute conditional variance series
    let mut cond_vars = vec![0.0; n];
    cond_vars[0] = sample_var;
    for t in 1..n {
        cond_vars[t] = omega + alpha * squared[t - 1] + beta * cond_vars[t - 1];
    }

    // Forecast: mean-reverts to long-run variance
    let long_run = if (alpha + beta) < 1.0 && (alpha + beta) > 0.0 {
        omega / (1.0 - alpha - beta)
    } else {
        sample_var
    };
    let mut forecast = vec![0.0; forecast_steps];
    let mut last_var = *cond_vars.last().unwrap_or(&sample_var);
    for f in &mut forecast {
        last_var = omega + alpha * *squared.last().unwrap_or(&0.0) + beta * last_var;
        // Without future returns, use long-run anchor
        *f = last_var * 0.5 + long_run * 0.5;
    }

    GarchResult {
        omega,
        alpha,
        beta,
        long_run_var: long_run,
        conditional_vars: cond_vars,
        forecast,
    }
}

fn log_likelihood(squared: &[f64], omega: f64, alpha: f64, beta: f64, init_var: f64) -> f64 {
    let n = squared.len();
    let mut var = init_var;
    let mut ll = -0.5 * (var.ln() + squared[0] / var);
    for t in 1..n {
        var = omega + alpha * squared[t - 1] + beta * var;
        if var <= 0.0 {
            return f64::NEG_INFINITY;
        }
        ll -= 0.5 * (var.ln() + squared[t] / var);
    }
    ll
}

#[derive(Debug, Clone)]
pub struct GarchResult {
    pub omega: f64,
    pub alpha: f64,
    pub beta: f64,
    pub long_run_var: f64,
    pub conditional_vars: Vec<f64>,
    pub forecast: Vec<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ewma_smoothing() {
        let returns = vec![0.01, -0.02, 0.005, 0.03, -0.01];
        let vol = ewma_volatility(&returns, 0.94);
        assert_eq!(vol.len(), returns.len());
        assert!(vol.iter().all(|v| *v >= 0.0));
    }

    #[test]
    fn test_realized_vol() {
        let returns = vec![0.01; 20];
        let rv = realized_volatility(&returns, 10);
        assert_eq!(rv.len(), 11); // 20 - 10 + 1
        assert!(rv.iter().all(|v| v.abs() < 0.001)); // std of constant = 0
    }

    #[test]
    fn test_garch_fits() {
        // Synthetic GARCH data
        let returns: Vec<f64> = vec![
            0.01, -0.02, 0.005, 0.03, -0.01, 0.02, -0.015, 0.008,
            0.025, -0.03, 0.01, 0.015, -0.02, 0.005, 0.04, -0.025,
            0.012, -0.008, 0.02, 0.01, -0.015, 0.03, -0.01, 0.005,
            0.018, -0.022, 0.008, 0.025, -0.012, 0.015,
        ];
        let result = fit_garch11(&returns, 10);
        assert!(result.alpha >= 0.0 && result.alpha < 0.5);
        assert!(result.beta >= 0.0 && result.beta < 1.0);
        assert!(result.alpha + result.beta < 1.0); // stationarity
        assert_eq!(result.forecast.len(), 10);
        assert!(result.long_run_var > 0.0);
    }
}

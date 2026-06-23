use std::f64::consts::{FRAC_1_SQRT_2, SQRT_2};

/// Abramowitz-Stegun error function approximation (max error 1.5e-7).
fn erf(x: f64) -> f64 {
    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let x = x.abs();
    let a1 = 0.254829592;
    let a2 = -0.284496736;
    let a3 = 1.421413741;
    let a4 = -1.453152027;
    let a5 = 1.061405429;
    let p = 0.3275911;
    let t = 1.0 / (1.0 + p * x);
    let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * (-x * x).exp();
    sign * y
}

/// Standard normal CDF via erf.
fn ncdf(x: f64) -> f64 {
    0.5 * (1.0 + erf(x / SQRT_2))
}

/// Standard normal PDF.
fn npdf(x: f64) -> f64 {
    FRAC_1_SQRT_2 * (-0.5 * x * x).exp()
}

/// Black-Scholes call option price.
pub fn bs_call_price(s: f64, k: f64, t: f64, r: f64, sigma: f64) -> f64 {
    if t <= 0.0 || sigma <= 0.0 {
        return (s - k).max(0.0);
    }
    let sqrt_t = t.sqrt();
    let d1 = ((s / k).ln() + (r + 0.5 * sigma * sigma) * t) / (sigma * sqrt_t);
    let d2 = d1 - sigma * sqrt_t;
    s * ncdf(d1) - k * (-r * t).exp() * ncdf(d2)
}

/// Black-Scholes put option price.
pub fn bs_put_price(s: f64, k: f64, t: f64, r: f64, sigma: f64) -> f64 {
    if t <= 0.0 || sigma <= 0.0 {
        return (k - s).max(0.0);
    }
    let sqrt_t = t.sqrt();
    let d1 = ((s / k).ln() + (r + 0.5 * sigma * sigma) * t) / (sigma * sqrt_t);
    let d2 = d1 - sigma * sqrt_t;
    k * (-r * t).exp() * ncdf(-d2) - s * ncdf(-d1)
}

/// All five Greeks for a call option.
/// Returns (delta, gamma, theta, vega, rho).
pub fn call_greeks(s: f64, k: f64, t: f64, r: f64, sigma: f64) -> (f64, f64, f64, f64, f64) {
    if t <= 0.0 || sigma <= 0.0 {
        return (1.0, 0.0, 0.0, 0.0, 0.0);
    }
    let sqrt_t = t.sqrt();
    let d1 = ((s / k).ln() + (r + 0.5 * sigma * sigma) * t) / (sigma * sqrt_t);
    let d2 = d1 - sigma * sqrt_t;
    let nd1 = npdf(d1);
    let disc = (-r * t).exp();

    let delta = ncdf(d1);
    let gamma = nd1 / (s * sigma * sqrt_t);
    let theta = (-(s * nd1 * sigma) / (2.0 * sqrt_t) - r * k * disc * ncdf(d2)) / 365.0; // per day
    let vega = s * nd1 * sqrt_t / 100.0; // per 1% IV change
    let rho = k * t * disc * ncdf(d2) / 100.0; // per 1% rate change

    (delta, gamma, theta, vega, rho)
}

/// All five Greeks for a put option.
pub fn put_greeks(s: f64, k: f64, t: f64, r: f64, sigma: f64) -> (f64, f64, f64, f64, f64) {
    if t <= 0.0 || sigma <= 0.0 {
        return (-1.0, 0.0, 0.0, 0.0, 0.0);
    }
    let sqrt_t = t.sqrt();
    let d1 = ((s / k).ln() + (r + 0.5 * sigma * sigma) * t) / (sigma * sqrt_t);
    let d2 = d1 - sigma * sqrt_t;
    let nd1 = npdf(d1);
    let disc = (-r * t).exp();

    let delta = ncdf(d1) - 1.0;
    let gamma = nd1 / (s * sigma * sqrt_t);
    let theta = (-(s * nd1 * sigma) / (2.0 * sqrt_t) + r * k * disc * ncdf(-d2)) / 365.0;
    let vega = s * nd1 * sqrt_t / 100.0;
    let rho = -k * t * disc * ncdf(-d2) / 100.0;

    (delta, gamma, theta, vega, rho)
}

/// Implied volatility via bisection method (robust, ~50 iterations).
pub fn implied_vol(market_price: f64, s: f64, k: f64, t: f64, r: f64, is_call: bool) -> f64 {
    let mut lo = 0.001;
    let mut hi = 5.0;
    let price_fn = |sig: f64| {
        if is_call {
            bs_call_price(s, k, t, r, sig)
        } else {
            bs_put_price(s, k, t, r, sig)
        }
    };
    for _ in 0..60 {
        let mid = (lo + hi) * 0.5;
        let p = price_fn(mid);
        if (p - market_price).abs() < 0.001 {
            return mid;
        }
        if p < market_price {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    (lo + hi) * 0.5
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bs_atm_call() {
        // S=100, K=100, T=1, r=0.05, sigma=0.2
        // Theoretical: 10.4506
        let p = bs_call_price(100.0, 100.0, 1.0, 0.05, 0.2);
        assert!((p - 10.4506).abs() < 0.02, "got {}", p);
    }

    #[test]
    fn test_bs_put_call_parity() {
        // Call - Put = S - K*exp(-rT)
        let s = 100.0;
        let k = 95.0;
        let t = 0.5;
        let r = 0.04;
        let sig = 0.3;
        let c = bs_call_price(s, k, t, r, sig);
        let p = bs_put_price(s, k, t, r, sig);
        let parity = s - k * (-r * t).exp();
        assert!((c - p - parity).abs() < 0.01, "parity broken: c-p={} vs {}", c - p, parity);
    }

    #[test]
    fn test_delta_bounds() {
        let (delta, _, _, _, _) = call_greeks(100.0, 100.0, 1.0, 0.05, 0.2);
        assert!(delta > 0.0 && delta < 1.0, "call delta out of range: {}", delta);
        let (delta_p, _, _, _, _) = put_greeks(100.0, 100.0, 1.0, 0.05, 0.2);
        assert!(delta_p > -1.0 && delta_p < 0.0, "put delta out of range: {}", delta_p);
    }

    #[test]
    fn test_implied_vol_recovery() {
        // Generate a price at known IV, then recover it
        let true_iv = 0.35;
        let price = bs_call_price(100.0, 105.0, 0.5, 0.03, true_iv);
        let recovered = implied_vol(price, 100.0, 105.0, 0.5, 0.03, true);
        assert!((recovered - true_iv).abs() < 0.001, "recovered {} vs {}", recovered, true_iv);
    }
}

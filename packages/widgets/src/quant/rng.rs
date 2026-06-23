use std::cell::Cell;

thread_local! {
    static STATE: Cell<(u64, u64)> = Cell::new((0x9E3779B97F4A7C15, 0xBF58476D1CE4E5B9));
}

/// Seed the PRNG.
pub fn seed(s0: u64, s1: u64) {
    STATE.with(|c| c.set((s0, s1)));
}

/// xorshift128+ PRNG (Vigna 2014). Returns a u64.
pub fn next_u64() -> u64 {
    STATE.with(|c| {
        let (mut s0, s1) = c.get();
        let result = s0.wrapping_add(s1);

        s0 ^= s0 << 23;
        s0 ^= s0 >> 17;
        s0 ^= s1;
        s0 ^= s1 >> 26;

        c.set((s1, s0));
        result
    })
}

/// Uniform random in [0, 1).
pub fn uniform() -> f64 {
    (next_u64() >> 11) as f64 * (1.0 / 9007199254740992.0)
}

/// Standard normal via Box-Muller transform.
pub fn standard_normal_pair() -> (f64, f64) {
    let u1 = uniform().max(1e-300);
    let u2 = uniform();
    let r = (-2.0 * u1.ln()).sqrt();
    let theta = 2.0 * std::f64::consts::PI * u2;
    (r * theta.cos(), r * theta.sin())
}

/// Single standard normal draw.
pub fn standard_normal() -> f64 {
    standard_normal_pair().0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uniform_range() {
        for _ in 0..10000 {
            let u = uniform();
            assert!(u >= 0.0 && u < 1.0, "uniform out of range: {}", u);
        }
    }

    #[test]
    fn test_normal_mean_variance() {
        let n = 200_000;
        let mut sum = 0.0;
        let mut sum_sq = 0.0;
        for _ in 0..n {
            let z = standard_normal();
            sum += z;
            sum_sq += z * z;
        }
        let mean = sum / n as f64;
        let var = sum_sq / n as f64 - mean * mean;
        assert!((mean.abs()) < 0.01, "mean too far from 0: {}", mean);
        assert!((var - 1.0).abs() < 0.02, "variance too far from 1: {}", var);
    }

    #[test]
    fn test_deterministic_seed() {
        seed(42, 12345);
        let a1 = next_u64();
        let a2 = next_u64();
        seed(42, 12345);
        let b1 = next_u64();
        let b2 = next_u64();
        assert_eq!(a1, b1);
        assert_eq!(a2, b2);
    }
}

//! Parity-correctness tests (HFT/MFT/Graphics cluster).
//!
//! Three properties the published numbers must have:
//! 1. **Determinism** — same inputs, same bytes (HFT: "same inputs, same
//!    fills"; replay systems depend on it).
//! 2. **Lookahead-bias resistance** — the backtester's fit at window t
//!    never sees t+1 data (MFT lineage discipline).
//! 3. **Finite-output policy** — valid real-world-shaped input produces
//!    finite numbers; NaN/Infinity never render as charts (Graphics
//!    sanitizer discipline).

use hydrated_widgets::{quant_correlation_matrix, quant_montecarlo, quant_seed};

fn ramp(n: usize) -> Vec<f64> {
    // Deterministic pseudo-market: a drifting sine over a ramp, no rng.
    (0..n)
        .map(|i| 100.0 + i as f64 * 0.01 + ((i as f64) * 0.7).sin() * 2.0)
        .collect()
}

/// B1/A: determinism — same seed + same inputs produce byte-identical
/// montecarlo output. plycompute's rng is xorshift128+ seeded via
/// quant_seed; any iteration-order or clock leakage breaks this test.
#[test]
fn montecarlo_is_deterministic() {
    let closes = ramp(260);

    quant_seed(1.0e10, 2.0e10);
    let a = quant_montecarlo(&closes, 252, 60, 5_000);

    quant_seed(1.0e10, 2.0e10);
    let b = quant_montecarlo(&closes, 252, 60, 5_000);

    assert_eq!(a, b, "montecarlo output must be deterministic for a fixed seed");
}

/// B1/A: NaN/Infinity policy — the correlation matrix over a valid
/// multi-asset panel must be entirely finite. Correlation is the exact
/// function the storm report uses against NOAA data; a NaN here would
/// silently render as a missing cell.
#[test]
fn correlation_matrix_is_finite() {
    // 4 assets x 120 periods of well-behaved pseudo-returns
    let n_assets = 4;
    let n_periods = 120;
    let mut returns = Vec::with_capacity(n_assets * n_periods);
    for a in 0..n_assets {
        for t in 0..n_periods {
            let base = (t as f64 * 0.1).sin() * 0.01;
            let asset = a as f64 * 0.002;
            returns.push(base + asset + ((t * 7 + a * 13) % 5) as f64 * 0.001 - 0.002);
        }
    }

    let out = quant_correlation_matrix(&returns, n_assets, n_periods);
    let v: serde_json::Value = serde_json::from_str(&out).expect("correlation output must be valid JSON");
    let s = serde_json::to_string(&v).unwrap();
    assert!(!s.contains("NaN"), "correlation matrix contains NaN: {s}");
    assert!(!s.contains("Infinity"), "correlation matrix contains Infinity: {s}");
}

/// B1/A: NaN policy under degenerate input — a constant series has zero
/// variance; the policy is finite output (zeros/neutral), never NaN.
#[test]
fn degenerate_input_is_finite() {
    let n_assets = 2;
    let n_periods = 60;
    let constant = vec![0.005f64; n_assets * n_periods]; // zero-variance returns
    let out = quant_correlation_matrix(&constant, n_assets, n_periods);
    let s = out;
    assert!(
        !s.contains("NaN") && !s.contains("Infinity"),
        "degenerate input produced non-finite output: {s}"
    );
}

/// B1/A: quant_var on a valid series must be finite for standard alphas.
#[test]
fn var_is_finite() {
    let closes = ramp(120);
    let mut returns: Vec<f64> = closes.windows(2).map(|w| (w[1] / w[0]) - 1.0).collect();
    // quant_var wants returns scaled like percentages in the widget path;
    // feed as-is: the policy being tested is finiteness, not magnitude.
    returns.iter_mut().for_each(|r| *r *= 100.0);
    let out = hydrated_widgets::quant_var(&returns, 0.05);
    assert!(
        !out.contains("NaN") && !out.contains("Infinity"),
        "VaR produced non-finite output: {out}"
    );
}

/// B1/A: lookahead-bias guard (MFT lineage discipline, HFT variant).
///
/// On a seeded no-signal random walk, an SMA/momentum fit with future
/// leakage would show implausible out-of-sample performance. This fixed
/// series is a regression baseline: any algorithm change that leaks
/// future windows into the fit inflates the OOS Sharpe past the bound.
#[test]
fn walk_forward_has_no_lookahead_on_seeded_noise() {
    use plycompute::backtest::{walk_forward, Strategy};

    // Seeded LCG random walk (deterministic input series).
    let mut s: u64 = 42;
    let mut closes = Vec::with_capacity(300);
    let mut price = 100.0f64;
    for _ in 0..300 {
        s = s
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        let u = (s >> 33) as f64 / u64::MAX as f64;
        price *= 1.0 + (u - 0.5) * 0.02;
        closes.push(price);
    }

    let result = walk_forward(
        &closes,
        Strategy::Momentum,
        &[5, 10, 20, 50],
        &[],
        60,  // in-sample fit length
        20,  // out-of-sample trade length
        0.0, // slippage
        0.0, // commission
    );
    let bt = result.expect("walk_forward must succeed on a 300-bar series");

    // No signal exists in seeded noise: a leak-free fit cannot compound
    // an implausible OOS Sharpe. Leakage would show Sharpe 5-20+ here.
    assert!(
        bt.sharpe.abs() < 3.5,
        "OOS Sharpe {} on seeded noise implies lookahead bias",
        bt.sharpe
    );
    // Sanity: equity curve is well-formed (positive, finite, right length).
    assert_eq!(bt.equity.len(), closes.len());
    assert!(bt.equity.iter().all(|e| e.is_finite() && *e > 0.0));
}

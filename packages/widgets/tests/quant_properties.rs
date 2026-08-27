use proptest::prelude::*;

proptest! {
    #[test]
    fn greeks_return_valid_json(
        s in 1.0..1000.0f64,
        k in 1.0..1000.0f64,
        t in 0.01..2.0f64,
        r in 0.0..0.2f64,
        sigma in 0.01..2.0f64
    ) {
        let call = hydrated_widgets::quant_greeks(s, s, 1, k, t, r, sigma, true);
        let put = hydrated_widgets::quant_greeks(s, s, 1, k, t, r, sigma, false);
        let call_json: serde_json::Value = serde_json::from_str(&call).unwrap();
        let put_json: serde_json::Value = serde_json::from_str(&put).unwrap();
        prop_assert!(call_json.get("delta").is_some());
        prop_assert!(put_json.get("delta").is_some());
    }

    #[test]
    fn montecarlo_returns_valid_json(
        closes in prop::collection::vec(1.0..10000.0f64, 30..500)
    ) {
        let result = hydrated_widgets::quant_montecarlo(&closes, 252, 30, 100);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        prop_assert!(parsed.get("p50").is_some());
        prop_assert!(parsed.get("volatility").is_some());
    }

    #[test]
    fn var_historical_is_negative(
        returns in prop::collection::vec(-0.1..0.1f64, 100..10000)
    ) {
        let result = hydrated_widgets::quant_var(&returns, 0.05);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        let var_val = parsed["var_historical"].as_f64().unwrap();
        prop_assert!(var_val <= 0.0, "VaR should be negative: {}", var_val);
    }

    #[test]
    fn correlation_matrix_diagonal_is_one(
        n_assets in 2usize..10,
        n_periods in 30usize..200
    ) {
        let flat: Vec<f64> = (0..n_assets * n_periods)
            .map(|i| ((i as f64 * 0.1).sin() + 1.0) * 100.0)
            .collect();
        let result = hydrated_widgets::quant_correlation_matrix(&flat, n_assets, n_periods);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        if let Some(matrix) = parsed["matrix"].as_array() {
            for (i, row) in matrix.iter().enumerate() {
                if let Some(arr) = row.as_array() {
                    if i < arr.len() {
                        let diag = arr[i].as_f64().unwrap();
                        prop_assert!((diag - 1.0).abs() < 0.01, "Diagonal should be ~1: {}", diag);
                    }
                }
            }
        }
    }
}

#![no_main]
use libfuzzer_sys::fuzz_target;
use hydrated_widgets::quant::risk;
use hydrated_widgets::quant::montecarlo;

fuzz_target!(|data: &[u8]| {
    let returns: Vec<f64> = data
        .chunks(8)
        .filter_map(|chunk| {
            if chunk.len() == 8 {
                let bytes: [u8; 8] = chunk.try_into().ok()?;
                let val = f64::from_le_bytes(bytes);
                if val.is_finite() {
                    Some(val)
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();

    if returns.len() < 5 {
        return;
    }

    let _var_hist = risk::var_historical(&returns, 0.05);
    let _es_hist = risk::expected_shortfall(&returns, 0.05);
    let _ = risk::var_parametric(montecarlo::mean(&returns), montecarlo::std_dev(&returns), 0.05);
    let _ = risk::es_parametric(montecarlo::mean(&returns), montecarlo::std_dev(&returns), 0.05);
    let _ = risk::histogram(&returns, 50);
});

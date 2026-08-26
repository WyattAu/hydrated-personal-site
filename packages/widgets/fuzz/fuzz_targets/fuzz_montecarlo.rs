#![no_main]
use libfuzzer_sys::fuzz_target;
use hydrated_widgets::quant::montecarlo;

fuzz_target!(|data: &[u8]| {
    let prices: Vec<f64> = data
        .chunks(8)
        .filter_map(|chunk| {
            if chunk.len() == 8 {
                let bytes: [u8; 8] = chunk.try_into().ok()?;
                let val = f64::from_le_bytes(bytes);
                if val.is_finite() && val > 0.0 {
                    Some(val)
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();

    if prices.len() >= 10 {
        let _ = montecarlo::montecarlo_from_prices(&prices, 252, 30, 100);
    }
});

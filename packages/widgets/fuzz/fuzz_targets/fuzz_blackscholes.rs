#![no_main]
use libfuzzer_sys::fuzz_target;
use hydrated_widgets::quant::blackscholes;

fuzz_target!(|data: &[u8]| {
    if data.len() < 40 {
        return;
    }
    let vals: Vec<f64> = data
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

    if vals.len() < 5 {
        return;
    }
    let s = vals[0].abs();
    let k = vals[1].abs();
    let t = vals[2].abs() % 5.0;
    let r = vals[3].abs() % 0.2;
    let sigma = vals[4].abs() % 5.0;

    if s <= 0.0 || k <= 0.0 || t <= 0.0 || sigma <= 0.0 {
        return;
    }

    let _call = blackscholes::bs_call_price(s, k, t, r, sigma);
    let _put = blackscholes::bs_put_price(s, k, t, r, sigma);
    let _ = blackscholes::call_greeks(s, k, t, r, sigma);
    let _ = blackscholes::put_greeks(s, k, t, r, sigma);

    let price = blackscholes::bs_call_price(s, k, t, r, sigma);
    if price > 0.0 {
        let _iv = blackscholes::implied_vol(price, s, k, t, r, true);
    }
});

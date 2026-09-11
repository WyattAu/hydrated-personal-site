use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const PI: f64 = std::f64::consts::PI;
const TAU: f64 = 2.0 * PI;

/// wave_type: 0=sine, 1=square, 2=triangle, 3=sawtooth, 4=pulse
#[wasm_bindgen]
pub fn create_fourier_viz(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
    update_fourier_viz_full(canvas_id, width, height, 0.0, 5, 0)
}

#[wasm_bindgen]
pub fn update_fourier_viz(
    canvas_id: &str,
    width: u32,
    height: u32,
    time: f64,
) -> Result<(), JsValue> {
    update_fourier_viz_full(canvas_id, width, height, time, 5, 0)
}

#[wasm_bindgen]
pub fn update_fourier_viz_full(
    canvas_id: &str,
    width: u32,
    height: u32,
    time: f64,
    harmonics: u32,
    wave_type: u32,
) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(width);
    canvas.set_height(height);
    let ctx = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    let h = harmonics.max(1).min(50);
    let sample_count = 512usize;

    draw_fourier_viz(&ctx, width, height, h, sample_count, time, wave_type)?;

    Ok(())
}

/// Time-domain panel: ideal waveform (dashed gray) vs partial sum S_N (cyan).
/// `width`/`height` are device pixels (caller passes DPR-scaled dimensions and
/// sizes the canvas element with CSS); text/line widths scale with the device
/// pixel ratio read from the window so output stays crisp on HiDPI screens.
#[wasm_bindgen]
pub fn update_fourier_time(
    canvas_id: &str,
    width: u32,
    height: u32,
    time: f64,
    harmonics: u32,
    wave_type: u32,
) -> Result<(), JsValue> {
    let (ctx, w, h) = canvas_ctx(canvas_id, width, height)?;
    let s = device_scale();
    let n = harmonics.max(1).min(50);

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    let pad_l = 46.0 * s;
    let pad_r = 14.0 * s;
    let pad_t = 30.0 * s;
    let pad_b = 26.0 * s;
    let pw = (w - pad_l - pad_r).max(10.0);
    let ph = (h - pad_t - pad_b).max(10.0);
    // Fixed vertical range keeps the animation stable as N changes.
    let ymax = 1.4f64;
    let x_of = |frac: f64| pad_l + frac * pw;
    let y_of = |v: f64| pad_t + ph * 0.5 - (v / ymax) * (ph * 0.5);

    // Grid + axes.
    ctx.set_line_width(1.0);
    let hlines = [-1.0, -0.5, 0.0, 0.5, 1.0];
    for &gy in &hlines {
        let py = y_of(gy);
        ctx.set_stroke_style(&if gy == 0.0 { "#3a3d45" } else { "#22242c" }.into());
        ctx.begin_path();
        ctx.move_to(pad_l, py);
        ctx.line_to(pad_l + pw, py);
        ctx.stroke();
        ctx.set_fill_style(&"#6b7280".into());
        ctx.set_font(&format!("{}px monospace", (10.0 * s) as u32));
        ctx.fill_text(&format!("{gy:.1}"), 6.0 * s, py + 3.5 * s)?;
    }
    let tlabels = ["0", "pi/2", "pi", "3pi/2", "2pi"];
    for (i, label) in tlabels.iter().enumerate() {
        let frac = i as f64 / 4.0;
        let px = x_of(frac);
        ctx.set_stroke_style(&"#22242c".into());
        ctx.begin_path();
        ctx.move_to(px, pad_t);
        ctx.line_to(px, pad_t + ph);
        ctx.stroke();
        ctx.set_fill_style(&"#6b7280".into());
        ctx.set_font(&format!("{}px monospace", (10.0 * s) as u32));
        ctx.fill_text(label, px - 8.0 * s, pad_t + ph + 15.0 * s)?;
    }

    // Ideal waveform, dashed gray.
    let samples = 512usize;
    ctx.set_stroke_style(&"#8a8f98".into());
    ctx.set_line_width(1.2 * s);
    let dash: Vec<f64> = vec![6.0 * s, 4.0 * s];
    ctx.set_line_dash(&dash_value(&dash))?;
    ctx.begin_path();
    for i in 0..=samples {
        let frac = i as f64 / samples as f64;
        let v = ideal_wave(frac * TAU + time, wave_type);
        let (px, py) = (x_of(frac), y_of(v.clamp(-ymax, ymax)));
        if i == 0 {
            ctx.move_to(px, py);
        } else {
            ctx.line_to(px, py);
        }
    }
    ctx.stroke();
    ctx.set_line_dash(&dash_value(&[]))?;

    // Partial sum S_N, solid cyan.
    ctx.set_stroke_style(&"#00e5ff".into());
    ctx.set_line_width(2.0 * s);
    ctx.begin_path();
    for i in 0..=samples {
        let frac = i as f64 / samples as f64;
        let v = partial_sum_at(frac * TAU, time, n, wave_type);
        let (px, py) = (x_of(frac), y_of(v.clamp(-ymax, ymax)));
        if i == 0 {
            ctx.move_to(px, py);
        } else {
            ctx.line_to(px, py);
        }
    }
    ctx.stroke();

    // Title + axis tags.
    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font(&format!("{}px monospace", (12.0 * s) as u32));
    ctx.fill_text(
        &format!("Time domain - S_N(t), N={} - {}", n, wave_name(wave_type)),
        10.0 * s,
        18.0 * s,
    )?;
    ctx.set_fill_style(&"#6b7280".into());
    ctx.set_font(&format!("{}px monospace", (10.0 * s) as u32));
    ctx.fill_text("t", pad_l + pw - 6.0 * s, pad_t + ph + 15.0 * s)?;
    ctx.fill_text("x", 8.0 * s, pad_t - 6.0 * s)?;

    // Gibbs annotation for discontinuous targets.
    if wave_type == 1 || wave_type == 3 {
        ctx.set_fill_style(&"#ffb454".into());
        ctx.set_font(&format!("{}px monospace", (10.0 * s) as u32));
        ctx.fill_text(
            "Gibbs overshoot ~8.9% near jumps",
            pad_l + 8.0 * s,
            pad_t + ph - 8.0 * s,
        )?;
    }

    Ok(())
}

/// Frequency-domain panel: continuous analytic magnitude envelope A(f) sampled
/// finely (amber curve) plus discrete stem markers + dots at integer n.
#[wasm_bindgen]
pub fn update_fourier_freq(
    canvas_id: &str,
    width: u32,
    height: u32,
    harmonics: u32,
    wave_type: u32,
) -> Result<(), JsValue> {
    let (ctx, w, h) = canvas_ctx(canvas_id, width, height)?;
    let s = device_scale();
    let n = harmonics.max(1).min(50);
    let hmax = n as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    let pad_l = 46.0 * s;
    let pad_r = 14.0 * s;
    let pad_t = 30.0 * s;
    let pad_b = 26.0 * s;
    let pw = (w - pad_l - pad_r).max(10.0);
    let ph = (h - pad_t - pad_b).max(10.0);
    let fmin = 0.5f64;
    let fmax = hmax + 1.0;
    let x_of = |f: f64| pad_l + (f - fmin) / (fmax - fmin) * pw;

    // Vertical range from the envelope peak (with headroom).
    let mut peak = 0.0f64;
    for i in 0..=256 {
        let f = fmin + (i as f64 / 256.0) * (fmax - fmin);
        peak = peak.max(envelope_amplitude(f, wave_type));
    }
    for k in 1..=n {
        peak = peak.max(harmonic_amplitude(k as f64, wave_type).abs());
    }
    let ymax = (peak * 1.15).max(0.05);
    let base = pad_t + ph;
    let y_of = |v: f64| base - (v / ymax) * ph;

    // Horizontal gridlines.
    ctx.set_line_width(1.0);
    ctx.set_font(&format!("{}px monospace", (10.0 * s) as u32));
    for gi in 0..=3 {
        let v = ymax * gi as f64 / 3.0;
        let py = y_of(v);
        ctx.set_stroke_style(&"#22242c".into());
        ctx.begin_path();
        ctx.move_to(pad_l, py);
        ctx.line_to(pad_l + pw, py);
        ctx.stroke();
        ctx.set_fill_style(&"#6b7280".into());
        ctx.fill_text(&format!("{v:.2}"), 4.0 * s, py + 3.5 * s)?;
    }

    // Vertical gridlines + integer tick labels.
    let step = ((hmax / 12.0).ceil() as u32).max(1);
    for k in (1..=n).step_by(step as usize) {
        let px = x_of(k as f64);
        ctx.set_stroke_style(&"#1b1d23".into());
        ctx.begin_path();
        ctx.move_to(px, pad_t);
        ctx.line_to(px, base);
        ctx.stroke();
        ctx.set_fill_style(&"#6b7280".into());
        ctx.fill_text(&k.to_string(), px - 4.0 * s, base + 15.0 * s)?;
    }

    // Continuous analytic envelope, amber.
    ctx.set_stroke_style(&"#f5a623".into());
    ctx.set_line_width(2.0 * s);
    ctx.begin_path();
    for i in 0..=256 {
        let f = fmin + (i as f64 / 256.0) * (fmax - fmin);
        let v = envelope_amplitude(f, wave_type);
        let (px, py) = (x_of(f), y_of(v));
        if i == 0 {
            ctx.move_to(px, py);
        } else {
            ctx.line_to(px, py);
        }
    }
    ctx.stroke();

    // Discrete stems + dots at integer harmonics.
    for k in 1..=n {
        let amp = harmonic_amplitude(k as f64, wave_type).abs();
        let px = x_of(k as f64);
        let py = y_of(amp);
        ctx.set_stroke_style(&"#00e5ff".into());
        ctx.set_line_width((1.5 * s).max(1.0));
        ctx.begin_path();
        ctx.move_to(px, base);
        ctx.line_to(px, py);
        ctx.stroke();
        ctx.set_fill_style(&"#ffd166".into());
        ctx.begin_path();
        ctx.arc(px, py, 3.0 * s, 0.0, TAU)?;
        ctx.fill();
    }

    // Title + axis labels.
    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font(&format!("{}px monospace", (12.0 * s) as u32));
    ctx.fill_text(
        &format!("Frequency domain - |c_n| vs n - {}", wave_name(wave_type)),
        10.0 * s,
        18.0 * s,
    )?;
    ctx.set_fill_style(&"#6b7280".into());
    ctx.set_font(&format!("{}px monospace", (10.0 * s) as u32));
    ctx.fill_text("|c_n|", 8.0 * s, pad_t - 6.0 * s)?;
    ctx.fill_text("n", pad_l + pw - 6.0 * s, base + 15.0 * s)?;

    Ok(())
}

/// JSON stats for the coefficient readout: RMS (L2) error of the partial sum
/// vs the ideal wave over 512 samples, the first min(harmonics, 12)
/// (n, amp, phase) triples, and the closed-form series string.
///
/// Both the ideal wave and the partial sum are evaluated at the same shifted
/// argument (t + time) so the animation phase does not inflate the error;
/// for sine with N >= 1 the error is therefore ~0.
#[wasm_bindgen]
pub fn fourier_stats(time: f64, harmonics: u32, wave_type: u32) -> String {
    let n = harmonics.max(1).min(50);
    let samples = 512usize;
    let mut se = 0.0f64;
    for i in 0..samples {
        let t = i as f64 / samples as f64 * TAU;
        let approx = partial_sum_at(t, time, n, wave_type);
        let exact = ideal_wave(t + time, wave_type);
        se += (approx - exact) * (approx - exact);
    }
    let l2_error = (se / samples as f64).sqrt();

    let k = n.min(12);
    let mut coeffs = Vec::with_capacity(k as usize);
    for j in 1..=k {
        coeffs.push(serde_json::json!({
            "n": j,
            "amp": harmonic_amplitude(j as f64, wave_type),
            "phase": harmonic_phase(j as f64, wave_type),
        }));
    }

    serde_json::json!({
        "l2_error": l2_error,
        "coeffs": coeffs,
        "formula": wave_formula(wave_type),
    })
    .to_string()
}

fn ideal_wave(t: f64, wave_type: u32) -> f64 {
    match wave_type {
        0 => t.sin(),
        1 => {
            let v = t.sin();
            if v >= 0.0 { 1.0 } else { -1.0 }
        }
        2 => 2.0 / PI * t.sin().asin(),
        3 => 2.0 * (t / TAU - (t / TAU + 0.5).floor()),
        4 => {
            if t.sin() > 0.6 {
                1.0
            } else {
                -1.0
            }
        }
        _ => t.sin(),
    }
}

fn partial_sum_at(t: f64, time: f64, harmonics: u32, wave_type: u32) -> f64 {
    let mut val = 0.0;
    for harmonic in 1..=harmonics {
        let freq = harmonic as f64;
        val += harmonic_amplitude(freq, wave_type) * (freq * t + harmonic_phase(freq, wave_type) + time).sin();
    }
    val
}

/// Continuous generalization of `harmonic_amplitude` to real f.
/// Odd-only waves (square, triangle) carry an odd-pass mask,
/// cos^2(pi*(f-1)/2) = sin^2(pi*f/2), which is 1 at odd integers
/// and 0 at even integers.
fn envelope_amplitude(f: f64, wave_type: u32) -> f64 {
    let f = f.max(1e-6);
    let odd_mask = (PI * (f - 1.0) / 2.0).cos().powi(2);
    match wave_type {
        // Pure sine: all energy at n=1. Drawn as a narrow bump so the
        // continuous curve reads as a delta spike sitting on the zero line.
        0 => ((f - 1.0) * (f - 1.0) / 0.01).exp(),
        1 => 4.0 * odd_mask / (PI * f),
        2 => 8.0 * odd_mask / (PI * PI * f * f),
        3 => 2.0 / (PI * f),
        4 => 1.0 / f.sqrt(),
        _ => 1.0 / f,
    }
}

fn harmonic_amplitude(harmonic: f64, wave_type: u32) -> f64 {
    match wave_type {
        0 => {
            // Pure sine: single line at n=1, all other coefficients zero.
            if harmonic == 1.0 {
                1.0
            } else {
                0.0
            }
        }
        1 => {
            // Square wave: (4/pi) * (1/h) for odd h, 0 for even h.
            if (harmonic as u64) % 2 == 1 {
                4.0 / (PI * harmonic)
            } else {
                0.0
            }
        }
        2 => {
            // Triangle wave: (8/pi^2) * sign/h^2 for odd h, alternating sign.
            if (harmonic as u64) % 2 == 1 {
                let sign = if ((harmonic as u64 - 1) / 2) % 2 == 0 { 1.0 } else { -1.0 };
                8.0 * sign / (PI * PI * harmonic * harmonic)
            } else {
                0.0
            }
        }
        3 => {
            // Sawtooth wave: (2/pi) * sign/h for all h, alternating sign.
            let sign = if (harmonic as u64) % 2 == 1 { 1.0 } else { -1.0 };
            2.0 * sign / (PI * harmonic)
        }
        4 => {
            // Pulse wave: amplitude 1/sqrt(h) for wider spectrum
            1.0 / harmonic.sqrt()
        }
        _ => 1.0 / harmonic,
    }
}

fn harmonic_phase(harmonic: f64, wave_type: u32) -> f64 {
    match wave_type {
        2 => {
            // Triangle: 90-degree phase shift on alternating harmonics
            if (harmonic as u64) % 2 == 1 {
                let n = (harmonic as u64 - 1) / 2;
                if n % 2 == 1 { PI / 2.0 } else { 0.0 }
            } else {
                0.0
            }
        }
        _ => 0.0,
    }
}

fn wave_name(wave_type: u32) -> &'static str {
    match wave_type {
        0 => "Sine",
        1 => "Square",
        2 => "Triangle",
        3 => "Sawtooth",
        4 => "Pulse",
        _ => "Sine",
    }
}

fn wave_formula(wave_type: u32) -> &'static str {
    match wave_type {
        0 => "S_N(t) = sin(t)",
        1 => "S_N(t) = (4/pi) * sum_{k odd <= N} sin(k*t)/k",
        2 => "S_N(t) = (8/pi^2) * sum_{k odd <= N} (-1)^((k-1)/2) * sin(k*t)/k^2",
        3 => "S_N(t) = (2/pi) * sum_{k=1}^{N} (-1)^(k+1) * sin(k*t)/k",
        4 => "S_N(t) = sum_{k=1}^{N} sin(k*t)/sqrt(k)  (broadband pulse approx.)",
        _ => "S_N(t) = sin(t)",
    }
}

fn device_scale() -> f64 {
    web_sys::window()
        .map(|w| w.device_pixel_ratio())
        .unwrap_or(1.0)
        .clamp(1.0, 3.0)
}

fn canvas_ctx(
    canvas_id: &str,
    width: u32,
    height: u32,
) -> Result<(CanvasRenderingContext2d, f64, f64), JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window"))?;
    let document = window.document().ok_or_else(|| JsValue::from_str("No document"))?;
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(width);
    canvas.set_height(height);
    let ctx = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;
    Ok((ctx, width as f64, height as f64))
}

fn dash_value(dash: &[f64]) -> JsValue {
    let arr = js_sys::Array::new();
    for &d in dash {
        arr.push(&JsValue::from_f64(d));
    }
    JsValue::from(arr)
}

fn draw_fourier_viz(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    harmonics: u32,
    sample_count: usize,
    time: f64,
    wave_type: u32,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;
    let half_h = h / 2.0;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    let mut signal = vec![0.0f64; sample_count];
    let mut spectrum = vec![0.0f64; harmonics as usize];

    for i in 0..sample_count {
        let t = (i as f64 / sample_count as f64) * TAU;
        let mut val = 0.0;
        for harmonic in 1..=harmonics {
            let freq = harmonic as f64;
            let amp = harmonic_amplitude(freq, wave_type);
            let phase = harmonic_phase(freq, wave_type);
            val += amp * (freq * t + phase + time).sin();
            if i == 0 {
                spectrum[(harmonic - 1) as usize] = amp.abs();
            }
        }
        signal[i] = val;
    }

    let max_val = signal.iter().fold(0.0f64, |a, b| a.max(b.abs()));
    let scale = if max_val > 0.0 { (half_h - 20.0) / max_val } else { 1.0 };

    // Draw time-domain waveform
    ctx.set_stroke_style(&"#00e5ff".into());
    ctx.set_line_width(1.5);
    ctx.begin_path();
    for (i, &val) in signal.iter().enumerate() {
        let x = (i as f64 / sample_count as f64) * w;
        let y = half_h - val * scale;
        if i == 0 {
            ctx.move_to(x, y);
        } else {
            ctx.line_to(x, y);
        }
    }
    ctx.stroke();

    // Draw frequency spectrum bars
    let spectrum_width = w * 0.4;
    let spectrum_x = w * 0.55;
    let spectrum_h = h * 0.35;
    let max_amp = spectrum.iter().fold(0.0f64, |a, &b| a.max(b));
    let bar_width = spectrum_width / harmonics as f64 * 0.7;
    let bar_gap = spectrum_width / harmonics as f64 * 0.3;

    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(spectrum_x - 10.0, 20.0, spectrum_width + 20.0, spectrum_h + 40.0);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Frequency Spectrum", spectrum_x, 35.0)?;

    for i in 0..harmonics as usize {
        let amp = spectrum[i];
        let bar_h = if max_amp > 0.0 { (amp / max_amp) * spectrum_h * 0.8 } else { 0.0 };
        let x = spectrum_x + i as f64 * (bar_width + bar_gap);
        let y = 50.0 + spectrum_h - bar_h;

        let r = (50 + (i * 40) % 200).min(255) as u8;
        let g = (229 - (i * 30) % 180).max(50) as u8;
        let b = 255u8;
        ctx.set_fill_style(&format!("rgb({}, {}, {})", r, g, b).into());
        ctx.fill_rect(x, y, bar_width, bar_h);
    }

    let wave_names = ["Sine", "Square", "Triangle", "Sawtooth", "Pulse"];
    let wave_name = wave_names.get(wave_type as usize).unwrap_or(&"Sine");

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Time Domain", 10.0, 20.0)?;
    ctx.fill_text(&format!("Wave: {} | Harmonics: {}", wave_name, harmonics), 10.0, h - 10.0)?;
    ctx.fill_text("Synthesized waveform", 10.0, h - 25.0)?;

    Ok(())
}

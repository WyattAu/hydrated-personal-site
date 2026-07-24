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

fn harmonic_amplitude(harmonic: f64, wave_type: u32) -> f64 {
    match wave_type {
        0 => {
            // Sine: amplitude decays as 1/h
            1.0 / harmonic
        }
        1 => {
            // Square wave: odd harmonics only, amplitude 1/h
            if (harmonic as u64) % 2 == 1 {
                1.0 / harmonic
            } else {
                0.0
            }
        }
        2 => {
            // Triangle wave: odd harmonics only, amplitude 1/h^2, alternating sign
            if (harmonic as u64) % 2 == 1 {
                let sign = if ((harmonic as u64 - 1) / 2) % 2 == 0 { 1.0 } else { -1.0 };
                sign / (harmonic * harmonic)
            } else {
                0.0
            }
        }
        3 => {
            // Sawtooth wave: all harmonics, amplitude 1/h, alternating sign
            let sign = if (harmonic as u64) % 2 == 1 { 1.0 } else { -1.0 };
            sign / harmonic
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

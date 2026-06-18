use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const PI: f64 = std::f64::consts::PI;
const TAU: f64 = 2.0 * PI;

#[wasm_bindgen]
pub fn create_fourier_viz(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    let harmonics = 5;
    let sample_count = 512;
    let time = 0.0;

    draw_fourier_viz(&ctx, width, height, harmonics, sample_count, time);

    Ok(())
}

fn draw_fourier_viz(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    harmonics: u32,
    sample_count: usize,
    time: f64,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;
    let half_h = h / 2.0;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_stroke_style(&"#00e5ff".into());
    ctx.set_line_width(1.5);

    let mut signal = vec![0.0; sample_count];
    for i in 0..sample_count {
        let t = (i as f64 / sample_count as f64) * TAU;
        for harmonic in 1..=harmonics {
            let freq = harmonic as f64;
            let amp = 1.0 / freq;
            signal[i] += amp * (freq * t + time).sin();
        }
    }

    let max_val = signal.iter().fold(0.0f64, |a, b| a.max(b.abs()));
    let scale = (half_h - 20.0) / max_val;

    ctx.set_stroke_style(&"#00e5ff".into());
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

    let spectrum_width = w * 0.4;
    let spectrum_x = w * 0.55;
    let spectrum_h = h * 0.35;
    let bar_width = spectrum_width / harmonics as f64 * 0.7;
    let bar_gap = spectrum_width / harmonics as f64 * 0.3;

    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(spectrum_x - 10.0, 20.0, spectrum_width + 20.0, spectrum_h + 40.0);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Frequency Spectrum", spectrum_x, 35.0)?;

    for i in 0..harmonics {
        let freq = (i + 1) as f64;
        let amp = 1.0 / freq;
        let bar_h = amp * spectrum_h * 0.8;
        let x = spectrum_x + i as f64 * (bar_width + bar_gap);
        let y = 50.0 + spectrum_h - bar_h;

        let r = (50 + (i * 40) as u8).min(255);
        let g = (229 - (i * 30) as u8).max(50);
        let b = 255;
        ctx.set_fill_style(&format!("rgb({}, {}, {})", r, g, b).into());
        ctx.fill_rect(x, y, bar_width, bar_h);

        ctx.set_fill_style(&"#aaaaaa".into());
        ctx.set_font("10px monospace");
        ctx.fill_text(&format!("{}Hz", freq as u32), x, 50.0 + spectrum_h + 15.0)?;
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Time Domain", 10.0, 20.0)?;
    ctx.fill_text(
        &format!("Harmonics: {}", harmonics),
        10.0,
        h - 10.0,
    )?;
    ctx.fill_text("Sum of sine waves", 10.0, h - 25.0)?;

    Ok(())
}

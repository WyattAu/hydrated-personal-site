use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Frequency spectrogram.

#[wasm_bindgen]
pub fn create_spectrogram(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    Ok(())
}

#[wasm_bindgen]
pub fn update_spectrogram(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;
    let cx = wf / 2.0;
    let cy = hf / 2.0;
    let t = js_sys::Date::now() as f64 / 1000.0;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    // Scrolling frequency bars
    let n_bars = 48;
    let bar_w = wf / n_bars as f64;
    for i in 0..n_bars {
        let freq = i as f64 / n_bars as f64;
        let amp = ((t * (1.0 + freq * 3.0) + i as f64 * 0.3).sin()
            * (t * freq * 5.0).cos()
            * (1.0 - freq * 0.5)).abs();
        let bar_h = amp * hf * 0.7;
        let hue = freq * 240.0 + 180.0;
        ctx.set_fill_style(&format!("hsl({}, 80%, {}%)", hue % 360.0, 30.0 + amp * 40.0).into());
        ctx.fill_rect(i as f64 * bar_w, hf - bar_h, bar_w - 1.0, bar_h);
        // Reflection
        ctx.set_fill_style(&format!("hsla({}, 80%, 60%, 0.2)", hue % 360.0).into());
        ctx.fill_rect(i as f64 * bar_w, hf - bar_h - bar_h * 0.3, bar_w - 1.0, bar_h * 0.3);
    }
    Ok(())
}

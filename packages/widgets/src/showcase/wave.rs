use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// 2D wave equation simulation.

#[wasm_bindgen]
pub fn create_wave(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_wave(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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
    // Concentric ripple rings
    let sources = [(cx, cy), (wf * 0.25, hf * 0.7), (wf * 0.75, hf * 0.3)];
    for i in 0..80u32 {
        let progress = ((t * 0.3 + i as f64 * 0.05) % 1.0);
        let radius = progress * wf * 0.45;
        let alpha = (1.0 - progress) * 0.5;
        let hue = 180.0 + i as f64 * 4.5;
        for &(sx, sy) in &sources {
            ctx.set_stroke_style(&format!("hsla({}, 80%, 60%, {})", hue % 360.0, alpha).into());
            ctx.set_line_width(1.5);
            ctx.begin_path();
            ctx.arc(sx, sy, radius, 0.0, std::f64::consts::TAU).ok();
            ctx.stroke();
        }
    }
    Ok(())
}

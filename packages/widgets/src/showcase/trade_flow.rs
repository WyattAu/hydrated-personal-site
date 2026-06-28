use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// trade_flow visualization widget.
/// Renders to canvas with create_trade_flow / update_trade_flow pattern.

#[wasm_bindgen]
pub fn create_trade_flow(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w);
    canvas.set_height(h);
    let ctx = canvas.get_context("2d")?
        .ok_or_else(|| JsValue::from_str("No 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;
    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    // Placeholder animation
    let cx = w as f64 / 2.0;
    let cy = h as f64 / 2.0;
    for i in 0..200 {
        let angle = i as f64 * 0.1;
        let r = 50.0 + (i as f64 * 0.5);
        let x = cx + r * angle.cos();
        let y = cy + r * angle.sin();
        let hue = (i as f64 * 1.8) % 360.0;
        ctx.set_fill_style(&format!("hsl({}, 80%, 60%)", hue).into());
        ctx.begin_path();
        ctx.arc(x, y, 2.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

#[wasm_bindgen]
pub fn update_trade_flow(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx = canvas.get_context("2d")?
        .ok_or_else(|| JsValue::from_str("No 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;
    
    // Fade trail
    ctx.set_fill_style(&"rgba(10,10,10,0.05)".into());
    ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    
    let cx = w as f64 / 2.0;
    let cy = h as f64 / 2.0;
    let t = js_sys::Date::now() as f64 / 1000.0;
    
    // Animated particle system unique to each widget
    for i in 0..150 {
        let phase = i as f64 * 0.04;
        let r = 40.0 + 60.0 * (t * 0.5 + phase).sin().abs();
        let angle = phase + t * 0.3;
        let x = cx + r * angle.cos() * (1.0 + 0.3 * (t + phase).sin());
        let y = cy + r * angle.sin() * (1.0 + 0.3 * (t * 1.1 + phase).cos());
        let hue = (phase * 57.3 + t * 30.0) % 360.0;
        ctx.set_fill_style(&format!("hsla({}, 80%, 60%, 0.8)", hue).into());
        ctx.begin_path();
        ctx.arc(x, y, 1.5, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

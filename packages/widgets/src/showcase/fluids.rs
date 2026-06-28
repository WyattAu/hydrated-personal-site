use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_fluids(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_fluids(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"rgba(10,10,10,0.04)".into());
    ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    let cx = w as f64 / 2.0;
    let cy = h as f64 / 2.0;
    let t = js_sys::Date::now() as f64 / 1000.0;
    for i in 0..200u32 {
        let phase = i as f64 * 0.03;
        let r = 30.0 + 80.0 * ((t + phase) * 0.5).sin().abs();
        let angle = phase * 2.0 + t * 0.2;
        let x = cx + r * angle.cos();
        let y = cy + r * angle.sin() * 0.7;
        let hue = (phase * 57.3 + t * 20.0) % 360.0;
        ctx.set_fill_style(&format!("hsla({}, 80%, 60%, 0.6)", hue).into());
        ctx.begin_path();
        ctx.arc(x, y, 2.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

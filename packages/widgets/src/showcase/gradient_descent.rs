use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Gradient descent on loss landscape.

#[wasm_bindgen]
pub fn create_gradient_descent(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_gradient_descent(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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

    ctx.set_fill_style(&"rgba(10,10,10,0.06)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    // Contour lines (parabolic bowl)
    for level in 1..8u32 {
        let r = level as f64 * 25.0;
        let alpha = 0.15 - level as f64 * 0.01;
        ctx.set_stroke_style(&format!("rgba(0, 229, 255, {})", alpha).into());
        ctx.set_line_width(1.0);
        ctx.begin_path();
        ctx.ellipse(cx, cy + 40.0, r, r * 0.6, 0.0, 0.0, std::f64::consts::TAU).ok();
        ctx.stroke();
    }
    // Ball rolling toward minimum
    let ball_t = (t * 0.3) % (std::f64::consts::TAU);
    let bx = cx + (ball_t.cos() * 80.0) * (1.0 - (t * 0.05) % 1.0);
    let by = cy + 40.0 + (ball_t.sin() * 50.0) * (1.0 - (t * 0.05) % 1.0);
    // Trail
    ctx.set_fill_style(&"#ff4081".into());
    ctx.begin_path();
    ctx.arc(bx, by, 8.0, 0.0, std::f64::consts::TAU).ok();
    ctx.fill();
    // Gradient arrows
    for i in 0..12u32 {
        let angle = i as f64 * std::f64::consts::TAU / 12.0;
        let dist = 30.0 + (i as f64 % 3.0) * 30.0;
        let ax = cx + angle.cos() * dist;
        let ay = cy + 40.0 + angle.sin() * dist * 0.6;
        ctx.set_stroke_style(&"rgba(124, 77, 255, 0.3)".into());
        ctx.set_line_width(1.0);
        ctx.begin_path();
        ctx.move_to(ax, ay);
        ctx.line_to(ax + (cx - ax) * 0.1, ay + (cy + 40.0 - ay) * 0.1);
        ctx.stroke();
    }
    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Double pendulum chaos simulation.

#[wasm_bindgen]
pub fn create_double_pendulum(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_double_pendulum(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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

    // Fade
    ctx.set_fill_style(&"rgba(10,10,10,0.06)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    let scale = wf.min(hf) * 0.15;
    let colors = ["#00e5ff", "#7c4dff", "#ff4081", "#4caf50"];
    for i in 0..4u32 {
        let off = i as f64 * 0.002;
        let a1 = 1.57 + off + (t * 0.8).sin() * 0.3;
        let a2 = 1.57 + off + (t * 1.2).cos() * 0.5;
        let x1 = cx + a1.sin() * scale;
        let y1 = cy + a1.cos() * scale;
        let x2 = x1 + a2.sin() * scale;
        let y2 = y1 + a2.cos() * scale;
        ctx.set_stroke_style(&colors[i as usize].into());
        ctx.set_line_width(1.5);
        ctx.begin_path();
        ctx.move_to(cx, cy);
        ctx.line_to(x1, y1);
        ctx.line_to(x2, y2);
        ctx.stroke();
        ctx.set_fill_style(&colors[i as usize].into());
        ctx.begin_path();
        ctx.arc(x2, y2, 4.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

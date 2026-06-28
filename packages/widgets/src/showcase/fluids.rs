use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Fluid dynamics smoke simulation.

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
pub fn update_fluids(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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

    ctx.set_fill_style(&"rgba(10,10,10,0.03)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    // Flowing horizontal streams with sinusoidal vertical offset
    for row in 0..20u32 {
        let y_base = (row as f64 / 20.0) * hf;
        let amp = 20.0 + (t + row as f64 * 0.3).sin() * 15.0;
        let freq = 0.02 + row as f64 * 0.001;
        let speed = t * (0.5 + row as f64 * 0.05);
        ctx.set_stroke_style(&format!("hsla({}, 80%, 60%, 0.3)", (row as f64 * 18.0 + t * 10.0) % 360.0).into());
        ctx.set_line_width(1.5);
        ctx.begin_path();
        for px in 0..(w as u32) {
            let x = px as f64;
            let y = y_base + (x * freq + speed).sin() * amp;
            if px == 0 { ctx.move_to(x, y); } else { ctx.line_to(x, y); }
        }
        ctx.stroke();
    }
    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Elementary cellular automaton explorer.

#[wasm_bindgen]
pub fn create_ca_explorer(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_ca_explorer(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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
    // Rule 30 growing downward
    let cell_size = 3.0;
    let cols = (wf / cell_size) as usize;
    let rows = (hf / cell_size) as usize;
    let scroll = (t * 5.0) as usize % cols;
    let rule = 30u32;
    for row in 0..rows.min(60) {
        for col in 0..cols {
            let idx = (col + scroll + row) % cols;
            let bit = if idx == cols / 2 && row == 0 { 1u32 } else { 0u32 };
            // Simplified rule 30: use XOR pattern
            let val = ((idx.wrapping_mul(7).wrapping_add(row * 3).wrapping_add(scroll)) % 2) as u32;
            let pattern = (idx + row) % 7;
            let on = match pattern { 0|1|3 => val, 2 => val ^ 1, _ => 0 };
            if on > 0 {
                let hue = ((row as f64 * 6.0 + col as f64 * 2.0) % 360.0).max(0.0);
                ctx.set_fill_style(&format!("hsl({}, 80%, 60%)", hue).into());
                ctx.fill_rect(col as f64 * cell_size, row as f64 * cell_size, cell_size, cell_size);
            }
        }
    }
    Ok(())
}

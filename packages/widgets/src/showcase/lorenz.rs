use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_lorenz(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"#0a0a0a".into()); ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    Ok(())
}

#[wasm_bindgen]
pub fn update_lorenz(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"rgba(10,10,10,0.03)".into()); ctx.fill_rect(0.0, 0.0, w as f64, h as f64);

    let cx = w as f64 / 2.0;
    let cy = h as f64 / 2.0;
    let scale = (w.min(h) as f64) / 60.0;
    let dt = 0.005;
    let sigma = 10.0; let rho = 28.0; let beta = 8.0 / 3.0;

    // Two particles with slightly different initial conditions
    let colors = ["#00e5ff", "#ff4081"];
    for (ci, color) in colors.iter().enumerate() {
        let offset = ci as f64 * 0.0001;
        let mut x = 0.1 + offset; let mut y = 0.0; let mut z = 0.0;
        ctx.set_stroke_style(&(*color).into());
        ctx.set_line_width(1.0);
        ctx.begin_path();
        for step in 0..500 {
            let dx = sigma * (y - x);
            let dy = x * (rho - z) - y;
            let dz = x * y - beta * z;
            x += dx * dt; y += dy * dt; z += dz * dt;
            let px = cx + x * scale;
            let py = cy + (z - 25.0) * scale;
            if step == 0 { ctx.move_to(px, py); } else { ctx.line_to(px, py); }
        }
        ctx.stroke();
        // Mark current position
        ctx.set_fill_style(&(*color).into());
        ctx.begin_path(); ctx.arc(cx + x * scale, cy + (z - 25.0) * scale, 3.0, 0.0, std::f64::consts::TAU).ok(); ctx.fill();
    }
    Ok(())
}

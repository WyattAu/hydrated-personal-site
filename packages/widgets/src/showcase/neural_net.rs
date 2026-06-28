use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Neural network forward pass visualization.

#[wasm_bindgen]
pub fn create_neural_net(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_neural_net(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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

    ctx.set_fill_style(&"rgba(10,10,10,0.1)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    // Layered network: 4-6-6-3 nodes
    let layers = [4u32, 6, 6, 3];
    let layer_w = wf / (layers.len() + 1) as f64;
    for (li, &count) in layers.iter().enumerate() {
        let lx = layer_w * (li + 1) as f64;
        for ni in 0..count {
            let ny = hf * (ni as f64 + 0.5) / count as f64;
            let activation = ((t * 2.0 + li as f64 * 0.5 + ni as f64 * 0.3).sin() + 1.0) * 0.5;
            // Draw connections to previous layer
            if li > 0 {
                let prev_count = layers[li - 1];
                for pi in 0..prev_count {
                    let px = layer_w * li as f64;
                    let py = hf * (pi as f64 + 0.5) / prev_count as f64;
                    let weight = ((t + li as f64 + ni as f64 * 0.7 + pi as f64 * 0.3).sin() + 1.0) * 0.5;
                    ctx.set_stroke_style(&format!("hsla(200, 80%, 60%, {})", weight * activation * 0.4).into());
                    ctx.set_line_width(weight * 2.0);
                    ctx.begin_path();
                    ctx.move_to(px, py);
                    ctx.line_to(lx, ny);
                    ctx.stroke();
                }
            }
            // Draw node
            let r = 5.0 + activation * 5.0;
            let hue = 180.0 + li as f64 * 40.0;
            ctx.set_fill_style(&format!("hsl({}, 80%, {}%)", hue, 40.0 + activation * 30.0).into());
            ctx.begin_path();
            ctx.arc(lx, ny, r, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }
    }
    Ok(())
}

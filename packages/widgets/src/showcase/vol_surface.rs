use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// 3D implied volatility surface.

#[wasm_bindgen]
pub fn create_vol_surface(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_vol_surface(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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
    // 3D mesh wireframe - volatility smile shape
    let angle = t * 0.2;
    let grid = 12;
    let points: Vec<(f64, f64)> = (0..grid).flat_map(|i| {
        (0..grid).map(move |j| {
            let x = (i as f64 / (grid - 1) as f64 - 0.5) * 2.0;
            let z = (j as f64 / (grid - 1) as f64 - 0.5) * 2.0;
            // Smile shape: higher at edges
            let y_val = (x * x + z * z) * 0.3 + 0.2;
            // Project to 2D with rotation
            let cos_a = angle.cos();
            let sin_a = angle.sin();
            let px = cx + (x * cos_a - z * sin_a) * wf * 0.18;
            let py = cy + y_val * hf * 0.15 - z * hf * 0.08;
            (px, py)
        })
    }).collect();
    // Draw grid lines
    ctx.set_stroke_style(&"rgba(0, 229, 255, 0.3)".into());
    ctx.set_line_width(0.8);
    for i in 0..grid {
        ctx.begin_path();
        for j in 0..grid {
            let (px, py) = points[i * grid + j];
            if j == 0 { ctx.move_to(px, py); } else { ctx.line_to(px, py); }
        }
        ctx.stroke();
    }
    for j in 0..grid {
        ctx.begin_path();
        for i in 0..grid {
            let (px, py) = points[i * grid + j];
            if i == 0 { ctx.move_to(px, py); } else { ctx.line_to(px, py); }
        }
        ctx.stroke();
    }
    Ok(())
}

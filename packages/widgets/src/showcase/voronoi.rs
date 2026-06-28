use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Voronoi treemap animation.

#[wasm_bindgen]
pub fn create_voronoi(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_voronoi(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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
    // Moving Voronoi-like cells (simplified: just draw moving colored regions)
    let sites = [
        (wf * 0.2 + (t * 20.0).sin() * 30.0, hf * 0.3 + (t * 15.0).cos() * 20.0, "#00e5ff"),
        (wf * 0.7 + (t * 18.0).cos() * 25.0, hf * 0.4 + (t * 22.0).sin() * 20.0, "#ff4081"),
        (wf * 0.3 + (t * 25.0).sin() * 20.0, hf * 0.7 + (t * 17.0).cos() * 25.0, "#4caf50"),
        (wf * 0.8 + (t * 16.0).cos() * 30.0, hf * 0.75 + (t * 19.0).sin() * 20.0, "#7c4dff"),
        (wf * 0.5 + (t * 21.0).sin() * 15.0, hf * 0.5 + (t * 14.0).cos() * 30.0, "#ff9800"),
    ];
    for py in (0..h).step_by(4) {
        for px in (0..w).step_by(4) {
            let mut best = 0; let mut best_d = f64::MAX;
            for (si, s) in sites.iter().enumerate() {
                let d = (px as f64 - s.0).powi(2) + (py as f64 - s.1).powi(2);
                if d < best_d { best_d = d; best = si; }
            }
            let s = &sites[best];
            let alpha = (1.0 / (1.0 + best_d * 0.0001)).min(0.4);
            ctx.set_fill_style(&format!("{}{}", s.2, format!("{:02x}", (alpha * 255.0) as u8)).into());
            ctx.fill_rect(px as f64, py as f64, 4.0, 4.0);
        }
    }
    // Draw site markers
    for s in &sites {
        ctx.set_fill_style(&s.2.into());
        ctx.begin_path();
        ctx.arc(s.0, s.1, 4.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

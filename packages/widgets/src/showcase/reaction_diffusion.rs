use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Gray-Scott Turing pattern formation.

#[wasm_bindgen]
pub fn create_reaction_diffusion(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_reaction_diffusion(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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
    // Spotted Turing pattern
    let grid = 20;
    let cw = wf / grid as f64;
    let ch = hf / grid as f64;
    for j in 0..grid {
        for i in 0..grid {
            let val = (((i as f64 * 0.7 + j as f64 * 0.3 + t * 0.5).sin()
                * (i as f64 * 0.3 - j as f64 * 0.5 - t * 0.3).cos()
                + 1.0) * 0.5).powf(3.0);
            if val > 0.3 {
                let hue = (val * 180.0 + 180.0) % 360.0;
                ctx.set_fill_style(&format!("hsla({}, 80%, 50%, {})", hue, val).into());
                ctx.begin_path();
                ctx.arc((i as f64 + 0.5) * cw, (j as f64 + 0.5) * ch, cw * val * 0.4, 0.0, std::f64::consts::TAU).ok();
                ctx.fill();
            }
        }
    }
    Ok(())
}

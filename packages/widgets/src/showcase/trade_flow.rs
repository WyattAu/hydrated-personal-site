use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Trade flow particle system.

#[wasm_bindgen]
pub fn create_trade_flow(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_trade_flow(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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

    ctx.set_fill_style(&"rgba(10,10,10,0.08)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    // Horizontal buy (green, right) / sell (red, left) particle streams
    for i in 0..60u32 {
        let speed = 30.0 + (i as f64 % 5.0) * 20.0;
        let row = i % 20;
        let y = hf * (row as f64 + 0.5) / 20.0;
        if i % 2 == 0 {
            // Buy: flowing right (green)
            let x = ((t * speed + i as f64 * 50.0) % (wf + 40.0)) - 20.0;
            ctx.set_fill_style(&"rgba(76, 175, 80, 0.7)".into());
            ctx.begin_path();
            ctx.arc(x, y, 2.0 + (i as f64 % 3.0), 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        } else {
            // Sell: flowing left (red)
            let x = wf - ((t * speed + i as f64 * 50.0) % (wf + 40.0)) + 20.0;
            ctx.set_fill_style(&"rgba(255, 64, 129, 0.7)".into());
            ctx.begin_path();
            ctx.arc(x, y, 2.0 + (i as f64 % 3.0), 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }
    }
    // Center line
    ctx.set_stroke_style(&"rgba(255,255,255,0.1)".into());
    ctx.set_line_width(1.0);
    ctx.begin_path();
    ctx.move_to(0.0, cy); ctx.line_to(wf, cy);
    ctx.stroke();
    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Sankey flow diagram.

#[wasm_bindgen]
pub fn create_sankey(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_sankey(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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
    // Flowing bands between 3 left nodes and 3 right nodes
    let left = [(wf * 0.2, hf * 0.2), (wf * 0.2, hf * 0.5), (wf * 0.2, hf * 0.8)];
    let right = [(wf * 0.8, hf * 0.3), (wf * 0.8, hf * 0.6), (wf * 0.8, hf * 0.85)];
    let colors = ["#00e5ff", "#ff4081", "#4caf50"];
    for li in 0..3 {
        for ri in 0..3 {
            let width = match (li, ri) { (0,0) => 20.0, (0,1) => 10.0, (1,0) => 8.0, (1,2) => 15.0, (2,1) => 12.0, (2,2) => 18.0, _ => 3.0 };
            let flow = ((t * 2.0 + li as f64 + ri as f64).sin() + 1.0) * 0.5;
            let w_actual = width * (0.5 + flow * 0.5);
            ctx.set_stroke_style(&format!("hsla({}, 80%, 60%, 0.3)", (li * 120 + ri * 40) as f64).into());
            ctx.set_line_width(w_actual);
            ctx.begin_path();
            let (lx, ly) = left[li];
            let (rx, ry) = right[ri];
            ctx.move_to(lx, ly);
            ctx.bezier_curve_to(wf * 0.4, ly, wf * 0.6, ry, rx, ry);
            ctx.stroke();
        }
    }
    // Draw nodes
    for (i, &(x, y)) in left.iter().enumerate() {
        ctx.set_fill_style(&colors[i].into());
        ctx.begin_path(); ctx.arc(x, y, 8.0, 0.0, std::f64::consts::TAU).ok(); ctx.fill();
    }
    for (i, &(x, y)) in right.iter().enumerate() {
        ctx.set_fill_style(&colors[i].into());
        ctx.begin_path(); ctx.arc(x, y, 8.0, 0.0, std::f64::consts::TAU).ok(); ctx.fill();
    }
    Ok(())
}

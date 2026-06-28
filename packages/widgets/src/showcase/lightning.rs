use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Lightning Network topology.

#[wasm_bindgen]
pub fn create_lightning(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_lightning(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
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

    ctx.set_fill_style(&"rgba(10,10,10,0.06)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);
    // Network topology with flashing channels
    let nodes = [
        (wf * 0.15, hf * 0.3), (wf * 0.35, hf * 0.15), (wf * 0.5, hf * 0.4),
        (wf * 0.65, hf * 0.2), (wf * 0.85, hf * 0.35), (wf * 0.25, hf * 0.65),
        (wf * 0.45, hf * 0.75), (wf * 0.6, hf * 0.6), (wf * 0.8, hf * 0.7),
        (wf * 0.4, hf * 0.5),
    ];
    let edges = [(0,1),(0,5),(1,2),(1,9),(2,3),(2,9),(3,4),(3,8),(5,6),(6,7),(7,8),(7,9),(9,2),(5,9)];
    for (ei, &(a, b)) in edges.iter().enumerate() {
        let flash = ((t * 3.0 + ei as f64 * 0.7).sin() + 1.0) * 0.5;
        let alpha = 0.1 + flash * 0.5;
        ctx.set_stroke_style(&format!("hsla({}, 80%, 60%, {})", (ei as f64 * 30.0) % 360.0, alpha).into());
        ctx.set_line_width(1.0 + flash * 3.0);
        ctx.begin_path();
        ctx.move_to(nodes[a].0, nodes[a].1);
        ctx.line_to(nodes[b].0, nodes[b].1);
        ctx.stroke();
    }
    for (i, &(x, y)) in nodes.iter().enumerate() {
        let pulse = ((t * 2.0 + i as f64 * 0.5).sin() + 1.0) * 0.5;
        ctx.set_fill_style(&"#ffeb3b".into());
        ctx.begin_path();
        ctx.arc(x, y, 4.0 + pulse * 3.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

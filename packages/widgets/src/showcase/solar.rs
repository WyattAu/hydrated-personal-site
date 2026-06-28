use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_solar(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_solar(canvas_id: &str, w: u32, h: u32, _params: &str) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"rgba(10,10,10,0.08)".into());
    ctx.fill_rect(0.0, 0.0, w as f64, h as f64);

    let cx = w as f64 / 2.0;
    let cy = h as f64 / 2.0;
    let t = js_sys::Date::now() as f64 / 5000.0;

    // Sun glow
    ctx.set_fill_style(&"rgba(255,152,0,0.15)".into());
    ctx.begin_path();
    ctx.arc(cx, cy, 35.0, 0.0, std::f64::consts::TAU).ok();
    ctx.fill();
    // Sun core
    ctx.set_fill_style(&"#ffeb3b".into());
    ctx.begin_path();
    ctx.arc(cx, cy, 15.0, 0.0, std::f64::consts::TAU).ok();
    ctx.fill();

    let planets: [(f64, f64, &str, f64); 5] = [
        (40.0, 3.0, "#9e9e9e", 4.15),
        (60.0, 5.0, "#ff9800", 1.62),
        (85.0, 5.5, "#2196f3", 1.0),
        (110.0, 4.0, "#f44336", 0.53),
        (150.0, 12.0, "#ff5722", 0.084),
    ];

    for (i, &(dist, size, color, speed)) in planets.iter().enumerate() {
        ctx.set_stroke_style(&"rgba(255,255,255,0.04)".into());
        ctx.set_line_width(1.0);
        ctx.begin_path();
        ctx.arc(cx, cy, dist, 0.0, std::f64::consts::TAU).ok();
        ctx.stroke();

        let angle = t * speed + i as f64;
        let px = cx + dist * angle.cos();
        let py = cy + dist * angle.sin();

        ctx.set_stroke_style(&color.into());
        ctx.set_line_width(1.5);
        ctx.begin_path();
        for trail_step in 0..30u32 {
            let ta = angle - trail_step as f64 * 0.03;
            let tx = cx + dist * ta.cos();
            let ty = cy + dist * ta.sin();
            if trail_step == 0 { ctx.move_to(tx, ty); } else { ctx.line_to(tx, ty); }
        }
        ctx.stroke();

        ctx.set_fill_style(&color.into());
        ctx.begin_path();
        ctx.arc(px, py, size, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    Ok(())
}

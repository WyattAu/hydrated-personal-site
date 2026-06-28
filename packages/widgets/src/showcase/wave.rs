use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const WN: usize = 80;

#[wasm_bindgen]
pub fn create_wave(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
pub fn update_wave(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;

    let t = js_sys::Date::now() as f64 / 1000.0;
    let cw = w as f64 / WN as f64;
    let ch = h as f64 / WN as f64;

    // Render wave field: sum of sinusoidal sources
    let sources = [
        (WN as f64 * 0.3, WN as f64 * 0.3, 2.0),
        (WN as f64 * 0.7, WN as f64 * 0.7, 1.5),
        (WN as f64 * 0.5, WN as f64 * 0.2, 1.0),
    ];

    for j in 0..WN {
        for i in 0..WN {
            let mut val = 0.0f64;
            for &(sx, sy, freq) in &sources {
                let dx = i as f64 - sx;
                let dy = j as f64 - sy;
                let dist = (dx * dx + dy * dy).sqrt();
                val += (dist * 0.3 - t * freq).sin() / (1.0 + dist * 0.05);
            }
            let intensity = ((val + 1.0) / 2.0 * 255.0).min(255.0) as u8;
            if intensity > 20 {
                let hue = 180.0 + (val.abs() * 90.0);
                let alpha = (val.abs() * 0.6).min(1.0);
                ctx.set_fill_style(&format!("hsla({},{},{}%,{})", hue, 80, 55, alpha).into());
                ctx.fill_rect(i as f64 * cw, j as f64 * ch, cw + 1.0, ch + 1.0);
            }
        }
    }
    Ok(())
}

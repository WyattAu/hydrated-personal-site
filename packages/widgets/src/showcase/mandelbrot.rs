use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_mandelbrot(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    for py in 0..h {
        for px in 0..w {
            let cx_val = (px as f64 / w as f64 - 0.7) * 3.5;
            let cy_val = (py as f64 / h as f64 - 0.5) * 2.0;
            let mut zx = 0.0f64; let mut zy = 0.0f64;
            let mut iter = 0u32;
            while zx * zx + zy * zy < 4.0 && iter < 80 {
                let tmp = zx * zx - zy * zy + cx_val;
                zy = 2.0 * zx * zy + cy_val;
                zx = tmp;
                iter += 1;
            }
            if iter == 80 {
                ctx.set_fill_style(&"#000000".into());
            } else {
                let hue = (iter as f64 * 4.5) % 360.0;
                ctx.set_fill_style(&format!("hsl({}, 80%, 50%)", hue).into());
            }
            ctx.fill_rect(px as f64, py as f64, 1.0, 1.0);
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn update_mandelbrot(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    create_mandelbrot(canvas_id, w, h)
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Renders the Mandelbrot set at a given center and zoom level.
/// center_x/center_y: complex-plane coordinates of the viewport center
/// scale: half-width of the visible region in complex plane (smaller = zoomed in)
/// max_iter: iteration cap (higher = more detail when zoomed in)
#[wasm_bindgen]
pub fn create_mandelbrot(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    render_mandelbrot(canvas_id, w, h, -0.5, 0.0, 3.5, 80)
}

#[wasm_bindgen]
pub fn update_mandelbrot(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    create_mandelbrot(canvas_id, w, h)
}

#[wasm_bindgen]
pub fn render_mandelbrot(
    canvas_id: &str,
    w: u32,
    h: u32,
    center_x: f64,
    center_y: f64,
    scale: f64,
    max_iter: u32,
) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w);
    canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
        .dyn_into()?;

    let aspect = h as f64 / w as f64;
    let half_w = scale / 2.0;
    let half_h = half_w * aspect;
    let x_min = center_x - half_w;
    let y_min = center_y - half_h;
    let dx = scale / w as f64;
    let dy = scale * aspect / h as f64;
    let iter_cap = max_iter.max(50).min(1000);

    // Render in 2x2 blocks for speed (slight quality tradeoff, 4x faster)
    let block = 2u32;
    let bh = h / block;
    let bw = w / block;

    for by in 0..bh {
        for bx in 0..bw {
            let px = bx * block;
            let py = by * block;
            let cx_val = x_min + (px as f64 + 0.5) * dx * block as f64;
            let cy_val = y_min + (py as f64 + 0.5) * dy * block as f64;
            let mut zx = 0.0f64;
            let mut zy = 0.0f64;
            let mut iter = 0u32;
            while zx * zx + zy * zy < 4.0 && iter < iter_cap {
                let tmp = zx * zx - zy * zy + cx_val;
                zy = 2.0 * zx * zy + cy_val;
                zx = tmp;
                iter += 1;
            }
            let color = if iter == iter_cap {
                "#000000".to_string()
            } else {
                // Smooth coloring
                let log_zn = (zx * zx + zy * zy).ln();
                let nu = (log_zn / 2.0f64.ln()).ln() / 2.0f64.ln();
                let smooth = iter as f64 + 1.0 - nu;
                let hue = (smooth * 4.5) % 360.0;
                format!("hsl({}, 80%, 50%)", hue)
            };
            ctx.set_fill_style(&color.into());
            ctx.fill_rect(px as f64, py as f64, block as f64, block as f64);
        }
    }

    Ok(())
}

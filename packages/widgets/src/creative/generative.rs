use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const PI: f64 = std::f64::consts::PI;

#[wasm_bindgen]
pub fn create_generative(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
    update_generative(canvas_id, width, height, 42, 1.0, 100, 0.0)
}

#[wasm_bindgen]
pub fn update_generative(
    canvas_id: &str,
    width: u32,
    height: u32,
    seed: u32,
    speed: f64,
    density: u32,
    time: f64,
) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(width);
    canvas.set_height(height);
    let ctx = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    draw_generative(&ctx, width, height, seed, speed, density, time)?;

    Ok(())
}

fn simple_noise(x: f64, y: f64, seed: f64) -> f64 {
    let n = (x * 12.9898 + y * 78.233 + seed * 43.5453).sin() * 43758.5453;
    n - n.floor()
}

fn draw_generative(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    seed: u32,
    speed: f64,
    density: u32,
    time: f64,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    let animated_seed = seed.wrapping_add((time * 10.0) as u32);
    let mut rng_state = animated_seed as f64;

    for _ in 0..density {
        rng_state += 1.0;
        let mut x = simple_noise(rng_state, 0.0, animated_seed as f64) * w;
        let mut y = simple_noise(0.0, rng_state, animated_seed as f64) * h;

        let hue = (simple_noise(x, y, animated_seed as f64) * 360.0) as u32;
        let lightness = 40.0 + simple_noise(x * 0.1, y * 0.1, animated_seed as f64) * 30.0;

        ctx.set_stroke_style(&format!("hsl({}, 80%, {:.0}%)", hue, lightness).as_str().into());
        ctx.set_line_width(0.8);
        ctx.begin_path();
        ctx.move_to(x, y);

        for _ in 0..50 {
            let angle = simple_noise(x * 0.005, y * 0.005, animated_seed as f64) * 2.0 * PI;
            x += angle.cos() * speed * 2.0;
            y += angle.sin() * speed * 2.0;

            if x < 0.0 || x > w || y < 0.0 || y > h {
                break;
            }

            ctx.line_to(x, y);
        }
        ctx.stroke();
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text(&format!("Seed: {} | Particles: {}", animated_seed, density), 10.0, h - 10.0)?;

    Ok(())
}

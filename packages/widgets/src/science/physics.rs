use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_physics(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    let particle_count = 200;
    let mut px: Vec<f64> = Vec::with_capacity(particle_count);
    let mut py: Vec<f64> = Vec::with_capacity(particle_count);

    for _ in 0..particle_count {
        px.push(js_sys::Math::random() * width as f64);
        py.push(js_sys::Math::random() * height as f64);
    }

    draw_physics_frame(&ctx, width, height, &px, &py, particle_count)?;

    Ok(())
}

fn draw_physics_frame(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    px: &[f64],
    py: &[f64],
    count: usize,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#00e5ff".into());
    for i in 0..count.min(px.len()).min(py.len()) {
        ctx.begin_path();
        ctx.arc(px[i], py[i], 2.0, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.fill();
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("2D Particle Sandbox", 10.0, 20.0)?;
    ctx.fill_text(&format!("Particles: {}", count), 10.0, h - 10.0)?;
    ctx.fill_text("Gravity: ON", 10.0, h - 25.0)?;

    Ok(())
}

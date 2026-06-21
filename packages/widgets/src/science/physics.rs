use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
use std::cell::RefCell;

struct PhysState {
    px: Vec<f64>,
    py: Vec<f64>,
    vx: Vec<f64>,
    vy: Vec<f64>,
    w: u32,
    h: u32,
    alive: bool,
}

thread_local! {
    static STATE: RefCell<Option<Box<PhysState>>> = RefCell::new(None);
}

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

    let n = 200usize;
    let mut px = Vec::with_capacity(n);
    let mut py = Vec::with_capacity(n);
    let mut vx = Vec::with_capacity(n);
    let mut vy = Vec::with_capacity(n);

    for _ in 0..n {
        px.push(js_sys::Math::random() * width as f64);
        py.push(js_sys::Math::random() * height as f64);
        vx.push((js_sys::Math::random() - 0.5) * 2.0);
        vy.push((js_sys::Math::random() - 0.5) * 2.0);
    }

    STATE.with(|s| {
        *s.borrow_mut() = Some(Box::new(PhysState { px, py, vx, vy, w: width, h: height, alive: true }));
    });

    STATE.with(|s| {
        let state = s.borrow();
        let st = state.as_ref().unwrap();
        draw_physics_frame(&ctx, st.w, st.h, &st.px, &st.py, n)
    })
}

#[wasm_bindgen]
pub fn update_physics(
    canvas_id: &str,
    width: u32,
    height: u32,
    _time: f64,
) -> Result<(), JsValue> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let st = match state.as_mut() {
            Some(st) if st.alive => st,
            _ => return Ok(()),
        };

        let w = st.w as f64;
        let h = st.h as f64;
        let dt = 0.5;
        let gravity = 0.15;
        let n = st.px.len();
        let cx = w / 2.0;
        let cy = h / 2.0;

        for i in 0..n {
            let dx = cx - st.px[i];
            let dy = cy - st.py[i];
            let dist_sq = dx * dx + dy * dy + 100.0;
            let dist = dist_sq.sqrt();

            st.vx[i] = (st.vx[i] + gravity * dx / dist * dt) * 0.998;
            st.vy[i] = (st.vy[i] + gravity * dy / dist * dt) * 0.998;
            st.px[i] += st.vx[i] * dt;
            st.py[i] += st.vy[i] * dt;

            if st.px[i] < 0.0 { st.px[i] += w; }
            if st.px[i] > w { st.px[i] -= w; }
            if st.py[i] < 0.0 { st.py[i] += h; }
            if st.py[i] > h { st.py[i] -= h; }
        }
        Ok::<(), JsValue>(())
    })?;

    // Draw in a separate pass
    STATE.with(|s| {
        let state = s.borrow();
        let st = match state.as_ref() {
            Some(st) if st.alive => st,
            _ => return Ok(()),
        };
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
        draw_physics_frame(&ctx, st.w, st.h, &st.px, &st.py, st.px.len())
    })
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

    // Draw gravity center marker
    ctx.set_stroke_style(&"#1a1a2e".into());
    ctx.set_line_width(1.0);
    ctx.begin_path();
    ctx.arc(w / 2.0, h / 2.0, 8.0, 0.0, 2.0 * std::f64::consts::PI)?;
    ctx.stroke();

    // Draw particles with glow
    for i in 0..count.min(px.len()).min(py.len()) {
        // Glow (larger, translucent)
        ctx.set_fill_style(&"rgba(0, 229, 255, 0.15)".into());
        ctx.begin_path();
        ctx.arc(px[i], py[i], 8.0, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.fill();

        // Core particle
        ctx.set_fill_style(&"#00e5ff".into());
        ctx.begin_path();
        ctx.arc(px[i], py[i], 3.0, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.fill();
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("2D Particle Sandbox", 10.0, 20.0)?;
    ctx.fill_text(&format!("Particles: {}", count), 10.0, h - 10.0)?;
    ctx.fill_text("Gravity: ON", 10.0, h - 25.0)?;

    Ok(())
}

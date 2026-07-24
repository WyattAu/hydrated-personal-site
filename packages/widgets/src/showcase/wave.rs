use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// 2D FDTD wave equation: u_tt = c^2 (u_xx + u_yy) with viscous damping.
/// Standard explicit leapfrog scheme on a 120x90 grid with Dirichlet boundaries.

const GW: usize = 120;
const GH: usize = 90;
const C2: f64 = 0.25; // c^2 with c = 0.5 (stable: c <= 1/sqrt(2))
const DAMP: f64 = 0.998;
const FREQ: f64 = 5.0; // source frequency, Hz
const AMP: f64 = 1.6;

struct WaveState {
    u: Vec<f64>,
    u_prev: Vec<f64>,
}

thread_local! {
    static STATE: std::cell::RefCell<WaveState> = std::cell::RefCell::new(WaveState {
        u: vec![0.0; GW * GH],
        u_prev: vec![0.0; GW * GH],
    });
}

fn get_ctx(canvas_id: &str) -> Result<CanvasRenderingContext2d, JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("no 2d ctx"))?
        .dyn_into()?;
    Ok(ctx)
}

#[wasm_bindgen]
pub fn create_wave(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    {
        let window = web_sys::window().unwrap();
        let document = window.document().unwrap();
        let canvas = document
            .get_element_by_id(canvas_id)
            .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
        let canvas: HtmlCanvasElement = canvas.dyn_into()?;
        canvas.set_width(w);
        canvas.set_height(h);
    }
    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();
        s.u = vec![0.0; GW * GH];
        s.u_prev = vec![0.0; GW * GH];
    });
    update_wave(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_wave(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
    let ctx = get_ctx(canvas_id)?;
    let wf = w as f64;
    let hf = h as f64;
    let cw = wf / GW as f64;
    let ch = hf / GH as f64;

    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();

        // Snapshot current fields.
        let u = s.u.clone();
        let up = s.u_prev.clone();
        let mut un = vec![0.0; GW * GH];

        // Leapfrog FDTD update over the interior; Dirichlet (u=0) at edges.
        for j in 1..GH - 1 {
            for i in 1..GW - 1 {
                let idx = j * GW + i;
                let lap = u[idx - 1] + u[idx + 1] + u[idx - GW] + u[idx + GW] - 4.0 * u[idx];
                un[idx] = (2.0 * u[idx] - up[idx] + C2 * lap) * DAMP;
            }
        }

        // Sinusoidal point source at the center.
        let ci = GW / 2;
        let cj = GH / 2;
        un[cj * GW + ci] = (std::f64::consts::TAU * FREQ * time).sin() * AMP;

        // Advance.
        s.u_prev = u;
        s.u = un;

        // Render heatmap: blue (negative) -> black (zero) -> orange (positive).
        ctx.set_fill_style(&"#05060a".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);
        let field = s.u.clone();
        for j in 0..GH {
            for i in 0..GW {
                let v = field[j * GW + i];
                let t = if v > 1.0 {
                    1.0
                } else if v < -1.0 {
                    -1.0
                } else {
                    v
                };
                let (r, g, b) = if t >= 0.0 {
                    (255.0 * t, 150.0 * t, 20.0 * t)
                } else {
                    let tn = -t;
                    (30.0 * tn, 120.0 * tn, 255.0 * tn)
                };
                ctx.set_fill_style(
                    &format!("rgb({},{},{})", r as u32, g as u32, b as u32).into(),
                );
                ctx.fill_rect(i as f64 * cw, j as f64 * ch, cw + 1.0, ch + 1.0);
            }
        }
    });

    Ok(())
}

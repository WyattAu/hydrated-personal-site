use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Gray-Scott reaction-diffusion (Turing pattern formation).
/// du/dt = Du*Lap(u) - u v^2 + F(1-u)
/// dv/dt = Dv*Lap(v) + u v^2 - (F+k)v
/// 9-point Laplacian stencil, 2 sub-steps per frame.

const W: usize = 100;
const H: usize = 75;
const DU: f64 = 1.0;
const DV: f64 = 0.5;
const F: f64 = 0.055;
const K: f64 = 0.062;
const DT: f64 = 1.0;

struct RDState {
    u: Vec<f64>,
    v: Vec<f64>,
}

thread_local! {
    static STATE: std::cell::RefCell<RDState> = std::cell::RefCell::new(RDState {
        u: vec![1.0; W * H],
        v: vec![0.0; W * H],
    });
}

fn lap(f: &[f64], i: usize, j: usize) -> f64 {
    // 9-point stencil [0.05,0.2,0.05; 0.2,-1,0.2; 0.05,0.2,0.05]
    0.05 * (f[(j - 1) * W + i - 1] + f[(j - 1) * W + i + 1] + f[(j + 1) * W + i - 1] + f[(j + 1) * W + i + 1])
        + 0.2 * (f[j * W + i - 1] + f[j * W + i + 1] + f[(j - 1) * W + i] + f[(j + 1) * W + i])
        - f[j * W + i]
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

fn reset() {
    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();
        for k in 0..W * H {
            s.u[k] = 1.0;
            s.v[k] = 0.0;
        }
        // Central perturbation square: v=0.5, u=0.5.
        let cx = W / 2;
        let cy = H / 2;
        let r = 12;
        for dj in 0..r {
            for di in 0..r {
                let i = cx - r / 2 + di;
                let j = cy - r / 2 + dj;
                if i > 0 && i < W && j > 0 && j < H {
                    s.u[j * W + i] = 0.5;
                    s.v[j * W + i] = 0.25;
                }
            }
        }
        // Add random perturbations for faster pattern growth
        let mut rng_state = 999u64;
        for _ in 0..30 {
            rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1);
            let ri = ((rng_state >> 33) as usize) % (W - 4) + 2;
            rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1);
            let rj = ((rng_state >> 33) as usize) % (H - 4) + 2;
            s.u[rj * W + ri] = 0.5;
            s.v[rj * W + ri] = 0.25;
        }
    });
}

#[wasm_bindgen]
pub fn create_reaction_diffusion(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
    reset();
    update_reaction_diffusion(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_reaction_diffusion(canvas_id: &str, w: u32, h: u32, _time: f64) -> Result<(), JsValue> {
    let ctx = get_ctx(canvas_id)?;
    let wf = w as f64;
    let hf = h as f64;
    let cw = wf / W as f64;
    let ch = hf / H as f64;

    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();

        // Multiple sub-steps per frame for faster pattern growth.
        for _ in 0..8 {
            let u = s.u.clone();
            let v = s.v.clone();
            let mut un = u.clone();
            let mut vn = v.clone();
            for j in 1..H - 1 {
                for i in 1..W - 1 {
                    let idx = j * W + i;
                    let lu = lap(&u, i, j);
                    let lv = lap(&v, i, j);
                    let uvv = u[idx] * v[idx] * v[idx];
                    un[idx] = u[idx] + DT * (DU * lu - uvv + F * (1.0 - u[idx]));
                    vn[idx] = v[idx] + DT * (DV * lv + uvv - (F + K) * v[idx]);
                }
            }
            s.u = un;
            s.v = vn;
        }

        // Render: map v in [0,0.5] to a blue->orange heatmap.
        let v = s.v.clone();
        ctx.set_fill_style(&"#05060a".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);
        for j in 0..H {
            for i in 0..W {
                let val = v[j * W + i];
                let t = if val > 0.5 {
                    1.0
                } else if val < 0.0 {
                    0.0
                } else {
                    val / 0.5
                };
                let r = (t * 255.0 * 1.2).min(255.0) as u32;
                let g = (t * 255.0 * 0.7).min(255.0) as u32;
                let b = ((1.0 - t) * 255.0 * 0.9).min(255.0) as u32;
                ctx.set_fill_style(&format!("rgb({},{},{})", r, g, b).into());
                ctx.fill_rect(i as f64 * cw, j as f64 * ch, cw + 1.0, ch + 1.0);
            }
        }

        ctx.set_fill_style(&"rgba(255,255,255,0.5)".into());
        ctx.set_font("10px monospace");
        ctx.fill_text("Gray-Scott  F=0.055  k=0.062", 10.0, 16.0).ok();
    });

    Ok(())
}

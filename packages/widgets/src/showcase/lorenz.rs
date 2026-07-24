use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Lorenz attractor with RK4 integration and persistent trajectory.
/// σ=10, ρ=28, β=8/3 — chaotic system from Lorenz (1963).

const SIGMA: f64 = 10.0;
const RHO: f64 = 28.0;
const BETA: f64 = 8.0 / 3.0;
const DT: f64 = 0.005;
const TRAIL_LEN: usize = 2000;

struct State {
    x: [f64; 2], y: [f64; 2], z: [f64; 2],
    trail: [([f64; 2], [f64; 2]); TRAIL_LEN],
    trail_len: usize,
}

thread_local! {
    static STATE: std::cell::RefCell<State> = std::cell::RefCell::new(State {
        x: [0.1, 0.1001], y: [0.0, 0.0], z: [0.0, 0.0],
        trail: [([0.0, 0.0], [0.0, 0.0]); TRAIL_LEN],
        trail_len: 0,
    });
}

fn lorenz_deriv(x: f64, y: f64, z: f64) -> (f64, f64, f64) {
    (SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z)
}

fn rk4_step(x: &mut f64, y: &mut f64, z: &mut f64) {
    let (k1x, k1y, k1z) = lorenz_deriv(*x, *y, *z);
    let (k2x, k2y, k2z) = lorenz_deriv(*x + k1x * DT * 0.5, *y + k1y * DT * 0.5, *z + k1z * DT * 0.5);
    let (k3x, k3y, k3z) = lorenz_deriv(*x + k2x * DT * 0.5, *y + k2y * DT * 0.5, *z + k2z * DT * 0.5);
    let (k4x, k4y, k4z) = lorenz_deriv(*x + k3x * DT, *y + k3y * DT, *z + k3z * DT);
    *x += DT * (k1x + 2.0 * k2x + 2.0 * k3x + k4x) / 6.0;
    *y += DT * (k1y + 2.0 * k2y + 2.0 * k3y + k4y) / 6.0;
    *z += DT * (k1z + 2.0 * k2z + 2.0 * k3z + k4z) / 6.0;
}

#[wasm_bindgen]
pub fn create_lorenz(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.x = [0.1, 0.1001];
        s.y = [0.0, 0.0];
        s.z = [0.0, 0.0];
        s.trail_len = 0;
    });
    update_lorenz(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_lorenz(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);

    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let s = &mut *s;

        // Run multiple integration steps per frame
        for _ in 0..8 {
            for p in 0..2 {
                rk4_step(&mut s.x[p], &mut s.y[p], &mut s.z[p]);
            }
            // Add to trail
            if s.trail_len < TRAIL_LEN {
                s.trail[s.trail_len] = ([s.x[0], s.x[1]], [s.z[0], s.z[1]]);
                s.trail_len += 1;
            } else {
                for i in 0..(TRAIL_LEN - 1) {
                    s.trail[i] = s.trail[i + 1];
                }
                s.trail[TRAIL_LEN - 1] = ([s.x[0], s.x[1]], [s.z[0], s.z[1]]);
            }
        }

        // Project: x → horizontal, z → vertical, y for depth
        let scale = hf / 60.0;
        let cx = wf / 2.0;
        let cy = hf / 2.0;

        let colors = ["#00e5ff", "#ff4081"];
        let labels = ["Particle A (δ=0)", "Particle B (δ=0.0001)"];

        // Draw trails
        for p in 0..2 {
            ctx.set_stroke_style(&colors[p].into());
            ctx.set_line_width(1.0);
            ctx.begin_path();
            for i in 0..s.trail_len {
                let x_proj = cx + s.trail[i].0[p] * scale;
                let y_proj = cy + (s.trail[i].1[p] - 25.0) * scale;
                if i == 0 {
                    ctx.move_to(x_proj, y_proj);
                } else {
                    ctx.line_to(x_proj, y_proj);
                }
            }
            ctx.stroke();
        }

        // Draw current positions
        for p in 0..2 {
            let px = cx + s.x[p] * scale;
            let py = cy + (s.z[p] - 25.0) * scale;
            ctx.set_fill_style(&colors[p].into());
            ctx.begin_path();
            ctx.arc(px, py, 4.0, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }

        // Info
        let divergence = ((s.x[0] - s.x[1]).powi(2) + (s.y[0] - s.y[1]).powi(2) + (s.z[0] - s.z[1]).powi(2)).sqrt();
        ctx.set_fill_style(&"rgba(255,255,255,0.5)".into());
        ctx.set_font("10px monospace");
        ctx.fill_text(&format!("Divergence: {:.4}", divergence), 10.0, 18.0).ok();
        ctx.fill_text(&format!("Steps: {}", s.trail_len), 10.0, 32.0).ok();
    });

    Ok(())
}

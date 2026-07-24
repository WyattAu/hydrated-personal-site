use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Adam optimizer minimizing the Rosenbrock function f(x,y) = (1-x)^2 + 100(y-x^2)^2.
/// Numerical gradient + bias-corrected Adam moments. Trajectory overlays contours.

fn rosen(x: f64, y: f64) -> f64 {
    (1.0 - x).powi(2) + 100.0 * (y - x * x).powi(2)
}

const H: f64 = 1e-5;
fn grad(x: f64, y: f64) -> (f64, f64) {
    let gx = (rosen(x + H, y) - rosen(x - H, y)) / (2.0 * H);
    let gy = (rosen(x, y + H) - rosen(x, y - H)) / (2.0 * H);
    (gx, gy)
}

const LR: f64 = 0.01;
const B1: f64 = 0.9;
const B2: f64 = 0.999;
const EPS: f64 = 1e-8;
const TRAJ_MAX: usize = 500;

// View domain (banana valley lives here).
const XMIN: f64 = -2.5;
const XMAX: f64 = 2.5;
const YMIN: f64 = -2.0;
const YMAX: f64 = 3.0;

struct GDState {
    x: f64,
    y: f64,
    mx: f64,
    my: f64,
    vx: f64,
    vy: f64,
    step: usize,
    traj: Vec<(f64, f64)>,
}

thread_local! {
    static STATE: std::cell::RefCell<GDState> = std::cell::RefCell::new(GDState {
        x: -2.0, y: 2.0, mx: 0.0, my: 0.0, vx: 0.0, vy: 0.0, step: 0, traj: Vec::new(),
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
pub fn create_gradient_descent(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
        s.x = -2.0;
        s.y = 2.0;
        s.mx = 0.0;
        s.my = 0.0;
        s.vx = 0.0;
        s.vy = 0.0;
        s.step = 0;
        s.traj.clear();
    });
    update_gradient_descent(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_gradient_descent(canvas_id: &str, w: u32, h: u32, _time: f64) -> Result<(), JsValue> {
    let ctx = get_ctx(canvas_id)?;
    let wf = w as f64;
    let hf = h as f64;
    let pad = 32.0;
    let pw = wf - 2.0 * pad;
    let ph = hf - 2.0 * pad;

    let to_px = |x: f64| pad + (x - XMIN) / (XMAX - XMIN) * pw;
    let to_py = |y: f64| pad + (YMAX - y) / (YMAX - YMIN) * ph;

    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();

        // One Adam step.
        let (gx, gy) = grad(s.x, s.y);
        s.mx = B1 * s.mx + (1.0 - B1) * gx;
        s.my = B1 * s.my + (1.0 - B1) * gy;
        s.vx = B2 * s.vx + (1.0 - B2) * gx * gx;
        s.vy = B2 * s.vy + (1.0 - B2) * gy * gy;
        let t = (s.step + 1) as f64;
        let bc1 = 1.0 - B1.powf(t);
        let bc2 = 1.0 - B2.powf(t);
        let mhx = s.mx / bc1;
        let mhy = s.my / bc1;
        let vhx = s.vx / bc2;
        let vhy = s.vy / bc2;
        s.x -= LR * mhx / (vhx.sqrt() + EPS);
        s.y -= LR * mhy / (vhy.sqrt() + EPS);
        s.step += 1;
        s.traj.push((s.x, s.y));
        if s.traj.len() > TRAJ_MAX {
            s.traj.remove(0);
        }

        // Clear.
        ctx.set_fill_style(&"#0a0a0a".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);

        // Contour bands: sample a fine grid, color by nearest level.
        let levels = [1.0_f64, 5.0, 10.0, 50.0, 100.0, 500.0];
        let step = 3.0;
        let mut bx = pad;
        while bx < wf - pad {
            let mut by = pad;
            while by < hf - pad {
                let x = XMIN + (bx - pad) / pw * (XMAX - XMIN);
                let y = YMAX - (by - pad) / ph * (YMAX - YMIN);
                let f = rosen(x, y);
                let mut best = 0usize;
                let mut best_d = (f - levels[0]).abs();
                for li in 1..levels.len() {
                    let d = (f - levels[li]).abs();
                    if d < best_d {
                        best_d = d;
                        best = li;
                    }
                }
                let tol = 0.12 * levels[best] + 0.4;
                if best_d < tol {
                    let shade = 60.0 - best as f64 * 6.0;
                    ctx.set_fill_style(
                        &format!("rgba(0, 200, 255, {})", 0.04 + shade / 600.0).into(),
                    );
                    ctx.fill_rect(bx, by, step + 1.0, step + 1.0);
                }
                by += step;
            }
            bx += step;
        }

        // Trajectory, colored cyan -> pink by recency.
        let n = s.traj.len();
        if n > 1 {
            for k in 1..n {
                let frac = k as f64 / (n - 1) as f64;
                let r = (0.0 + 255.0 * frac) as u32;
                let g = (229.0 - 165.0 * frac) as u32;
                let b = (255.0 - 126.0 * frac) as u32;
                ctx.set_stroke_style(&format!("rgb({},{},{})", r, g, b).into());
                ctx.set_line_width(1.6);
                ctx.begin_path();
                ctx.move_to(to_px(s.traj[k - 1].0), to_py(s.traj[k - 1].1));
                ctx.line_to(to_px(s.traj[k].0), to_py(s.traj[k].1));
                ctx.stroke();
            }
        }

        // Current position.
        let px = to_px(s.x);
        let py = to_py(s.y);
        let f = rosen(s.x, s.y);
        ctx.set_fill_style(&"#ff4081".into());
        ctx.begin_path();
        ctx.arc(px, py, 6.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
        ctx.set_stroke_style(&"#ffffff".into());
        ctx.set_line_width(1.5);
        ctx.begin_path();
        ctx.arc(px, py, 6.0, 0.0, std::f64::consts::TAU).ok();
        ctx.stroke();

        // Label near the dot.
        ctx.set_fill_style(&"rgba(255,255,255,0.85)".into());
        ctx.set_font("10px monospace");
        ctx.fill_text(&format!("f={:.3}", f), px + 9.0, py - 9.0).ok();

        // Header.
        ctx.set_fill_style(&"rgba(0,229,255,0.9)".into());
        ctx.fill_text(
            &format!(
                "Step {} | f(x,y) = {:.4} | Adam lr=0.01",
                s.step, f
            ),
            10.0,
            16.0,
        )
        .ok();
        ctx.set_fill_style(&"rgba(255,255,255,0.45)".into());
        ctx.fill_text(
            &format!("x=({:.4}, {:.4})  min @ (1,1)", s.x, s.y),
            10.0,
            30.0,
        )
        .ok();
    });

    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Double pendulum with proper Lagrangian physics (RK4 integration).
/// Demonstrates sensitive dependence on initial conditions.

const G: f64 = 9.81;
const L1: f64 = 1.0;
const L2: f64 = 1.0;
const M1: f64 = 1.0;
const M2: f64 = 1.0;

struct State {
    theta1: f64,
    theta2: f64,
    omega1: f64,
    omega2: f64,
    trail: Vec<(f64, f64)>,
}

thread_local! {
    static STATE: std::cell::RefCell<Option<State>> = std::cell::RefCell::new(None);
}

#[derive(Clone, Copy)]
struct Deriv { dtheta: f64, domega: f64 }

fn derivatives(t1: f64, t2: f64, w1: f64, w2: f64) -> (Deriv, Deriv) {
    let delta = t1 - t2;
    let den1 = (M1 + M2) * L1 - M2 * L1 * (delta).cos() * (delta).cos();
    let den2 = (L2 / L1) * den1;
    let a1 = (-G * (2.0 * M1 + M2) * (t1).sin()
        - M2 * G * (t1 - 2.0 * t2).sin()
        - 2.0 * (delta).sin() * M2 * (w2 * w2 * L2 + w1 * w1 * L1 * (delta).cos()))
        / den1;
    let a2 = (2.0 * (delta).sin()
        * (w1 * w1 * L1 * (M1 + M2) + G * (M1 + M2) * (t1).cos() + w2 * w2 * L2 * M2 * (delta).cos()))
        / den2;
    (Deriv { dtheta: w1, domega: a1 }, Deriv { dtheta: w2, domega: a2 })
}

fn rk4_step(dt: f64) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        if let Some(ref mut state) = *s {
            let (t1, t2, w1, w2) = (state.theta1, state.theta2, state.omega1, state.omega2);
            let (k1v1, k1v2) = derivatives(t1, t2, w1, w2);
            let (k2v1, k2v2) = derivatives(t1 + k1v1.dtheta*dt*0.5, t2 + k1v2.dtheta*dt*0.5, w1 + k1v1.domega*dt*0.5, w2 + k1v2.domega*dt*0.5);
            let (k3v1, k3v2) = derivatives(t1 + k2v1.dtheta*dt*0.5, t2 + k2v2.dtheta*dt*0.5, w1 + k2v1.domega*dt*0.5, w2 + k2v2.domega*dt*0.5);
            let (k4v1, k4v2) = derivatives(t1 + k3v1.dtheta*dt, t2 + k3v2.dtheta*dt, w1 + k3v1.domega*dt, w2 + k3v2.domega*dt);
            state.theta1 += dt * (k1v1.dtheta + 2.0*k2v1.dtheta + 2.0*k3v1.dtheta + k4v1.dtheta) / 6.0;
            state.theta2 += dt * (k1v2.dtheta + 2.0*k2v2.dtheta + 2.0*k3v2.dtheta + k4v2.dtheta) / 6.0;
            state.omega1 += dt * (k1v1.domega + 2.0*k2v1.domega + 2.0*k3v1.domega + k4v1.domega) / 6.0;
            state.omega2 += dt * (k1v2.domega + 2.0*k2v2.domega + 2.0*k3v2.domega + k4v2.domega) / 6.0;
        }
    });
}

#[wasm_bindgen]
pub fn create_double_pendulum(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    STATE.with(|s| {
        *s.borrow_mut() = Some(State {
            theta1: 2.0, theta2: 2.5, omega1: 0.0, omega2: 0.0,
            trail: Vec::with_capacity(500),
        });
    });
    update_double_pendulum(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_double_pendulum(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;
    let cx = wf / 2.0;
    let cy = hf * 0.35;

    for _ in 0..4 { rk4_step(0.008); }

    STATE.with(|s| {
        let mut s = s.borrow_mut();
        if let Some(ref mut state) = *s {
            let scale = hf * 0.18;
            let x1 = cx + L1 * scale * state.theta1.sin();
            let y1 = cy + L1 * scale * state.theta1.cos();
            let x2 = x1 + L2 * scale * state.theta2.sin();
            let y2 = y1 + L2 * scale * state.theta2.cos();
            state.trail.push((x2, y2));
            if state.trail.len() > 500 { state.trail.remove(0); }
            let trail_len = state.trail.len();

            ctx.set_fill_style(&"rgba(10,10,10,0.15)".into());
            ctx.fill_rect(0.0, 0.0, wf, hf);

            for i in 1..trail_len {
                let alpha = (i as f64 / trail_len as f64) * 0.6;
                let hue = 180.0 + (i as f64 / trail_len as f64) * 120.0;
                ctx.set_stroke_style(&format!("hsla({}, 80%, 60%, {})", hue, alpha).into());
                ctx.set_line_width(1.5);
                ctx.begin_path();
                ctx.move_to(state.trail[i - 1].0, state.trail[i - 1].1);
                ctx.line_to(state.trail[i].0, state.trail[i].1);
                ctx.stroke();
            }

            ctx.set_stroke_style(&"rgba(255,255,255,0.5)".into());
            ctx.set_line_width(2.0);
            ctx.begin_path(); ctx.move_to(cx, cy); ctx.line_to(x1, y1); ctx.line_to(x2, y2); ctx.stroke();

            ctx.set_fill_style(&"#fff".into());
            ctx.begin_path(); ctx.arc(cx, cy, 3.0, 0.0, std::f64::consts::TAU).ok(); ctx.fill();

            ctx.set_fill_style(&"#00e5ff".into());
            ctx.begin_path(); ctx.arc(x1, y1, 8.0, 0.0, std::f64::consts::TAU).ok(); ctx.fill();

            ctx.set_fill_style(&"#ff4081".into());
            ctx.begin_path(); ctx.arc(x2, y2, 10.0, 0.0, std::f64::consts::TAU).ok(); ctx.fill();
        }
    });
    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Jos Stam "Stable Fluids" (1999): semi-Lagrangian advection + Jacobi-iterated
/// diffusion/projection on a 64x64 grid (N+2 with borders). Smoke (density)
/// is injected at the lower-center and advected upward.

const N: usize = 64;
const SZ: usize = N + 2;
const DT: f64 = 0.1;
const VISC: f64 = 0.0001;
const DIFF: f64 = 0.0001;

struct FluidState {
    u: Vec<f64>,
    v: Vec<f64>,
    u0: Vec<f64>,
    v0: Vec<f64>,
    dens: Vec<f64>,
    dens0: Vec<f64>,
}

thread_local! {
    static STATE: std::cell::RefCell<FluidState> = std::cell::RefCell::new(FluidState {
        u: vec![0.0; SZ * SZ],
        v: vec![0.0; SZ * SZ],
        u0: vec![0.0; SZ * SZ],
        v0: vec![0.0; SZ * SZ],
        dens: vec![0.0; SZ * SZ],
        dens0: vec![0.0; SZ * SZ],
    });
}

#[inline(always)]
fn ix(i: usize, j: usize) -> usize {
    i + SZ * j
}

fn add_source(x: &mut [f64], s: &[f64], dt: f64) {
    for k in 0..x.len() {
        x[k] += dt * s[k];
    }
}

fn set_bnd(b: i32, x: &mut [f64]) {
    for i in 1..=N {
        x[ix(0, i)] = if b == 1 { -x[ix(1, i)] } else { x[ix(1, i)] };
        x[ix(N + 1, i)] = if b == 1 { -x[ix(N, i)] } else { x[ix(N, i)] };
        x[ix(i, 0)] = if b == 2 { -x[ix(i, 1)] } else { x[ix(i, 1)] };
        x[ix(i, N + 1)] = if b == 2 { -x[ix(i, N)] } else { x[ix(i, N)] };
    }
    x[ix(0, 0)] = 0.5 * (x[ix(1, 0)] + x[ix(0, 1)]);
    x[ix(0, N + 1)] = 0.5 * (x[ix(1, N + 1)] + x[ix(0, N)]);
    x[ix(N + 1, 0)] = 0.5 * (x[ix(N, 0)] + x[ix(N + 1, 1)]);
    x[ix(N + 1, N + 1)] = 0.5 * (x[ix(N, N + 1)] + x[ix(N + 1, N)]);
}

fn diffuse(b: i32, x: &mut [f64], x0: &[f64], diff: f64, dt: f64, iters: usize) {
    let a = dt * diff * (N as f64) * (N as f64);
    for _ in 0..iters {
        for j in 1..=N {
            for i in 1..=N {
                x[ix(i, j)] = (x0[ix(i, j)]
                    + a * (x[ix(i - 1, j)] + x[ix(i + 1, j)] + x[ix(i, j - 1)] + x[ix(i, j + 1)]))
                    / (1.0 + 4.0 * a);
            }
        }
        set_bnd(b, x);
    }
}

fn advect(b: i32, d: &mut [f64], d0: &[f64], u: &[f64], v: &[f64], dt: f64) {
    let dt0 = dt * (N as f64);
    let nf = N as f64;
    for j in 1..=N {
        for i in 1..=N {
            let mut x = i as f64 - dt0 * u[ix(i, j)];
            let mut y = j as f64 - dt0 * v[ix(i, j)];
            if x < 0.5 {
                x = 0.5;
            }
            if x > nf + 0.5 {
                x = nf + 0.5;
            }
            if y < 0.5 {
                y = 0.5;
            }
            if y > nf + 0.5 {
                y = nf + 0.5;
            }
            let i0 = x.floor();
            let i1 = i0 + 1.0;
            let j0 = y.floor();
            let j1 = j0 + 1.0;
            let s1 = x - i0;
            let s0 = 1.0 - s1;
            let t1 = y - j0;
            let t0 = 1.0 - t1;
            let i0i = i0 as usize;
            let i1i = i1 as usize;
            let j0i = j0 as usize;
            let j1i = j1 as usize;
            d[ix(i, j)] = s0
                * (t0 * d0[ix(i0i, j0i)] + t1 * d0[ix(i0i, j1i)])
                + s1 * (t0 * d0[ix(i1i, j0i)] + t1 * d0[ix(i1i, j1i)]);
        }
    }
    set_bnd(b, d);
}

fn project(u: &mut [f64], v: &mut [f64], p: &mut [f64], div: &mut [f64]) {
    let h = 1.0 / N as f64;
    for j in 1..=N {
        for i in 1..=N {
            div[ix(i, j)] = -0.5
                * h
                * (u[ix(i + 1, j)] - u[ix(i - 1, j)] + v[ix(i, j + 1)] - v[ix(i, j - 1)]);
            p[ix(i, j)] = 0.0;
        }
    }
    set_bnd(0, div);
    set_bnd(0, p);
    for _ in 0..8 {
        for j in 1..=N {
            for i in 1..=N {
                p[ix(i, j)] = (div[ix(i, j)]
                    + p[ix(i - 1, j)]
                    + p[ix(i + 1, j)]
                    + p[ix(i, j - 1)]
                    + p[ix(i, j + 1)])
                    / 4.0;
            }
        }
        set_bnd(0, p);
    }
    for j in 1..=N {
        for i in 1..=N {
            u[ix(i, j)] -= 0.5 * (p[ix(i + 1, j)] - p[ix(i - 1, j)]) / h;
            v[ix(i, j)] -= 0.5 * (p[ix(i, j + 1)] - p[ix(i, j - 1)]) / h;
        }
    }
    set_bnd(1, u);
    set_bnd(2, v);
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
pub fn create_fluids(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
        for k in 0..SZ * SZ {
            s.u[k] = 0.0;
            s.v[k] = 0.0;
            s.u0[k] = 0.0;
            s.v0[k] = 0.0;
            s.dens[k] = 0.0;
            s.dens0[k] = 0.0;
        }
    });
    update_fluids(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_fluids(canvas_id: &str, w: u32, h: u32, time: f64) -> Result<(), JsValue> {
    let ctx = get_ctx(canvas_id)?;
    let wf = w as f64;
    let hf = h as f64;

    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();

        // Reset source buffers, then inject smoke at lower-center (rising + sway).
        for k in 0..SZ * SZ {
            s.u0[k] = 0.0;
            s.v0[k] = 0.0;
            s.dens0[k] = 0.0;
        }
        let sx = (N as f64 / 2.0 + (time * 1.5).sin() * (N as f64 * 0.18)).round() as i64;
        let sy = N as i64 - 6;
        for dj in -1..=1_i64 {
            for di in -1..=1_i64 {
                let i = sx + di;
                let j = sy + dj;
                if i >= 1 && (i as usize) <= N && j >= 1 && (j as usize) <= N {
                    let idx = ix(i as usize, j as usize);
                    s.v0[idx] = -6.0; // upward
                    s.u0[idx] = (time * 2.0).cos() * 3.0; // horizontal sway
                    s.dens0[idx] = 100.0;
                }
            }
        }

        // Velocity step.
        add_source(&mut s.u, &s.u0, DT);
        add_source(&mut s.v, &s.v0, DT);
        std::mem::swap(&mut s.u, &mut s.u0);
        diffuse(1, &mut s.u, &s.u0, VISC, DT, 4);
        std::mem::swap(&mut s.v, &mut s.v0);
        diffuse(2, &mut s.v, &s.v0, VISC, DT, 4);
        project(&mut s.u, &mut s.v, &mut s.u0, &mut s.v0);
        std::mem::swap(&mut s.u, &mut s.u0);
        std::mem::swap(&mut s.v, &mut s.v0);
        advect(1, &mut s.u, &s.u0, &s.u0, &s.v0, DT);
        advect(2, &mut s.v, &s.v0, &s.u0, &s.v0, DT);
        project(&mut s.u, &mut s.v, &mut s.u0, &mut s.v0);

        // Density step.
        add_source(&mut s.dens, &s.dens0, DT);
        std::mem::swap(&mut s.dens, &mut s.dens0);
        diffuse(0, &mut s.dens, &s.dens0, DIFF, DT, 4);
        std::mem::swap(&mut s.dens, &mut s.dens0);
        advect(0, &mut s.dens, &s.dens0, &s.u, &s.v, DT);

        // Dissipation.
        for d in s.dens.iter_mut() {
            *d *= 0.99;
        }

        // Render density: blue -> cyan -> white.
        let dens = s.dens.clone();
        let cw = wf / SZ as f64;
        let ch = hf / SZ as f64;
        ctx.set_fill_style(&"#04060c".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);
        for j in 0..SZ {
            for i in 0..SZ {
                let d = dens[ix(i, j)];
                if d <= 0.01 {
                    continue;
                }
                let t = 1.0 - (-d / 40.0).exp();
                let r = (255.0 * t * t).min(255.0) as u32;
                let g = (255.0 * t.sqrt()).min(255.0) as u32;
                let b = (255.0 * (0.35 + 0.65 * t)).min(255.0) as u32;
                ctx.set_fill_style(&format!("rgb({},{},{})", r, g, b).into());
                ctx.fill_rect(i as f64 * cw, j as f64 * ch, cw + 1.0, ch + 1.0);
            }
        }
    });

    Ok(())
}

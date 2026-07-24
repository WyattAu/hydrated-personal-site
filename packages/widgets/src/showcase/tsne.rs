use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// t-SNE on synthetic 6D data (3 Gaussian clusters). High-D affinities p_ij are
/// precomputed; low-D embedding evolves via momentum gradient descent.
/// Embedding initialized by a lightweight PCA (power iteration on covariance).

const ND: usize = 6;
const NP: usize = 90;
const SIGMA: f64 = 3.0;
const LR: f64 = 50.0;
const MOMENTUM: f64 = 0.5;

struct TsneState {
    hi: Vec<f64>,     // NP*ND high-D points (fixed)
    labels: [u8; NP], // cluster id per point
    y: Vec<f64>,      // NP*2 embedding (evolving)
    yvel: Vec<f64>,   // NP*2 momentum velocities
    p: Vec<f64>,      // NP*NP high-D affinities (fixed)
    iter: usize,
}

thread_local! {
    static STATE: std::cell::RefCell<TsneState> = std::cell::RefCell::new(TsneState {
        hi: vec![0.0; NP * ND],
        labels: [0; NP],
        y: vec![0.0; NP * 2],
        yvel: vec![0.0; NP * 2],
        p: vec![0.0; NP * NP],
        iter: 0,
    });
}

fn lcg(state: &mut u64) -> f64 {
    *state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    ((*state >> 33) as f64) / (1u64 << 31) as f64
}

fn gauss(state: &mut u64) -> f64 {
    let u1 = lcg(state).max(1e-12);
    let u2 = lcg(state);
    let r = (-2.0 * u1.ln()).sqrt();
    let th = u2 * std::f64::consts::TAU;
    r * th.cos()
}

fn matvec6(cov: &[f64], v: &[f64; 6]) -> [f64; 6] {
    let mut out = [0.0; 6];
    for i in 0..6 {
        let mut acc = 0.0;
        for j in 0..6 {
            acc += cov[i * 6 + j] * v[j];
        }
        out[i] = acc;
    }
    out
}

fn norm6(v: &[f64; 6]) -> f64 {
    let mut s = 0.0;
    for d in 0..6 {
        s += v[d] * v[d];
    }
    s.sqrt().max(1e-12)
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

fn build(state: &mut TsneState) {
    let mut rng = 98765u64;
    let centers: [[f64; ND]; 3] = [
        [5.0, 5.0, 5.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 5.0, 5.0, 5.0],
        [3.0, 0.0, 3.0, 0.0, 3.0, 0.0],
    ];
    for i in 0..NP {
        let c = i % 3;
        state.labels[i] = c as u8;
        for d in 0..ND {
            state.hi[i * ND + d] = centers[c][d] + gauss(&mut rng) * 0.8;
        }
    }

    // High-D affinities p_ij, then symmetrize + normalize.
    let two_sigma_sq = 2.0 * SIGMA * SIGMA;
    for i in 0..NP {
        for j in 0..NP {
            if i == j {
                state.p[i * NP + j] = 0.0;
                continue;
            }
            let mut d2 = 0.0;
            for d in 0..ND {
                let diff = state.hi[i * ND + d] - state.hi[j * ND + d];
                d2 += diff * diff;
            }
            state.p[i * NP + j] = (-d2 / two_sigma_sq).exp();
        }
    }
    let mut sum = 0.0;
    for i in 0..NP {
        for j in 0..NP {
            if i != j {
                let v = (state.p[i * NP + j] + state.p[j * NP + i]) / (2.0 * NP as f64);
                state.p[i * NP + j] = v;
                sum += v;
            }
        }
    }
    for k in 0..NP * NP {
        state.p[k] /= sum.max(1e-12);
    }

    // PCA-like init via power iteration on the covariance.
    let mut mean = [0.0; ND];
    for i in 0..NP {
        for d in 0..ND {
            mean[d] += state.hi[i * ND + d];
        }
    }
    for d in 0..ND {
        mean[d] /= NP as f64;
    }
    let mut cov = [0.0; ND * ND];
    for a in 0..ND {
        for b in 0..ND {
            let mut acc = 0.0;
            for i in 0..NP {
                acc += (state.hi[i * ND + a] - mean[a]) * (state.hi[i * ND + b] - mean[b]);
            }
            cov[a * ND + b] = acc / NP as f64;
        }
    }
    let mut v1 = [1.0; 6];
    for _ in 0..40 {
        v1 = matvec6(&cov, &v1);
        let n = norm6(&v1);
        for d in 0..6 {
            v1[d] /= n;
        }
    }
    let mv1 = matvec6(&cov, &v1);
    let lam1: f64 = (0..6).map(|d| mv1[d] * v1[d]).sum();
    let mut cov2 = [0.0; 36];
    for a in 0..6 {
        for b in 0..6 {
            cov2[a * 6 + b] = cov[a * 6 + b] - lam1 * v1[a] * v1[b];
        }
    }
    let mut v2 = [0.0, 1.0, 0.0, 0.0, 0.0, 0.0];
    for _ in 0..40 {
        v2 = matvec6(&cov2, &v2);
        let n = norm6(&v2);
        for d in 0..6 {
            v2[d] /= n;
        }
    }
    for i in 0..NP {
        let mut a = 0.0;
        let mut b = 0.0;
        for d in 0..6 {
            let xv = state.hi[i * 6 + d] - mean[d];
            a += xv * v1[d];
            b += xv * v2[d];
        }
        state.y[i * 2] = a * 0.01;
        state.y[i * 2 + 1] = b * 0.01;
    }
    for k in 0..NP * 2 {
        state.yvel[k] = 0.0;
    }
    state.iter = 0;
}

#[wasm_bindgen]
pub fn create_tsne(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
        build(&mut cell.borrow_mut());
    });
    update_tsne(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_tsne(canvas_id: &str, w: u32, h: u32, _time: f64) -> Result<(), JsValue> {
    let ctx = get_ctx(canvas_id)?;
    let wf = w as f64;
    let hf = h as f64;

    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();

        // Two gradient steps per frame.
        let mut q = vec![0.0; NP * NP];
        let mut grad = vec![0.0; NP * 2];
        for _ in 0..2 {
            // Low-D affinities q_ij = (1+dist2)^-1 / Z.
            let mut z = 0.0;
            for i in 0..NP {
                for j in (i + 1)..NP {
                    let dx = s.y[i * 2] - s.y[j * 2];
                    let dy = s.y[i * 2 + 1] - s.y[j * 2 + 1];
                    let qij = 1.0 / (1.0 + dx * dx + dy * dy);
                    q[i * NP + j] = qij;
                    q[j * NP + i] = qij;
                    z += 2.0 * qij;
                }
            }
            for k in 0..NP * NP {
                q[k] /= z.max(1e-12);
            }

            // Gradient: dC/dy_i = 4 sum_j (p_ij - q_ij)(y_i - y_j)(1+dist2)^-1.
            for v in grad.iter_mut() {
                *v = 0.0;
            }
            for i in 0..NP {
                for j in 0..NP {
                    if i == j {
                        continue;
                    }
                    let dx = s.y[i * 2] - s.y[j * 2];
                    let dy = s.y[i * 2 + 1] - s.y[j * 2 + 1];
                    let dist2 = dx * dx + dy * dy;
                    let mult = 4.0 * (s.p[i * NP + j] - q[i * NP + j]) / (1.0 + dist2);
                    grad[i * 2] += mult * dx;
                    grad[i * 2 + 1] += mult * dy;
                }
            }
            for i in 0..NP {
                s.yvel[i * 2] = MOMENTUM * s.yvel[i * 2] - LR * grad[i * 2];
                s.yvel[i * 2 + 1] = MOMENTUM * s.yvel[i * 2 + 1] - LR * grad[i * 2 + 1];
                s.y[i * 2] += s.yvel[i * 2];
                s.y[i * 2 + 1] += s.yvel[i * 2 + 1];
            }
            s.iter += 1;
        }

        // KL divergence (display only).
        let mut kl = 0.0;
        {
            let mut z = 0.0;
            let mut ql = vec![0.0; NP * NP];
            for i in 0..NP {
                for j in (i + 1)..NP {
                    let dx = s.y[i * 2] - s.y[j * 2];
                    let dy = s.y[i * 2 + 1] - s.y[j * 2 + 1];
                    let qij = 1.0 / (1.0 + dx * dx + dy * dy);
                    ql[i * NP + j] = qij;
                    ql[j * NP + i] = qij;
                    z += 2.0 * qij;
                }
            }
            for k in 0..NP * NP {
                ql[k] /= z.max(1e-12);
            }
            for i in 0..NP {
                for j in 0..NP {
                    if i != j && s.p[i * NP + j] > 1e-12 {
                        kl += s.p[i * NP + j] * (s.p[i * NP + j] / ql[i * NP + j].max(1e-12)).ln();
                    }
                }
            }
        }

        // --- Render ---
        ctx.set_fill_style(&"#0a0a0a".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);

        // Auto-scale embedding to canvas.
        let pad = 24.0;
        let mut minx = f64::MAX;
        let mut maxx = f64::MIN;
        let mut miny = f64::MAX;
        let mut maxy = f64::MIN;
        for i in 0..NP {
            minx = minx.min(s.y[i * 2]);
            maxx = maxx.max(s.y[i * 2]);
            miny = miny.min(s.y[i * 2 + 1]);
            maxy = maxy.max(s.y[i * 2 + 1]);
        }
        let spanx = (maxx - minx).max(1e-6);
        let spany = (maxy - miny).max(1e-6);
        let scale = ((wf - 2.0 * pad) / spanx).min((hf - 2.0 * pad) / spany);
        let ox = (wf - spanx * scale) / 2.0;
        let oy = (hf - spany * scale) / 2.0;
        let px = |i: usize| ox + (s.y[i * 2] - minx) * scale;
        let py = |i: usize| oy + (s.y[i * 2 + 1] - miny) * scale;

        let colors = ["#00e5ff", "#ff4081", "#4caf50"];

        // Nearest-neighbor links (in 2D).
        ctx.set_line_width(0.6);
        for i in 0..NP {
            let mut best = i;
            let mut bd = f64::MAX;
            for j in 0..NP {
                if i == j {
                    continue;
                }
                let dx = s.y[i * 2] - s.y[j * 2];
                let dy = s.y[i * 2 + 1] - s.y[j * 2 + 1];
                let d = dx * dx + dy * dy;
                if d < bd {
                    bd = d;
                    best = j;
                }
            }
            if best != i {
                let c = colors[s.labels[i] as usize];
                ctx.set_stroke_style(&format!("{}22", c).into());
                ctx.begin_path();
                ctx.move_to(px(i), py(i));
                ctx.line_to(px(best), py(best));
                ctx.stroke();
            }
        }

        // Points.
        for i in 0..NP {
            let c = colors[s.labels[i] as usize];
            ctx.set_fill_style(&c.into());
            ctx.begin_path();
            ctx.arc(px(i), py(i), 3.5, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }

        ctx.set_fill_style(&"rgba(0,229,255,0.9)".into());
        ctx.set_font("10px monospace");
        ctx.fill_text(&format!("Iteration {} | KL divergence: {:.4}", s.iter, kl), 10.0, 16.0).ok();
        ctx.set_fill_style(&"rgba(255,255,255,0.45)".into());
        ctx.fill_text("t-SNE  90 pts x 6D -> 2D  (3 clusters)", 10.0, 30.0).ok();
    });

    Ok(())
}

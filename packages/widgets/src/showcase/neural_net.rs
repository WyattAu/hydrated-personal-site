use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// 2-4-1 sigmoid MLP learning XOR via full-batch backprop with MSE loss.
/// Persistent weights/biases/loss-history across frames.

const LR: f64 = 0.5;
const LOSS_HIST: usize = 200;

fn sigmoid(s: f64) -> f64 {
    1.0 / (1.0 + (-s).exp())
}

struct NNState {
    w1: Vec<f64>, // [hidden][input] = 4*2
    b1: Vec<f64>, // 4
    w2: Vec<f64>, // [output][hidden] = 1*4
    b2: f64,      // 1
    epoch: usize,
    loss_hist: Vec<f64>,
}

// Deterministic LCG so results are reproducible.
fn lcg(state: &mut u64) -> f64 {
    *state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    ((*state >> 33) as f64) / (1u64 << 31) as f64
}

thread_local! {
    static STATE: std::cell::RefCell<NNState> = std::cell::RefCell::new(NNState {
        w1: vec![0.0; 8],
        b1: vec![0.0; 4],
        w2: vec![0.0; 4],
        b2: 0.0,
        epoch: 0,
        loss_hist: Vec::new(),
    });
}

const SAMPLES: [(f64, f64); 4] = [(0.0, 0.0), (0.0, 1.0), (1.0, 0.0), (1.0, 1.0)];
const TARGETS: [f64; 4] = [0.0, 1.0, 1.0, 0.0];

fn forward(
    x0: f64,
    x1: f64,
    w1: &[f64],
    b1: &[f64],
    w2: &[f64],
    b2: f64,
) -> ([f64; 4], f64) {
    let mut h = [0.0; 4];
    for j in 0..4 {
        h[j] = sigmoid(w1[j * 2] * x0 + w1[j * 2 + 1] * x1 + b1[j]);
    }
    let mut o_pre = b2;
    for j in 0..4 {
        o_pre += w2[j] * h[j];
    }
    (h, sigmoid(o_pre))
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
pub fn create_neural_net(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
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
        let mut rng = 42u64;
        for j in 0..4 {
            s.b1[j] = 0.0;
            s.w1[j * 2] = (lcg(&mut rng) - 0.5) * 1.0;
            s.w1[j * 2 + 1] = (lcg(&mut rng) - 0.5) * 1.0;
            s.w2[j] = (lcg(&mut rng) - 0.5) * 1.0;
        }
        s.b2 = 0.0;
        s.epoch = 0;
        s.loss_hist.clear();
    });
    update_neural_net(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_neural_net(canvas_id: &str, w: u32, h: u32, _time: f64) -> Result<(), JsValue> {
    let ctx = get_ctx(canvas_id)?;
    let wf = w as f64;
    let hf = h as f64;

    STATE.with(|cell| {
        let s = &mut *cell.borrow_mut();

        // --- One full-batch backprop epoch ---
        let mut dw1 = [0.0; 8];
        let mut db1 = [0.0; 4];
        let mut dw2 = [0.0; 4];
        let mut db2 = 0.0;
        let mut loss = 0.0;

        for k in 0..4 {
            let (x0, x1) = SAMPLES[k];
            let t = TARGETS[k];
            let (h, o) = forward(x0, x1, &s.w1, &s.b1, &s.w2, s.b2);
            loss += (o - t) * (o - t);
            let delta_o = (o - t) * o * (1.0 - o);
            for j in 0..4 {
                dw2[j] += delta_o * h[j];
                let delta_h = s.w2[j] * delta_o * h[j] * (1.0 - h[j]);
                db1[j] += delta_h;
                dw1[j * 2] += delta_h * x0;
                dw1[j * 2 + 1] += delta_h * x1;
            }
            db2 += delta_o;
        }
        loss /= 4.0;

        for j in 0..4 {
            s.w2[j] -= LR * dw2[j] / 4.0;
            s.b1[j] -= LR * db1[j] / 4.0;
            s.w1[j * 2] -= LR * dw1[j * 2] / 4.0;
            s.w1[j * 2 + 1] -= LR * dw1[j * 2 + 1] / 4.0;
        }
        s.b2 -= LR * db2 / 4.0;
        s.epoch += 1;
        s.loss_hist.push(loss);
        if s.loss_hist.len() > LOSS_HIST {
            s.loss_hist.remove(0);
        }

        // --- Render ---
        ctx.set_fill_style(&"#0a0a0a".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);

        // Network diagram on the left half.
        let col_x = [wf * 0.10, wf * 0.24, wf * 0.40];
        let in_y = [hf * 0.38, hf * 0.62];
        let hid_y = [hf * 0.20, hf * 0.40, hf * 0.60, hf * 0.80];
        let out_y = [hf * 0.50];

        // Display activations for input [1,1].
        let (h_disp, o_disp) = forward(1.0, 1.0, &s.w1, &s.b1, &s.w2, s.b2);

        // Input -> hidden connections.
        for j in 0..4 {
            for i in 0..2 {
                let w = s.w1[j * 2 + i];
                let th = (w.abs() * 3.0).max(0.5).min(6.0);
                let color = if w >= 0.0 {
                    format!("rgba(0, 229, 255, {})", (w.abs() * 0.6).min(0.9))
                } else {
                    format!("rgba(255, 64, 129, {})", (w.abs() * 0.6).min(0.9))
                };
                ctx.set_stroke_style(&color.into());
                ctx.set_line_width(th);
                ctx.begin_path();
                ctx.move_to(col_x[0], in_y[i]);
                ctx.line_to(col_x[1], hid_y[j]);
                ctx.stroke();
            }
        }
        // Hidden -> output connections.
        for j in 0..4 {
            let w = s.w2[j];
            let th = (w.abs() * 3.0).max(0.5).min(6.0);
            let color = if w >= 0.0 {
                format!("rgba(0, 229, 255, {})", (w.abs() * 0.6).min(0.9))
            } else {
                format!("rgba(255, 64, 129, {})", (w.abs() * 0.6).min(0.9))
            };
            ctx.set_stroke_style(&color.into());
            ctx.set_line_width(th);
            ctx.begin_path();
            ctx.move_to(col_x[1], hid_y[j]);
            ctx.line_to(col_x[2], out_y[0]);
            ctx.stroke();
        }

        // Nodes.
        let draw_node = |x: f64, y: f64, act: f64, color: &str| {
            let r = 4.0 + act * 11.0;
            ctx.set_fill_style(&color.into());
            ctx.begin_path();
            ctx.arc(x, y, r, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        };
        draw_node(col_x[0], in_y[0], 1.0, "#7c4dff");
        draw_node(col_x[0], in_y[1], 1.0, "#7c4dff");
        for j in 0..4 {
            draw_node(col_x[1], hid_y[j], h_disp[j], "#00e5ff");
        }
        draw_node(col_x[2], out_y[0], o_disp, "#ff4081");

        // Loss curve on the right.
        let lc_x0 = wf * 0.55;
        let lc_x1 = wf - 12.0;
        let lc_y0 = hf * 0.12;
        let lc_y1 = hf * 0.70;
        ctx.set_stroke_style(&"rgba(255,255,255,0.15)".into());
        ctx.set_line_width(1.0);
        ctx.stroke_rect(lc_x0, lc_y0, lc_x1 - lc_x0, lc_y1 - lc_y0);
        let n = s.loss_hist.len();
        if n > 1 {
            let max_loss = s.loss_hist.iter().cloned().fold(0.0_f64, f64::max).max(1e-9);
            ctx.set_stroke_style(&"#00e5ff".into());
            ctx.set_line_width(1.5);
            ctx.begin_path();
            for (i, &l) in s.loss_hist.iter().enumerate() {
                let px = lc_x0 + (i as f64 / (n - 1) as f64) * (lc_x1 - lc_x0);
                let py = lc_y1 - (l / max_loss) * (lc_y1 - lc_y0);
                if i == 0 {
                    ctx.move_to(px, py);
                } else {
                    ctx.line_to(px, py);
                }
            }
            ctx.stroke();
        }
        ctx.set_fill_style(&"rgba(255,255,255,0.5)".into());
        ctx.set_font("10px monospace");
        ctx.fill_text("loss (MSE)", lc_x0, lc_y0 - 4.0).ok();

        // Header + outputs.
        let mut line = String::from("");
        for k in 0..4 {
            let (_, o) = forward(SAMPLES[k].0, SAMPLES[k].1, &s.w1, &s.b1, &s.w2, s.b2);
            line.push_str(&format!(
                "[{:.0},{:.0}]-> {:.2}  ",
                SAMPLES[k].0, SAMPLES[k].1, o
            ));
        }
        ctx.set_fill_style(&"rgba(0,229,255,0.95)".into());
        ctx.fill_text(
            &format!("Epoch {} | Loss: {:.5}", s.epoch, loss),
            10.0,
            16.0,
        )
        .ok();
        ctx.set_fill_style(&"rgba(255,255,255,0.7)".into());
        ctx.fill_text(&line, 10.0, hf - 10.0).ok();
    });

    Ok(())
}

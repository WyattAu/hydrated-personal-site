use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// K-Means clustering with persistent state and animated convergence.
/// Generates 120 points in 4 clusters, runs one Lloyd's iteration per frame.

struct KmState {
    points: Vec<(f64, f64, usize)>, // (x, y, assigned_cluster)
    centroids: Vec<(f64, f64)>,
    iteration: usize,
    converged: bool,
}

const K: usize = 4;
const N_POINTS: usize = 120;

thread_local! {
    static STATE: std::cell::RefCell<KmState> = std::cell::RefCell::new(KmState {
        points: Vec::new(),
        centroids: Vec::new(),
        iteration: 0,
        converged: false,
    });
}

fn xorshift(state: &mut u64) -> f64 {
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    ((*state >> 11) as f64) / (1u64 << 53) as f64
}

fn init_state(w: f64, h: f64) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.points.clear();
        s.iteration = 0;
        s.converged = false;

        let mut rng = 12345u64;
        let centers = [
            (w * 0.25, h * 0.3),
            (w * 0.75, h * 0.25),
            (w * 0.3, h * 0.75),
            (w * 0.7, h * 0.7),
        ];

        for i in 0..N_POINTS {
            let c = i % K;
            let angle = xorshift(&mut rng) * std::f64::consts::TAU;
            let radius = xorshift(&mut rng) * 50.0 + xorshift(&mut rng) * 20.0;
            let px = centers[c].0 + angle.cos() * radius;
            let py = centers[c].1 + angle.sin() * radius;
            s.points.push((px, py, 0));
        }

        // Initialize centroids at random positions (not at cluster centers)
        s.centroids.clear();
        for _ in 0..K {
            s.centroids.push((xorshift(&mut rng) * w, xorshift(&mut rng) * h));
        }
    });
}

const COLORS: [&str; 4] = ["#00e5ff", "#ff4081", "#4caf50", "#ff9800"];

#[wasm_bindgen]
pub fn create_kmeans(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    init_state(w as f64, h as f64);
    update_kmeans(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_kmeans(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
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

        if !s.converged {
            let mut changed = false;

            // Assignment step: read centroids first to avoid borrow conflict
            let centroids_snapshot: Vec<(f64, f64)> = s.centroids.clone();
            for p in &mut s.points {
                let mut best = 0;
                let mut best_dist = f64::MAX;
                for (ci, c) in centroids_snapshot.iter().enumerate() {
                    let d = (p.0 - c.0).powi(2) + (p.1 - c.1).powi(2);
                    if d < best_dist {
                        best_dist = d;
                        best = ci;
                    }
                }
                if p.2 != best {
                    p.2 = best;
                    changed = true;
                }
            }

            // Update step using point positions
            let pts_snapshot: Vec<(f64, f64, usize)> = s.points.iter().map(|p| (p.0, p.1, p.2)).collect();
            for ci in 0..K {
                let assigned: Vec<_> = pts_snapshot.iter().filter(|(_, _, a)| *a == ci).collect();
                if !assigned.is_empty() {
                    let new_x: f64 = assigned.iter().map(|c| c.0).sum::<f64>() / assigned.len() as f64;
                    let new_y: f64 = assigned.iter().map(|c| c.1).sum::<f64>() / assigned.len() as f64;
                    let old = s.centroids[ci];
                    if (new_x - old.0).abs() > 0.5 || (new_y - old.1).abs() > 0.5 {
                        changed = true;
                    }
                    s.centroids[ci] = (new_x, new_y);
                }
            }

            s.iteration += 1;
            if !changed || s.iteration > 50 {
                s.converged = true;
            }
        }

        // Draw points colored by cluster
        for p in &s.points {
            let color = COLORS[p.2 % K];
            ctx.set_fill_style(&color.into());
            ctx.begin_path();
            ctx.arc(p.0, p.1, 3.0, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }

        // Draw centroid lines (each point to its centroid)
        ctx.set_global_alpha(0.08);
        for p in &s.points {
            let c = s.centroids[p.2 % K];
            ctx.set_stroke_style(&COLORS[p.2 % K].into());
            ctx.set_line_width(0.5);
            ctx.begin_path();
            ctx.move_to(p.0, p.1);
            ctx.line_to(c.0, c.1);
            ctx.stroke();
        }
        ctx.set_global_alpha(1.0);

        // Draw centroids
        for (ci, c) in s.centroids.iter().enumerate() {
            // Outer ring
            ctx.set_stroke_style(&COLORS[ci % K].into());
            ctx.set_line_width(2.0);
            ctx.begin_path();
            ctx.arc(c.0, c.1, 12.0, 0.0, std::f64::consts::TAU).ok();
            ctx.stroke();
            // Cross
            ctx.begin_path();
            ctx.move_to(c.0 - 6.0, c.1); ctx.line_to(c.0 + 6.0, c.1);
            ctx.move_to(c.0, c.1 - 6.0); ctx.line_to(c.0, c.1 + 6.0);
            ctx.stroke();
        }

        // Info
        ctx.set_fill_style(&"rgba(255,255,255,0.5)".into());
        ctx.set_font("10px monospace");
        let status = if s.converged { "CONVERGED" } else { "RUNNING" };
        ctx.fill_text(&format!("Iteration: {} | K={} | {}", s.iteration, K, status), 8.0, 16.0).ok();
        ctx.fill_text(&format!("Points: {}", N_POINTS), 8.0, 30.0).ok();

        // Auto-reset after convergence + delay
        if s.converged && s.iteration > 60 {
            init_state(wf, hf);
        }
    });

    Ok(())
}

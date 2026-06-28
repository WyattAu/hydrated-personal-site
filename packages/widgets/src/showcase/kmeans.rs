use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_kmeans(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"#0a0a0a".into()); ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    Ok(())
}

#[wasm_bindgen]
pub fn update_kmeans(canvas_id: &str, w: u32, h: u32, _params: &str) -> Result<(), JsValue> {
    let wf = w as f64; let hf = h as f64;
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"#0a0a0a".into()); ctx.fill_rect(0.0, 0.0, wf, hf);

    // Generate 100 points in 3 clusters
    let n_points = 100;
    let mut points: Vec<(f64, f64, usize)> = Vec::with_capacity(n_points);
    let cluster_centers = [(wf * 0.3, hf * 0.3), (wf * 0.7, hf * 0.3), (wf * 0.5, hf * 0.7)];
    for i in 0..n_points {
        let c = i % 3;
        let cx = cluster_centers[c].0 + (js_sys::Math::random() - 0.5) * wf * 0.2;
        let cy = cluster_centers[c].1 + (js_sys::Math::random() - 0.5) * hf * 0.2;
        points.push((cx, cy, c));
    }

    // K-means with K=3
    let k = 3;
    let mut centroids: Vec<(f64, f64)> = (0..k).map(|_| (js_sys::Math::random() * wf, js_sys::Math::random() * hf)).collect();
    let colors = ["#00e5ff", "#ff4081", "#4caf50"];

    for _ in 0..10 {
        // Assign
        for p in &mut points {
            let mut best = 0; let mut best_dist = f64::MAX;
            for (ci, c) in centroids.iter().enumerate() {
                let d = (p.0 - c.0).powi(2) + (p.1 - c.1).powi(2);
                if d < best_dist { best_dist = d; best = ci; }
            }
            p.2 = best;
        }
        // Update centroids
        for ci in 0..k {
            let assigned: Vec<_> = points.iter().filter(|p| p.2 == ci).collect();
            if !assigned.is_empty() {
                centroids[ci] = (
                    assigned.iter().map(|p| p.0).sum::<f64>() / assigned.len() as f64,
                    assigned.iter().map(|p| p.1).sum::<f64>() / assigned.len() as f64,
                );
            }
        }
    }

    // Draw points
    for p in &points {
        ctx.set_fill_style(&colors[p.2].into());
        ctx.begin_path();
        ctx.arc(p.0, p.1, 3.0, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }

    // Draw centroids as X marks
    for (ci, c) in centroids.iter().enumerate() {
        ctx.set_stroke_style(&colors[ci].into());
        ctx.set_line_width(2.0);
        ctx.begin_path();
        ctx.move_to(c.0 - 8.0, c.1 - 8.0); ctx.line_to(c.0 + 8.0, c.1 + 8.0);
        ctx.move_to(c.0 - 8.0, c.1 + 8.0); ctx.line_to(c.0 + 8.0, c.1 - 8.0);
        ctx.stroke();
    }
    Ok(())
}

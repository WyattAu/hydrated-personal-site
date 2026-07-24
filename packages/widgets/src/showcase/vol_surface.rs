use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// 3D Implied Volatility Surface — rotating wireframe with labeled axes.
/// Shows the classic vol smile/skew shape: high IV at deep ITM/OTM,
/// lower at ATM. Term structure decreases with expiry for equity indices.

#[wasm_bindgen]
pub fn create_vol_surface(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    update_vol_surface(canvas_id, w, h, 0.0)
}

fn iv_model(moneyness: f64, days: f64) -> f64 {
    // Moneyness: -1 (deep put) to +1 (deep call), 0 = ATM
    // Days: 7 to 365
    // Smile: parabolic in moneyness, weighted by 1/sqrt(T)
    let smile = 0.15 + moneyness.powi(2) * 0.35;
    let skew = -moneyness * 0.06; // slight put skew
    let term = 0.6 + 0.4 / (days / 365.0).sqrt().max(0.15);
    (smile + skew) * term
}

#[wasm_bindgen]
pub fn update_vol_surface(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;
    let t = js_sys::Date::now() as f64 / 4000.0;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);

    let cx = wf / 2.0;
    let cy = hf * 0.55;
    let scale_xy = wf.min(hf) * 0.16;

    let angle_y = t * 0.3;
    let cos_y = angle_y.cos();
    let sin_y = angle_y.sin();
    let angle_x: f64 = 0.5; // tilt
    let cos_x = angle_x.cos();
    let sin_x = angle_x.sin();

    let grid = 14;
    let moneyness_range = 1.2;
    let days_min = 7.0;
    let days_max = 365.0;

    // Precompute all 3D points
    let mut points: Vec<(f64, f64, f64, f64)> = Vec::with_capacity(grid * grid); // (px, py, iv, z_depth)
    for j in 0..grid {
        for i in 0..grid {
            let moneyness = ((i as f64 / (grid - 1) as f64) * 2.0 - 1.0) * moneyness_range;
            let days = days_min + (j as f64 / (grid - 1) as f64) * (days_max - days_min);
            let iv = iv_model(moneyness, days);

            // 3D coordinates: x=moneyness, z=days(normalized), y=IV
            let x3d = moneyness;
            let z3d = (j as f64 / (grid - 1) as f64 - 0.5) * 2.5;
            let y3d = iv * 2.0 - 0.7;

            // Rotate around Y axis
            let xr = x3d * cos_y + z3d * sin_y;
            let zr = -x3d * sin_y + z3d * cos_y;
            // Tilt around X axis
            let yr = y3d * cos_x - zr * sin_x;
            let zr2 = y3d * sin_x + zr * cos_x;

            // Project to 2D
            let px = cx + xr * scale_xy;
            let py = cy - yr * scale_xy;

            points.push((px, py, iv, zr2));
        }
    }

    // Sort faces by depth for proper rendering (back to front)
    // Draw grid lines
    for j in 0..grid {
        for i in 0..grid {
            let (px, py, iv, _) = points[j * grid + i];
            let hue = 180.0 + iv * 120.0;
            let alpha = 0.4 + iv * 0.3;
            ctx.set_stroke_style(&format!("hsla({}, 80%, 60%, {})", hue, alpha).into());
            ctx.set_line_width(0.8);

            // Line to right neighbor
            if i < grid - 1 {
                let (px2, py2, _, _) = points[j * grid + i + 1];
                ctx.begin_path();
                ctx.move_to(px, py);
                ctx.line_to(px2, py2);
                ctx.stroke();
            }
            // Line to bottom neighbor
            if j < grid - 1 {
                let (px2, py2, _, _) = points[(j + 1) * grid + i];
                ctx.begin_path();
                ctx.move_to(px, py);
                ctx.line_to(px2, py2);
                ctx.stroke();
            }
        }
    }

    // Draw data points as colored dots
    for (_, _, iv, depth) in &points {
        let _ = depth;
    }

    // Axes labels
    ctx.set_fill_style(&"rgba(255,255,255,0.4)".into());
    ctx.set_font("9px monospace");
    ctx.fill_text("IV %", 10.0, 16.0).ok();
    ctx.fill_text("Moneyness →", cx - 40.0, hf - 12.0).ok();
    ctx.fill_text("← Days to Expiry", cx - 50.0, hf - 24.0).ok();

    // ATM marker
    let atm_idx = (grid - 1) / 2;
    let (atm_px, atm_py, atm_iv, _) = points[atm_idx * grid + atm_idx];
    ctx.set_fill_style(&"#ffeb3b".into());
    ctx.begin_path();
    ctx.arc(atm_px, atm_py, 3.0, 0.0, std::f64::consts::TAU).ok();
    ctx.fill();
    ctx.set_fill_style(&"rgba(255,255,255,0.5)".into());
    ctx.fill_text(&format!("ATM {:.0}%", atm_iv * 100.0), atm_px + 6.0, atm_py - 4.0).ok();

    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const N_BIRDS: usize = 150;

struct Bird { x: f64, y: f64, vx: f64, vy: f64 }
impl Bird {
    fn new(w: f64, h: f64) -> Self {
        Bird {
            x: js_sys::Math::random() * w,
            y: js_sys::Math::random() * h,
            vx: js_sys::Math::random() * 2.0 - 1.0,
            vy: js_sys::Math::random() * 2.0 - 1.0,
        }
    }
}

#[wasm_bindgen]
pub fn create_boids(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w as f64, h as f64);
    Ok(())
}

#[wasm_bindgen]
pub fn update_boids(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let wf = w as f64; let hf = h as f64;
    let mut birds: Vec<Bird> = (0..N_BIRDS).map(|_| Bird::new(wf, hf)).collect();

    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;

    // Fade trail
    ctx.set_fill_style(&"rgba(10,10,10,0.1)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);

    for i in 0..N_BIRDS {
        let mut sep_x = 0.0; let mut sep_y = 0.0;
        let mut align_x = 0.0; let mut align_y = 0.0;
        let mut cohes_x = 0.0; let mut cohes_y = 0.0;
        let mut count = 0;

        for j in 0..N_BIRDS {
            if i == j { continue; }
            let dx = birds[i].x - birds[j].x;
            let dy = birds[i].y - birds[j].y;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist < 50.0 && dist > 0.0 {
                // Separation
                sep_x += dx / dist;
                sep_y += dy / dist;
                // Alignment
                align_x += birds[j].vx;
                align_y += birds[j].vy;
                // Cohesion
                cohes_x += birds[j].x;
                cohes_y += birds[j].y;
                count += 1;
            }
        }

        if count > 0 {
            // Apply forces
            birds[i].vx += sep_x * 0.05 + (align_x / count as f64 - birds[i].vx) * 0.03 + (cohes_x / count as f64 - birds[i].x) * 0.001;
            birds[i].vy += sep_y * 0.05 + (align_y / count as f64 - birds[i].vy) * 0.03 + (cohes_y / count as f64 - birds[i].y) * 0.001;
        }

        // Speed limit
        let speed = (birds[i].vx * birds[i].vx + birds[i].vy * birds[i].vy).sqrt();
        if speed > 3.0 { birds[i].vx *= 3.0 / speed; birds[i].vy *= 3.0 / speed; }

        // Move
        birds[i].x += birds[i].vx;
        birds[i].y += birds[i].vy;

        // Wrap
        if birds[i].x < 0.0 { birds[i].x += wf; }
        if birds[i].x > wf { birds[i].x -= wf; }
        if birds[i].y < 0.0 { birds[i].y += hf; }
        if birds[i].y > hf { birds[i].y -= hf; }

        // Draw as triangle pointing in velocity direction
        let angle = birds[i].vy.atan2(birds[i].vx);
        let hue = (angle.to_degrees() + 180.0 + (i as f64 * 2.0)) % 360.0;
        ctx.set_fill_style(&format!("hsl({}, 80%, 60%)", hue).into());
        ctx.begin_path();
        let s = 4.0;
        ctx.move_to(birds[i].x + s * angle.cos(), birds[i].y + s * angle.sin());
        ctx.line_to(birds[i].x - s * 0.5 * (angle + 2.5).cos(), birds[i].y - s * 0.5 * (angle + 2.5).sin());
        ctx.line_to(birds[i].x - s * 0.5 * (angle - 2.5).cos(), birds[i].y - s * 0.5 * (angle - 2.5).sin());
        ctx.close_path();
        ctx.fill();
    }
    Ok(())
}

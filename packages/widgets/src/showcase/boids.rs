use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Boids flocking simulation (Reynolds 1987).
/// Persistent state across frames via thread_local.

#[derive(Clone)]
struct Bird { x: f64, y: f64, vx: f64, vy: f64 }

thread_local! {
    static BIRDS: std::cell::RefCell<Vec<Bird>> = std::cell::RefCell::new(Vec::new());
}

fn init_birds(w: f64, h: f64) {
    BIRDS.with(|b| {
        let mut birds = b.borrow_mut();
        birds.clear();
        let mut rng_state = 12345u64;
        for _ in 0..150 {
            rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let rx = ((rng_state >> 33) as f64) / (1u64 << 31) as f64;
            rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let ry = ((rng_state >> 33) as f64) / (1u64 << 31) as f64;
            rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let ra = ((rng_state >> 33) as f64) / (1u64 << 31) as f64;
            birds.push(Bird {
                x: rx * w, y: ry * h,
                vx: (ra - 0.5) * 4.0, vy: ((rx + ry) % 1.0 - 0.5) * 4.0,
            });
        }
    });
}

#[wasm_bindgen]
pub fn create_boids(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    init_birds(w as f64, h as f64);
    update_boids(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_boids(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;

    ctx.set_fill_style(&"rgba(10,10,10,0.1)".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);

    const VISUAL_RANGE: f64 = 40.0;
    const PROTECTED_RANGE: f64 = 12.0;
    const MAX_SPEED: f64 = 4.0;

    BIRDS.with(|birds_cell| {
        let mut birds = birds_cell.borrow_mut();
        let birds = &mut *birds;
        let n = birds.len();
        let mut new_birds = birds.clone();

        for i in 0..n {
            let mut sep_x = 0.0; let mut sep_y = 0.0;
            let mut align_x = 0.0; let mut align_y = 0.0;
            let mut coh_x = 0.0; let mut coh_y = 0.0;
            let mut neighbors = 0usize;
            let mut sep_count = 0usize;

            for j in 0..n {
                if i == j { continue; }
                let dx = birds[i].x - birds[j].x;
                let dy = birds[i].y - birds[j].y;
                let dist = (dx * dx + dy * dy).sqrt();
                if dist < PROTECTED_RANGE {
                    sep_x += dx / (dist + 0.01);
                    sep_y += dy / (dist + 0.01);
                    sep_count += 1;
                }
                if dist < VISUAL_RANGE {
                    align_x += birds[j].vx;
                    align_y += birds[j].vy;
                    coh_x += birds[j].x;
                    coh_y += birds[j].y;
                    neighbors += 1;
                }
            }

            // Separation
            if sep_count > 0 {
                new_birds[i].vx += sep_x * 0.05;
                new_birds[i].vy += sep_y * 0.05;
            }
            // Alignment + Cohesion
            if neighbors > 0 {
                align_x /= neighbors as f64;
                align_y /= neighbors as f64;
                new_birds[i].vx += (align_x - birds[i].vx) * 0.02;
                new_birds[i].vy += (align_y - birds[i].vy) * 0.02;
                coh_x = coh_x / neighbors as f64 - birds[i].x;
                coh_y = coh_y / neighbors as f64 - birds[i].y;
                new_birds[i].vx += coh_x * 0.001;
                new_birds[i].vy += coh_y * 0.001;
            }

            // Speed limit + update position
            let speed = (new_birds[i].vx * new_birds[i].vx + new_birds[i].vy * new_birds[i].vy).sqrt();
            if speed > MAX_SPEED {
                new_birds[i].vx = new_birds[i].vx / speed * MAX_SPEED;
                new_birds[i].vy = new_birds[i].vy / speed * MAX_SPEED;
            }
            new_birds[i].x += new_birds[i].vx;
            new_birds[i].y += new_birds[i].vy;

            // Wrap around
            if new_birds[i].x < 0.0 { new_birds[i].x += wf; }
            if new_birds[i].x >= wf { new_birds[i].x -= wf; }
            if new_birds[i].y < 0.0 { new_birds[i].y += hf; }
            if new_birds[i].y >= hf { new_birds[i].y -= hf; }
        }

        // Draw
        for b in &new_birds {
            let angle = b.vy.atan2(b.vx);
            ctx.set_fill_style(&"rgba(0,229,255,0.7)".into());
            ctx.begin_path();
            ctx.move_to(b.x + 6.0 * angle.cos(), b.y + 6.0 * angle.sin());
            ctx.line_to(b.x - 4.0 * (angle + 2.5).cos(), b.y - 4.0 * (angle + 2.5).sin());
            ctx.line_to(b.x - 4.0 * (angle - 2.5).cos(), b.y - 4.0 * (angle - 2.5).sin());
            ctx.close_path();
            ctx.fill();
        }

        *birds = new_birds;
    });

    Ok(())
}

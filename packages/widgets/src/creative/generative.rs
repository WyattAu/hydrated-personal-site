use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Generative flow-field art with smooth interpolated noise.
/// Persistent particles trace evolving paths through a static vector field.

const PI: f64 = std::f64::consts::PI;
const N_PARTICLES: usize = 80;

struct Particle { x: f64, y: f64, age: usize, hue: f64 }

thread_local! {
    static PARTICLES: std::cell::RefCell<Vec<Particle>> = std::cell::RefCell::new(Vec::new());
    static FADE: std::cell::Cell<bool> = std::cell::Cell::new(false);
}

fn hash(ix: f64, iy: f64) -> f64 {
    let n = (ix * 12.9898 + iy * 78.233).sin() * 43758.5453;
    n - n.floor()
}

fn smooth_noise(x: f64, y: f64) -> f64 {
    let xi = x.floor();
    let yi = y.floor();
    let xf = x - xi;
    let yf = y - yi;
    let fade = |t: f64| t * t * (3.0 - 2.0 * t);
    let sx = fade(xf);
    let sy = fade(yf);
    let a = hash(xi, yi);
    let b = hash(xi + 1.0, yi);
    let c = hash(xi, yi + 1.0);
    let d = hash(xi + 1.0, yi + 1.0);
    let top = a + sx * (b - a);
    let bottom = c + sx * (d - c);
    top + sy * (bottom - top)
}

fn init_particles(w: f64, h: f64) {
    PARTICLES.with(|p| {
        let mut particles = p.borrow_mut();
        particles.clear();
        let mut rng = 42u64;
        for _ in 0..N_PARTICLES {
            rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17;
            let rx = ((rng >> 11) as f64 / (1u64 << 53) as f64) * w;
            rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17;
            let ry = ((rng >> 11) as f64 / (1u64 << 53) as f64) * h;
            rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17;
            let hue = 170.0 + ((rng >> 11) as f64 / (1u64 << 53) as f64) * 80.0;
            particles.push(Particle { x: rx, y: ry, age: 0, hue });
        }
    });
}

#[wasm_bindgen]
pub fn create_generative(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
    init_particles(width as f64, height as f64);
    FADE.with(|f| f.set(false));
    update_generative(canvas_id, width, height, 42, 1.0, 100, 0.0)
}

#[wasm_bindgen]
pub fn update_generative(
    canvas_id: &str, width: u32, height: u32,
    _seed: u32, _speed: f64, _density: u32, _time: f64,
) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(width); canvas.set_height(height);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let w = width as f64;
    let h = height as f64;

    // Slight fade for trailing effect
    ctx.set_fill_style(&"rgba(10,10,10,0.04)".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    PARTICLES.with(|p| {
        let mut particles = p.borrow_mut();

        for particle in particles.iter_mut() {
            // Flow field angle from smooth noise
            let nx = particle.x * 0.005;
            let ny = particle.y * 0.005;
            let angle = smooth_noise(nx, ny) * PI * 4.0;

            let step = 2.0;
            let old_x = particle.x;
            let old_y = particle.y;
            particle.x += angle.cos() * step;
            particle.y += angle.sin() * step;
            particle.age += 1;

            // Draw segment
            let alpha = 0.15 + 0.1 * (1.0 - particle.age as f64 / 300.0).max(0.0);
            let lightness = 45.0 + smooth_noise(particle.x * 0.003, particle.y * 0.003) * 25.0;
            ctx.set_stroke_style(&format!("hsla({}, 85%, {}%, {})", particle.hue, lightness, alpha).into());
            ctx.set_line_width(1.0);
            ctx.begin_path();
            ctx.move_to(old_x, old_y);
            ctx.line_to(particle.x, particle.y);
            ctx.stroke();

            // Respawn if out of bounds or too old
            if particle.x < 0.0 || particle.x > w || particle.y < 0.0 || particle.y > h || particle.age > 300 {
                let mut rng = (particle.x as u64).wrapping_add((particle.y as u64).wrapping_mul(31)).wrapping_add(particle.age as u64);
                rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17;
                particle.x = ((rng >> 11) as f64 / (1u64 << 53) as f64) * w;
                rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17;
                particle.y = ((rng >> 11) as f64 / (1u64 << 53) as f64) * h;
                particle.age = 0;
                rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17;
                particle.hue = 170.0 + ((rng >> 11) as f64 / (1u64 << 53) as f64) * 80.0;
            }
        }
    });

    Ok(())
}

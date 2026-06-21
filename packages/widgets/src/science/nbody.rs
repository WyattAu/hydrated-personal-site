use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub struct Body {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub mass: f64,
}

#[wasm_bindgen]
impl Body {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64, vx: f64, vy: f64, mass: f64) -> Self {
        Self { x, y, vx, vy, mass }
    }
}

#[wasm_bindgen]
#[allow(dead_code)]
pub struct NBodySimulation {
    bodies: Vec<Body>,
    dt: f64,
    g: f64,
    canvas_id: String,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl NBodySimulation {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_id: &str, width: u32, height: u32) -> Self {
        Self {
            bodies: Vec::new(),
            dt: 0.01,
            g: 1.0,
            canvas_id: canvas_id.to_string(),
            width,
            height,
        }
    }

    pub fn add_body(&mut self, x: f64, y: f64, vx: f64, vy: f64, mass: f64) {
        self.bodies.push(Body::new(x, y, vx, vy, mass));
    }

    pub fn step(&mut self) {
        let n = self.bodies.len();
        let mut forces: Vec<(f64, f64)> = vec![(0.0, 0.0); n];

        for i in 0..n {
            for j in 0..n {
                if i == j {
                    continue;
                }
                let dx = self.bodies[j].x - self.bodies[i].x;
                let dy = self.bodies[j].y - self.bodies[i].y;
                let dist_sq = dx * dx + dy * dy;
                let dist = dist_sq.sqrt().max(5.0);
                let force = self.g * self.bodies[i].mass * self.bodies[j].mass / dist_sq;
                forces[i].0 += force * dx / dist;
                forces[i].1 += force * dy / dist;
            }
        }

        for i in 0..n {
            self.bodies[i].vx += forces[i].0 / self.bodies[i].mass * self.dt;
            self.bodies[i].vy += forces[i].1 / self.bodies[i].mass * self.dt;
            self.bodies[i].x += self.bodies[i].vx * self.dt;
            self.bodies[i].y += self.bodies[i].vy * self.dt;

            let w = self.width as f64;
            let h = self.height as f64;
            if self.bodies[i].x < 0.0 || self.bodies[i].x > w {
                self.bodies[i].vx *= -0.9;
                self.bodies[i].x = self.bodies[i].x.clamp(0.0, w);
            }
            if self.bodies[i].y < 0.0 || self.bodies[i].y > h {
                self.bodies[i].vy *= -0.9;
                self.bodies[i].y = self.bodies[i].y.clamp(0.0, h);
            }
        }
    }

    pub fn get_positions(&self) -> Vec<f64> {
        let mut positions = Vec::with_capacity(self.bodies.len() * 2);
        for b in &self.bodies {
            positions.push(b.x);
            positions.push(b.y);
        }
        positions
    }

    pub fn get_masses(&self) -> Vec<f64> {
        self.bodies.iter().map(|b| b.mass).collect()
    }

    pub fn body_count(&self) -> usize {
        self.bodies.len()
    }

    pub fn set_dt(&mut self, dt: f64) {
        self.dt = dt;
    }

    pub fn set_gravity(&mut self, g: f64) {
        self.g = g;
    }

    pub fn clear(&mut self) {
        self.bodies.clear();
    }
}

#[wasm_bindgen]
pub fn create_nbody_simulation(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(width);
    canvas.set_height(height);
    let ctx = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, width as f64, height as f64);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("14px monospace");
    ctx.fill_text("N-Body Gravitational Simulation", 10.0, 20.0)?;
    ctx.fill_text("Bodies: 0", 10.0, height as f64 - 10.0)?;

    Ok(())
}

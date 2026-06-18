use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub struct TerrainGenerator {
    seed: u32,
    octaves: u32,
    persistence: f64,
    scale: f64,
}

#[wasm_bindgen]
impl TerrainGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32, octaves: u32, persistence: f64) -> Self {
        Self {
            seed,
            octaves,
            persistence,
            scale: 100.0,
        }
    }

    pub fn set_scale(&mut self, scale: f64) {
        self.scale = scale;
    }

    fn hash(x: u32, y: u32, s: u32) -> f64 {
        let n = (x as f64) * 12.9898 + (y as f64) * 78.233 + (s as f64) * 43.12;
        let n = n.sin() * 43758.5453;
        n - n.floor()
    }

    fn smooth_noise(x: f64, y: f64, s: u32) -> f64 {
        let ix = x.floor() as i64;
        let iy = y.floor() as i64;
        let fx = x - x.floor();
        let fy = y - y.floor();
        let fx = fx * fx * (3.0 - 2.0 * fx);
        let fy = fy * fy * (3.0 - 2.0 * fy);

        let n1 = Self::hash(ix as u32, iy as u32, s);
        let n2 = Self::hash((ix + 1) as u32, iy as u32, s);
        let n3 = Self::hash(ix as u32, (iy + 1) as u32, s);
        let n4 = Self::hash((ix + 1) as u32, (iy + 1) as u32, s);

        let top = n1 + (n2 - n1) * fx;
        let bottom = n3 + (n4 - n3) * fx;
        top + (bottom - top) * fy
    }

    pub fn generate(&self, width: u32, height: u32, scale: f64) -> Vec<f64> {
        let mut data = vec![0.0f64; (width * height) as usize];
        let s = if scale > 0.0 { scale } else { self.scale };

        for y in 0..height {
            for x in 0..width {
                let mut value = 0.0f64;
                let mut amp = 1.0f64;
                let mut freq = 1.0f64;
                let mut max_amp = 0.0f64;

                for _ in 0..self.octaves {
                    let sx = (x as f64) * freq / s;
                    let sy = (y as f64) * freq / s;
                    value += Self::smooth_noise(sx, sy, self.seed) * amp;
                    max_amp += amp;
                    amp *= self.persistence;
                    freq *= 2.0;
                }

                data[(y * width + x) as usize] = value / max_amp;
            }
        }

        data
    }

    pub fn get_height(&self, x: f64, y: f64) -> f64 {
        let mut value = 0.0f64;
        let mut amp = 1.0f64;
        let mut freq = 1.0f64;
        let mut max_amp = 0.0f64;

        for _ in 0..self.octaves {
            let sx = x * freq / self.scale;
            let sy = y * freq / self.scale;
            value += Self::smooth_noise(sx, sy, self.seed) * amp;
            max_amp += amp;
            amp *= self.persistence;
            freq *= 2.0;
        }

        value / max_amp
    }

    pub fn seed(&self) -> u32 {
        self.seed
    }

    pub fn set_seed(&mut self, seed: u32) {
        self.seed = seed;
    }

    pub fn octaves(&self) -> u32 {
        self.octaves
    }

    pub fn set_octaves(&mut self, octaves: u32) {
        self.octaves = octaves;
    }

    pub fn persistence(&self) -> f64 {
        self.persistence
    }

    pub fn set_persistence(&mut self, persistence: f64) {
        self.persistence = persistence;
    }
}

#[wasm_bindgen]
pub fn create_terrain_generator(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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
    ctx.fill_text("Procedural Terrain Generator", 10.0, 20.0)?;
    ctx.fill_text("Awaiting parameters...", 10.0, height as f64 / 2.0)?;

    Ok(())
}

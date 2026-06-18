use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub struct AudioVisualizer {
    fft_size: usize,
    frequency_data: Vec<f32>,
    time_data: Vec<f32>,
    canvas_id: String,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl AudioVisualizer {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_id: &str, width: u32, height: u32) -> Self {
        let fft_size = 2048;
        Self {
            fft_size,
            frequency_data: vec![0.0; fft_size / 2],
            time_data: vec![0.0; fft_size],
            canvas_id: canvas_id.to_string(),
            width,
            height,
        }
    }

    pub fn process_fft(&mut self, input: &[f32]) -> Vec<f32> {
        let n = input.len().min(self.frequency_data.len());
        let mut output = vec![0.0f32; n];

        for k in 0..n {
            let mut real = 0.0f32;
            let mut imag = 0.0f32;
            for i in 0..input.len() {
                let angle = -2.0 * std::f32::consts::PI * (k as f32) * (i as f32) / (input.len() as f32);
                real += input[i] * angle.cos();
                imag += input[i] * angle.sin();
            }
            output[k] = (real * real + imag * imag).sqrt();
        }

        self.frequency_data[..n].copy_from_slice(&output[..n]);
        output
    }

    pub fn get_frequency_data(&self) -> Vec<f32> {
        self.frequency_data.clone()
    }

    pub fn get_time_data(&self) -> Vec<f32> {
        self.time_data.clone()
    }

    pub fn set_time_data(&mut self, data: &[f32]) {
        let n = data.len().min(self.time_data.len());
        self.time_data[..n].copy_from_slice(&data[..n]);
    }

    pub fn fft_size(&self) -> usize {
        self.fft_size
    }

    pub fn frequency_bins(&self) -> usize {
        self.fft_size / 2
    }
}

#[wasm_bindgen]
pub fn create_audio_visualizer(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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
    ctx.fill_text("Audio Visualizer - Awaiting audio input...", 10.0, height as f64 / 2.0)?;

    Ok(())
}

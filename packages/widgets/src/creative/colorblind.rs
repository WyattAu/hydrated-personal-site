use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const PROTANOPIA: [[f64; 3]; 3] = [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0, 0.242, 0.758],
];

const DEUTERANOPIA: [[f64; 3]; 3] = [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
];

const TRITANOPIA: [[f64; 3]; 3] = [
    [0.95, 0.05, 0.0],
    [0.0, 0.433, 0.567],
    [0.0, 0.475, 0.525],
];

#[wasm_bindgen]
pub fn create_colorblind(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_colorblind_placeholder(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_colorblind(
    canvas_id: &str,
    width: u32,
    height: u32,
    img_data_json: &str,
) -> Result<(), JsValue> {
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

    let data: JsValue = js_sys::JSON::parse(img_data_json)?;
    let w_val = js_sys::Reflect::get(&data, &"width".into()).ok().and_then(|v| v.as_f64()).unwrap_or(100.0) as u32;
    let h_val = js_sys::Reflect::get(&data, &"height".into()).ok().and_then(|v| v.as_f64()).unwrap_or(100.0) as u32;
    let pixels = js_sys::Reflect::get(&data, &"pixels".into())?;
    let pixels_arr = js_sys::Array::from(&pixels);

    let mut original: Vec<u8> = Vec::with_capacity(pixels_arr.length() as usize);
    for p in pixels_arr.iter() {
        original.push(p.as_f64().unwrap_or(0.0) as u8);
    }

    draw_colorblind_comparison(&ctx, width, height, &original, w_val, h_val)?;

    Ok(())
}

fn apply_matrix(pixels: &[u8], w: u32, h: u32, matrix: &[[f64; 3]; 3]) -> Vec<u8> {
    let mut result = Vec::with_capacity(pixels.len());
    for y in 0..h {
        for x in 0..w {
            let idx = ((y * w + x) * 4) as usize;
            if idx + 2 < pixels.len() {
                let r = pixels[idx] as f64 / 255.0;
                let g = pixels[idx + 1] as f64 / 255.0;
                let b = pixels[idx + 2] as f64 / 255.0;

                let nr = (matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b).clamp(0.0, 1.0);
                let ng = (matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b).clamp(0.0, 1.0);
                let nb = (matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b).clamp(0.0, 1.0);

                result.push((nr * 255.0) as u8);
                result.push((ng * 255.0) as u8);
                result.push((nb * 255.0) as u8);
                result.push(if idx + 3 < pixels.len() { pixels[idx + 3] } else { 255 });
            }
        }
    }
    result
}

fn draw_colorblind_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Color Blindness Simulator", 10.0, 20.0)?;
    ctx.fill_text("Waiting for image data...", w / 2.0 - 70.0, h / 2.0)?;

    Ok(())
}

fn draw_colorblind_comparison(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    original: &[u8],
    img_w: u32,
    img_h: u32,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    let grid_w = w / 2.0;
    let grid_h = h / 2.0;

    let labels = ["Normal", "Protanopia", "Deuteranopia", "Tritanopia"];
    let matrices: [&[[f64; 3]; 3]; 4] = [
        &[[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        &PROTANOPIA,
        &DEUTERANOPIA,
        &TRITANOPIA,
    ];

    let positions = [(0.0, 0.0), (grid_w, 0.0), (0.0, grid_h), (grid_w, grid_h)];

    for (i, ((px, py), label)) in positions.iter().zip(labels.iter()).enumerate() {
        let img = if i == 0 {
            original.to_vec()
        } else {
            apply_matrix(original, img_w, img_h, matrices[i])
        };

        ctx.set_fill_style(&"#ffffff".into());
        ctx.set_font("11px monospace");
        ctx.fill_text(label, px + 5.0, py + 15.0)?;

        if !img.is_empty() && img_w > 0 && img_h > 0 {
            if let Ok(image_data) = web_sys::ImageData::new_with_u8_clamped_array_and_sh(
                wasm_bindgen::Clamped(&img),
                img_w,
                img_h,
            ) {
                ctx.put_image_data(&image_data, px + 10.0, py + 25.0)?;
            }
        }

        ctx.set_stroke_style(&"#333333".into());
        ctx.set_line_width(1.0);
        ctx.stroke_rect(*px, *py, grid_w, grid_h);
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Color Blindness Simulator", 10.0, h - 5.0)?;

    Ok(())
}

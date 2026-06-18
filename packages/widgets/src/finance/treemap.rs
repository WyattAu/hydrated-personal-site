use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_treemap(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_treemap_placeholder(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_treemap(canvas_id: &str, width: u32, height: u32, data_json: &str) -> Result<(), JsValue> {
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

    let data: JsValue = js_sys::JSON::parse(data_json)?;
    let items = js_sys::Array::from(&data);

    let mut entries: Vec<(String, f64, f64)> = Vec::new();
    for item in items.iter() {
        let name = js_sys::Reflect::get(&item, &"name".into())
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default();
        let cap = js_sys::Reflect::get(&item, &"cap".into())
            .ok()
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let change = js_sys::Reflect::get(&item, &"change".into())
            .ok()
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        if cap > 0.0 {
            entries.push((name, cap, change));
        }
    }

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    draw_treemap(&ctx, width, height, &entries)?;

    Ok(())
}

fn draw_treemap_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Market Treemap", 10.0, 20.0)?;
    ctx.fill_text("Waiting for data...", w / 2.0 - 50.0, h / 2.0)?;

    Ok(())
}

fn draw_treemap(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    entries: &[(String, f64, f64)],
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    if entries.is_empty() {
        ctx.set_fill_style(&"#ffffff".into());
        ctx.set_font("12px monospace");
        ctx.fill_text("No data", w / 2.0 - 20.0, h / 2.0)?;
        return Ok(());
    }

    let total_cap: f64 = entries.iter().map(|e| e.1).sum();
    if total_cap == 0.0 {
        return Ok(());
    }

    let mut x = 0.0;

    for (name, cap, change) in entries {
        let fraction = cap / total_cap;
        let rect_w = fraction * w;

        let color = if *change > 0.0 {
            let g = (200.0 + (*change * 10.0).min(55.0)) as u8;
            format!("rgb(0, {}, 80)", g)
        } else if *change < 0.0 {
            let r = (200.0 + ((*change * -1.0) * 10.0).min(55.0)) as u8;
            format!("rgb({}, 23, 68)", r)
        } else {
            "#37474f".to_string()
        };

        ctx.set_fill_style(&color.as_str().into());
        ctx.fill_rect(x, 0.0, rect_w, h);

        ctx.set_stroke_style(&"#0a0a0a".into());
        ctx.set_line_width(2.0);
        ctx.stroke_rect(x, 0.0, rect_w, h);

        if rect_w > 40.0 && h > 30.0 {
            ctx.set_fill_style(&"#ffffff".into());
            ctx.set_font("11px monospace");
            let label = if name.len() > 8 { &name[..8] } else { name };
            ctx.fill_text(label, x + 4.0, 16.0)?;
            ctx.set_font("10px monospace");
            ctx.fill_text(&format!("{:.1}%", change), x + 4.0, 30.0)?;
        }

        x += rect_w;
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text(&format!("{} assets", entries.len()), 10.0, h - 10.0)?;

    Ok(())
}

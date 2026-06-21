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

    // Skip error responses — keep placeholder data
    if data_json.contains("\"error\"") {
        return Ok(());
    }

    let data: JsValue = js_sys::JSON::parse(data_json)?;

    // Try standard format: [{name, cap, change}]
    let items = js_sys::Array::from(&data);
    let mut entries: Vec<(String, f64, f64)> = Vec::new();

    for item in items.iter() {
        // Check if it has "name" (standard format) or "symbol" (Binance format)
        let name_val = js_sys::Reflect::get(&item, &"name".into())
            .or_else(|_| js_sys::Reflect::get(&item, &"symbol".into()));
        let name = name_val.ok().and_then(|v| v.as_string()).unwrap_or_default();

        let cap_val = js_sys::Reflect::get(&item, &"cap".into())
            .or_else(|_| js_sys::Reflect::get(&item, &"quoteVolume".into()));
        let cap = cap_val.ok().and_then(|v| v.as_f64()).unwrap_or(0.0);

        let change_val = js_sys::Reflect::get(&item, &"change".into())
            .or_else(|_| js_sys::Reflect::get(&item, &"priceChangePercent".into()));
        let change = change_val.ok().and_then(|v| v.as_f64()).unwrap_or(0.0);

        if cap > 0.0 && !name.is_empty() {
            // Strip USDT/BUSD suffix for display
            let display_name = name.replace("USDT", "").replace("BUSD", "").replace("USD", "");
            entries.push((display_name, cap, change));
        }
    }

    entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    draw_treemap(&ctx, width, height, &entries)?;

    Ok(())
}

fn draw_treemap_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    // Render sample crypto market data
    let sample = vec![
        ("BTC".to_string(), 1_300_000_000_000.0, 2.1),
        ("ETH".to_string(), 390_000_000_000.0, -0.8),
        ("USDT".to_string(), 110_000_000_000.0, 0.1),
        ("BNB".to_string(), 85_000_000_000.0, 1.5),
        ("SOL".to_string(), 65_000_000_000.0, 3.2),
        ("XRP".to_string(), 35_000_000_000.0, -1.4),
        ("ADA".to_string(), 18_000_000_000.0, 0.7),
        ("DOGE".to_string(), 15_000_000_000.0, -0.3),
        ("AVAX".to_string(), 12_000_000_000.0, 1.1),
        ("DOT".to_string(), 8_000_000_000.0, -0.5),
    ];
    draw_treemap(ctx, width, height, &sample)
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

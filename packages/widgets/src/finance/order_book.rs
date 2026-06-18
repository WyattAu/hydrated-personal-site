use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_order_book(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_order_book(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_order_book(canvas_id: &str, width: u32, height: u32, data_json: &str) -> Result<(), JsValue> {
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
    let bids = js_sys::Reflect::get(&data, &"bids".into())?;
    let asks = js_sys::Reflect::get(&data, &"asks".into())?;

    let bids_arr: Vec<f64> = js_sys::Array::from(&bids)
        .iter()
        .filter_map(|v| v.as_f64())
        .collect();
    let asks_arr: Vec<f64> = js_sys::Array::from(&asks)
        .iter()
        .filter_map(|v| v.as_f64())
        .collect();

    draw_order_book_data(&ctx, width, height, &bids_arr, &asks_arr)?;

    Ok(())
}

fn draw_order_book(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Order Book Depth", 10.0, 20.0)?;
    ctx.fill_text("Waiting for data...", w / 2.0 - 50.0, h / 2.0)?;

    Ok(())
}

fn draw_order_book_data(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    bids: &[f64],
    asks: &[f64],
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;
    let mid = w / 2.0;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Bids", 10.0, 20.0)?;
    ctx.fill_text("Asks", mid + 10.0, 20.0)?;

    ctx.set_stroke_style(&"#333333".into());
    ctx.set_line_width(1.0);
    ctx.begin_path();
    ctx.move_to(mid, 0.0);
    ctx.line_to(mid, h);
    ctx.stroke();

    let max_depth = bids.len().max(asks.len()) as f64;
    if max_depth == 0.0 {
        return Ok(());
    }

    let bar_h = (h - 40.0) / max_depth;

    ctx.set_fill_style(&"#00c853".into());
    let mut bid_cum = 0.0;
    for (i, &price) in bids.iter().enumerate() {
        bid_cum += price;
        let x = mid - bid_cum * 0.1;
        let y = 30.0 + i as f64 * bar_h;
        ctx.fill_rect(x, y, bid_cum * 0.1, bar_h - 1.0);
    }

    ctx.set_fill_style(&"#ff1744".into());
    let mut ask_cum = 0.0;
    for (i, &price) in asks.iter().enumerate() {
        ask_cum += price;
        let x = mid;
        let y = 30.0 + i as f64 * bar_h;
        ctx.fill_rect(x, y, ask_cum * 0.1, bar_h - 1.0);
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text(
        &format!("Bids: {} | Asks: {}", bids.len(), asks.len()),
        10.0,
        h - 10.0,
    )?;

    Ok(())
}

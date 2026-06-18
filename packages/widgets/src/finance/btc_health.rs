use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const PI: f64 = std::f64::consts::PI;

#[wasm_bindgen]
pub fn create_btc_health(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_btc_health_placeholder(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_btc_health(canvas_id: &str, width: u32, height: u32, data_json: &str) -> Result<(), JsValue> {
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

    let hashrate = js_sys::Reflect::get(&data, &"hashrate".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let difficulty = js_sys::Reflect::get(&data, &"difficulty".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let mempool = js_sys::Reflect::get(&data, &"mempool".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let nodes = js_sys::Reflect::get(&data, &"nodes".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);

    draw_btc_health(&ctx, width, height, hashrate, difficulty, mempool, nodes)?;

    Ok(())
}

fn draw_btc_health_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    draw_gauge(ctx, w * 0.25, h * 0.4, 50.0, 0.0, "#f7931a".into())?;
    draw_gauge(ctx, w * 0.75, h * 0.4, 50.0, 0.0, "#00e5ff".into())?;
    draw_gauge(ctx, w * 0.25, h * 0.8, 50.0, 0.0, "#00c853".into())?;
    draw_gauge(ctx, w * 0.75, h * 0.8, 50.0, 0.0, "#ff1744".into())?;

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("BTC Network Health", 10.0, 20.0)?;

    Ok(())
}

fn draw_gauge(
    ctx: &CanvasRenderingContext2d,
    cx: f64,
    cy: f64,
    radius: f64,
    value: f64,
    color: String,
) -> Result<(), JsValue> {
    ctx.set_stroke_style(&"#333333".into());
    ctx.set_line_width(6.0);
    ctx.begin_path();
    ctx.arc(cx, cy, radius, 0.75 * PI, 2.25 * PI)?;
    ctx.stroke();

    let angle = 0.75 * PI + value * 1.5 * PI;
    ctx.set_stroke_style(&color.as_str().into());
    ctx.set_line_width(6.0);
    ctx.begin_path();
    ctx.arc(cx, cy, radius, 0.75 * PI, angle)?;
    ctx.stroke();

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text(&format!("{:.0}%", value * 100.0), cx - 15.0, cy + 4.0)?;

    Ok(())
}

fn draw_btc_health(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    hashrate: f64,
    difficulty: f64,
    mempool: f64,
    nodes: f64,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    let max_hash = hashrate.max(1.0);
    let max_diff = difficulty.max(1.0);
    let max_mem = mempool.max(1.0);
    let max_nodes = nodes.max(1.0);

    draw_gauge(ctx, w * 0.25, h * 0.4, 50.0, (hashrate / max_hash).min(1.0), "#f7931a".into())?;
    draw_gauge(ctx, w * 0.75, h * 0.4, 50.0, (difficulty / max_diff).min(1.0), "#00e5ff".into())?;
    draw_gauge(ctx, w * 0.25, h * 0.8, 50.0, (mempool / max_mem).min(1.0), "#00c853".into())?;
    draw_gauge(ctx, w * 0.75, h * 0.8, 50.0, (nodes / max_nodes).min(1.0), "#ff1744".into())?;

    ctx.set_fill_style(&"#aaaaaa".into());
    ctx.set_font("10px monospace");
    ctx.fill_text("Hash Rate", w * 0.25 - 25.0, h * 0.4 + 70.0)?;
    ctx.fill_text(&format!("{:.2} EH/s", hashrate), w * 0.25 - 30.0, h * 0.4 + 82.0)?;
    ctx.fill_text("Difficulty", w * 0.75 - 20.0, h * 0.4 + 70.0)?;
    ctx.fill_text(&format!("{:.2}T", difficulty), w * 0.75 - 20.0, h * 0.4 + 82.0)?;
    ctx.fill_text("Mempool", w * 0.25 - 20.0, h * 0.8 + 70.0)?;
    ctx.fill_text(&format!("{} MB", mempool as u64), w * 0.25 - 20.0, h * 0.8 + 82.0)?;
    ctx.fill_text("Nodes", w * 0.75 - 15.0, h * 0.8 + 70.0)?;
    ctx.fill_text(&format!("{}", nodes as u64), w * 0.75 - 10.0, h * 0.8 + 82.0)?;

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("BTC Network Health", 10.0, 20.0)?;

    Ok(())
}

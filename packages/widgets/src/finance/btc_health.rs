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

    // Try direct fields first (hashrate, difficulty, mempool, nodes)
    let hashrate = js_sys::Reflect::get(&data, &"hashrate".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let difficulty = js_sys::Reflect::get(&data, &"difficulty".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let mempool_val = js_sys::Reflect::get(&data, &"mempool".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let nodes = js_sys::Reflect::get(&data, &"nodes".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);

    // If no direct fields, adapt from mempool API: {fees, mempool: {count, vsize, total_fee, fee_histogram}}
    let (h, d, m, n) = if hashrate == 0.0 && mempool_val == 0.0 && nodes == 0.0 {
        let mempool_obj = js_sys::Reflect::get(&data, &"mempool".into()).ok().unwrap_or_default();
        let count = js_sys::Reflect::get(&mempool_obj, &"count".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
        let vsize = js_sys::Reflect::get(&mempool_obj, &"vsize".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
        let _total_fee = js_sys::Reflect::get(&mempool_obj, &"total_fee".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
        let fees = js_sys::Reflect::get(&data, &"fees".into()).ok().unwrap_or_default();
        let fastest = js_sys::Reflect::get(&fees, &"fastestFee".into()).ok().and_then(|v| v.as_f64()).unwrap_or(1.0);

        // Map: hash→mempool count (normalized), difficulty→total fee, mempool→vsize in MB, nodes→fee count
        let mempool_mb = vsize / 1_000_000.0;
        (
            (count / 200_000.0).min(1.0),   // hash gauge: mempool tx count vs 200k
            (fastest / 100.0).min(1.0),       // difficulty gauge: fastest fee vs 100 sat/vB
            (mempool_mb / 100.0).min(1.0),    // mempool gauge: vsize in MB vs 100 MB
            (count as f64 / 200_000.0).min(1.0), // nodes gauge: same metric
        )
    } else {
        (
            (hashrate / 1000.0).min(1.0),
            (difficulty / 200.0).min(1.0),
            (mempool_val / 100.0).min(1.0),
            (nodes / 20_000.0).min(1.0),
        )
    };

    draw_btc_health_gauges(&ctx, width, height, h, d, m, n)?;

    Ok(())
}

fn draw_btc_health_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    // Draw with sample data
    draw_btc_health(ctx, width, height, 850.0, 110.0, 15.0, 15000.0)
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
    let max_hash = hashrate.max(1.0);
    let max_diff = difficulty.max(1.0);
    let max_mem = mempool.max(1.0);
    let max_nodes = nodes.max(1.0);

    draw_btc_health_gauges(
        ctx, width, height,
        (hashrate / max_hash).min(1.0),
        (difficulty / max_diff).min(1.0),
        (mempool / max_mem).min(1.0),
        (nodes / max_nodes).min(1.0),
    )
}

fn draw_btc_health_gauges(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    h_pct: f64,
    d_pct: f64,
    m_pct: f64,
    n_pct: f64,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    draw_gauge(ctx, w * 0.25, h * 0.4, 50.0, h_pct, "#f7931a".into())?;
    draw_gauge(ctx, w * 0.75, h * 0.4, 50.0, d_pct, "#00e5ff".into())?;
    draw_gauge(ctx, w * 0.25, h * 0.8, 50.0, m_pct, "#00c853".into())?;
    draw_gauge(ctx, w * 0.75, h * 0.8, 50.0, n_pct, "#ff1744".into())?;

    ctx.set_fill_style(&"#aaaaaa".into());
    ctx.set_font("10px monospace");
    ctx.fill_text("Mempool Size", w * 0.25 - 30.0, h * 0.4 + 70.0)?;
    ctx.fill_text(&format!("{:.0}%", h_pct * 100.0), w * 0.25 - 15.0, h * 0.4 + 82.0)?;
    ctx.fill_text("Fee Rate", w * 0.75 - 18.0, h * 0.4 + 70.0)?;
    ctx.fill_text(&format!("{:.0}%", d_pct * 100.0), w * 0.75 - 15.0, h * 0.4 + 82.0)?;
    ctx.fill_text("Tx Volume", w * 0.25 - 22.0, h * 0.8 + 70.0)?;
    ctx.fill_text(&format!("{:.0}%", m_pct * 100.0), w * 0.25 - 15.0, h * 0.8 + 82.0)?;
    ctx.fill_text("Network Load", w * 0.75 - 25.0, h * 0.8 + 70.0)?;
    ctx.fill_text(&format!("{:.0}%", n_pct * 100.0), w * 0.75 - 15.0, h * 0.8 + 82.0)?;

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("BTC Network Health", 10.0, 20.0)?;

    Ok(())
}

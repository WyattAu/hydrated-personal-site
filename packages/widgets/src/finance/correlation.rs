use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_correlation(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_correlation_placeholder(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_correlation(canvas_id: &str, width: u32, height: u32, data_json: &str) -> Result<(), JsValue> {
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
    let nodes_val = js_sys::Reflect::get(&data, &"nodes".into())?;
    let edges_val = js_sys::Reflect::get(&data, &"edges".into())?;

    let nodes_arr = js_sys::Array::from(&nodes_val);
    let edges_arr = js_sys::Array::from(&edges_val);

    let mut names: Vec<String> = Vec::new();
    for n in nodes_arr.iter() {
        names.push(n.as_string().unwrap_or_default());
    }

    let mut edges: Vec<(usize, usize, f64)> = Vec::new();
    for e in edges_arr.iter() {
        let source = js_sys::Reflect::get(&e, &"source".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;
        let target = js_sys::Reflect::get(&e, &"target".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;
        let weight = js_sys::Reflect::get(&e, &"weight".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
        if source < names.len() && target < names.len() {
            edges.push((source, target, weight));
        }
    }

    draw_correlation_graph(&ctx, width, height, &names, &edges)?;

    Ok(())
}

fn draw_correlation_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Asset Correlation Network", 10.0, 20.0)?;
    ctx.fill_text("Waiting for data...", w / 2.0 - 50.0, h / 2.0)?;

    Ok(())
}

fn draw_correlation_graph(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    names: &[String],
    edges: &[(usize, usize, f64)],
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    if names.is_empty() {
        ctx.set_fill_style(&"#ffffff".into());
        ctx.set_font("12px monospace");
        ctx.fill_text("No data", w / 2.0 - 20.0, h / 2.0)?;
        return Ok(());
    }

    let n = names.len() as f64;
    let cx = w / 2.0;
    let cy = h / 2.0;
    let radius = w.min(h) * 0.35;

    let mut positions: Vec<(f64, f64)> = Vec::new();
    for i in 0..names.len() {
        let angle = (i as f64 / n) * 2.0 * std::f64::consts::PI - std::f64::consts::PI / 2.0;
        positions.push((cx + radius * angle.cos(), cy + radius * angle.sin()));
    }

    for &(source, target, weight) in edges {
        if source < positions.len() && target < positions.len() {
            let (x1, y1) = positions[source];
            let (x2, y2) = positions[target];
            let alpha = weight.abs().min(1.0);

            let color = if weight > 0.0 {
                format!("rgba(0, 200, 83, {:.2})", alpha)
            } else {
                format!("rgba(255, 23, 68, {:.2})", alpha)
            };

            ctx.set_stroke_style(&color.as_str().into());
            ctx.set_line_width((weight.abs() * 3.0).max(0.5));
            ctx.begin_path();
            ctx.move_to(x1, y1);
            ctx.line_to(x2, y2);
            ctx.stroke();
        }
    }

    for (i, &(x, y)) in positions.iter().enumerate() {
        ctx.set_fill_style(&"#00e5ff".into());
        ctx.begin_path();
        ctx.arc(x, y, 8.0, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.fill();

        ctx.set_fill_style(&"#ffffff".into());
        ctx.set_font("10px monospace");
        let label = if i < names.len() { &names[i] } else { "?" };
        ctx.fill_text(label, x - 12.0, y + 22.0)?;
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text(&format!("{} nodes, {} edges", names.len(), edges.len()), 10.0, h - 10.0)?;

    Ok(())
}

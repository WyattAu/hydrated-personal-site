use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_backtest(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_backtest_placeholder(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_backtest(canvas_id: &str, width: u32, height: u32, data_json: &str) -> Result<(), JsValue> {
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
    let equity_val = js_sys::Reflect::get(&data, &"equity".into())?;
    let drawdown_val = js_sys::Reflect::get(&data, &"drawdown".into())?;

    let equity: Vec<f64> = js_sys::Array::from(&equity_val)
        .iter()
        .filter_map(|v| v.as_f64())
        .collect();
    let drawdown: Vec<f64> = js_sys::Array::from(&drawdown_val)
        .iter()
        .filter_map(|v| v.as_f64())
        .collect();

    draw_backtest(&ctx, width, height, &equity, &drawdown)?;

    Ok(())
}

fn draw_backtest_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Strategy Backtest", 10.0, 20.0)?;
    ctx.fill_text("Waiting for data...", w / 2.0 - 50.0, h / 2.0)?;

    Ok(())
}

fn draw_backtest(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    equity: &[f64],
    drawdown: &[f64],
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    if equity.is_empty() {
        ctx.set_fill_style(&"#ffffff".into());
        ctx.set_font("12px monospace");
        ctx.fill_text("No data", w / 2.0 - 20.0, h / 2.0)?;
        return Ok(());
    }

    let split_y = h * 0.65;
    let drawdown_h = h - split_y - 30.0;

    let min_eq = equity.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_eq = equity.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let eq_range = (max_eq - min_eq).max(1.0);

    ctx.set_stroke_style(&"#00e5ff".into());
    ctx.set_line_width(1.5);
    ctx.begin_path();
    for (i, &val) in equity.iter().enumerate() {
        let x = (i as f64 / (equity.len() - 1).max(1) as f64) * w;
        let y = 30.0 + (1.0 - (val - min_eq) / eq_range) * (split_y - 40.0);
        if i == 0 {
            ctx.move_to(x, y);
        } else {
            ctx.line_to(x, y);
        }
    }
    ctx.stroke();

    ctx.set_stroke_style(&"#333333".into());
    ctx.set_line_width(1.0);
    ctx.begin_path();
    ctx.move_to(0.0, split_y);
    ctx.line_to(w, split_y);
    ctx.stroke();

    if !drawdown.is_empty() {
        let min_dd = drawdown.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_dd = drawdown.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let dd_range = (max_dd - min_dd).abs().max(1.0);

        ctx.set_stroke_style(&"#ff1744".into());
        ctx.set_line_width(1.5);
        ctx.begin_path();
        for (i, &val) in drawdown.iter().enumerate() {
            let x = (i as f64 / (drawdown.len() - 1).max(1) as f64) * w;
            let y = split_y + 20.0 + (1.0 - (val - min_dd) / dd_range) * drawdown_h;
            if i == 0 {
                ctx.move_to(x, y);
            } else {
                ctx.line_to(x, y);
            }
        }
        ctx.stroke();
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Equity Curve", 10.0, 20.0)?;
    ctx.fill_text(&format!("Start: {:.2}", equity[0]), w - 120.0, 20.0)?;
    ctx.fill_text(&format!("End: {:.2}", equity[equity.len() - 1]), w - 120.0, 35.0)?;
    let return_pct = ((equity[equity.len() - 1] / equity[0]) - 1.0) * 100.0;
    ctx.fill_text(&format!("Return: {:.2}%", return_pct), 10.0, split_y - 5.0)?;

    ctx.fill_text("Drawdown", 10.0, split_y + 15.0)?;

    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_climate(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_climate_placeholder(&ctx, width, height)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_climate(canvas_id: &str, width: u32, height: u32, csv_data: &str) -> Result<(), JsValue> {
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

    let mut anomalies: Vec<(u32, f64)> = Vec::new();
    for line in csv_data.lines() {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 2 {
            if let Ok(year) = parts[0].trim().parse::<u32>() {
                if let Ok(anomaly) = parts[1].trim().parse::<f64>() {
                    anomalies.push((year, anomaly));
                }
            }
        }
    }

    draw_climate(&ctx, width, height, &anomalies)?;

    Ok(())
}

fn draw_climate_placeholder(ctx: &CanvasRenderingContext2d, width: u32, height: u32) -> Result<(), JsValue> {
    // Render default NASA GISS global temperature anomaly data
    let sample = "1880,-0.16\n1885,-0.25\n1890,-0.34\n1895,-0.23\n1900,-0.08\n1905,-0.27\n1910,-0.42\n1915,-0.14\n1920,-0.23\n1925,-0.17\n1930,-0.09\n1935,-0.14\n1940,0.10\n1945,0.04\n1950,-0.16\n1955,-0.14\n1960,0.02\n1965,-0.11\n1970,0.02\n1975,-0.01\n1980,0.26\n1985,0.12\n1990,0.40\n1995,0.42\n2000,0.39\n2005,0.67\n2010,0.72\n2015,0.87\n2020,1.02\n2024,1.29";

    let mut anomalies: Vec<(u32, f64)> = Vec::new();
    for line in sample.lines() {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 2 {
            if let Ok(year) = parts[0].trim().parse::<u32>() {
                if let Ok(anomaly) = parts[1].trim().parse::<f64>() {
                    anomalies.push((year, anomaly));
                }
            }
        }
    }

    draw_climate(ctx, width, height, &anomalies)
}

fn draw_climate(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
    data: &[(u32, f64)],
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    if data.is_empty() {
        ctx.set_fill_style(&"#ffffff".into());
        ctx.set_font("12px monospace");
        ctx.fill_text("No data", w / 2.0 - 20.0, h / 2.0)?;
        return Ok(());
    }

    let min_val = data.iter().map(|d| d.1).fold(f64::INFINITY, f64::min);
    let max_val = data.iter().map(|d| d.1).fold(f64::NEG_INFINITY, f64::max);
    let range = (max_val - min_val).max(0.1);
    let min_year = data.first().map(|d| d.0).unwrap_or(0);
    let max_year = data.last().map(|d| d.0).unwrap_or(1);
    let year_span = (max_year - min_year).max(1) as f64;

    let margin_left = 50.0;
    let margin_top = 40.0;
    let margin_bottom = 40.0;
    let chart_w = w - margin_left - 20.0;
    let chart_h = h - margin_top - margin_bottom;

    let zero_y = margin_top + (1.0 - (0.0 - min_val) / range) * chart_h;

    ctx.set_stroke_style(&"#333333".into());
    ctx.set_line_width(1.0);
    ctx.begin_path();
    ctx.move_to(margin_left, zero_y);
    ctx.line_to(margin_left + chart_w, zero_y);
    ctx.stroke();

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("10px monospace");
    ctx.fill_text("0.0", 10.0, zero_y + 4.0)?;

    for (i, &(year, anomaly)) in data.iter().enumerate() {
        let x = margin_left + ((year - min_year) as f64 / year_span) * chart_w;
        let y = margin_top + (1.0 - (anomaly - min_val) / range) * chart_h;

        let color = if anomaly < 0.0 {
            "#2196f3"
        } else {
            "#f44336"
        };

        ctx.set_fill_style(&color.into());
        ctx.begin_path();
        ctx.arc(x, y, 2.5, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.fill();

        if i > 0 {
            let prev = data[i - 1];
            let px = margin_left + ((prev.0 - min_year) as f64 / year_span) * chart_w;
            let py = margin_top + (1.0 - (prev.1 - min_val) / range) * chart_h;

            let line_color = if anomaly < 0.0 { "#2196f3" } else { "#f44336" };
            ctx.set_stroke_style(&line_color.into());
            ctx.set_line_width(1.0);
            ctx.begin_path();
            ctx.move_to(px, py);
            ctx.line_to(x, y);
            ctx.stroke();
        }
    }

    let sum: f64 = data.iter().map(|d| d.1).sum();
    let mean = sum / data.len() as f64;

    ctx.set_stroke_style(&"#ffcc00".into());
    ctx.set_line_width(1.0);
    let dash_array = js_sys::Array::new();
    dash_array.push(&5.0.into());
    dash_array.push(&3.0.into());
    ctx.set_line_dash(&dash_array)?;
    let mean_y = margin_top + (1.0 - (mean - min_val) / range) * chart_h;
    ctx.begin_path();
    ctx.move_to(margin_left, mean_y);
    ctx.line_to(margin_left + chart_w, mean_y);
    ctx.stroke();
    ctx.set_line_dash(&js_sys::Array::new())?;

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Climate Data Explorer", 10.0, 25.0)?;

    ctx.set_font("10px monospace");
    ctx.fill_text(&format!("{} - {}", min_year, max_year), margin_left, h - 10.0)?;
    ctx.fill_text(&format!("Mean: {:.2}", mean), w - 120.0, h - 10.0)?;

    Ok(())
}

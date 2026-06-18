use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn create_regex_playground(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    draw_regex_ui(&ctx, width, height)?;

    Ok(())
}

fn draw_regex_ui(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(20.0, 20.0, w - 40.0, 50.0);
    ctx.set_stroke_style(&"#00e5ff".into());
    ctx.set_line_width(1.0);
    ctx.stroke_rect(20.0, 20.0, w - 40.0, 50.0);

    ctx.set_fill_style(&"#888888".into());
    ctx.set_font("13px monospace");
    ctx.fill_text("Pattern:", 30.0, 50.0)?;

    ctx.set_fill_style(&"#ffffff".into());
    ctx.fill_text("[Enter regex pattern]", 100.0, 50.0)?;

    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(20.0, 90.0, w - 40.0, 50.0);
    ctx.set_stroke_style(&"#00e5ff".into());
    ctx.stroke_rect(20.0, 90.0, w - 40.0, 50.0);

    ctx.set_fill_style(&"#888888".into());
    ctx.fill_text("Test:", 30.0, 120.0)?;

    ctx.set_fill_style(&"#ffffff".into());
    ctx.fill_text("[Enter test string]", 80.0, 120.0)?;

    let matches: Vec<(usize, usize, String)> = vec![];
    let sample_text = "Hello World! Testing regex matching.";
    let sample_pattern = r"\b\w+\b";

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Matches:", 20.0, 170.0)?;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(20.0, 180.0, w - 40.0, h - 220.0);
    ctx.set_stroke_style(&"#333333".into());
    ctx.stroke_rect(20.0, 180.0, w - 40.0, h - 220.0);

    ctx.set_fill_style(&"#00e5ff".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Sample: Hello World! Testing regex matching.", 30.0, 200.0)?;

    ctx.set_fill_style(&"#ffcc00".into());
    ctx.fill_text("Pattern: \\b\\w+\\b", 30.0, 220.0)?;

    ctx.set_fill_style(&"#888888".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Capture Groups:", 20.0, 260.0)?;

    ctx.set_fill_style(&"#00e5ff".into());
    ctx.fill_text("Group 0: \"Hello\" (match)", 30.0, 280.0)?;
    ctx.fill_text("Group 0: \"World\" (match)", 30.0, 295.0)?;
    ctx.fill_text("Group 0: \"Testing\" (match)", 30.0, 310.0)?;
    ctx.fill_text("Group 0: \"regex\" (match)", 30.0, 325.0)?;
    ctx.fill_text("Group 0: \"matching\" (match)", 30.0, 340.0)?;

    Ok(())
}

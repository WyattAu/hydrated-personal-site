use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

struct RegexState {
    pattern: String,
    test: String,
    cursor_pos: usize,
    focused: bool,
    cursor_blink: bool,
}

thread_local! {
    static STATE: std::cell::RefCell<Option<Box<RegexState>>> = std::cell::RefCell::new(None);
}

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

    STATE.with(|s| {
        *s.borrow_mut() = Some(Box::new(RegexState {
            pattern: String::new(),
            test: String::new(),
            cursor_pos: 0,
            focused: false,
            cursor_blink: true,
        }));
    });

    draw_regex_ui(&ctx, width, height)
}

#[wasm_bindgen]
pub fn update_regex_playground(
    canvas_id: &str,
    width: u32,
    height: u32,
    data_json: &str,
) -> Result<(), JsValue> {
    let data: JsValue = js_sys::JSON::parse(data_json)?;

    let pattern = js_sys::Reflect::get(&data, &"pattern".into())
        .ok().and_then(|v| v.as_string()).unwrap_or_default();
    let test = js_sys::Reflect::get(&data, &"test".into())
        .ok().and_then(|v| v.as_string()).unwrap_or_default();
    let cursor_pos = js_sys::Reflect::get(&data, &"cursor_pos".into())
        .ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;
    let focused_field = js_sys::Reflect::get(&data, &"focused".into())
        .ok().and_then(|v| v.as_string()).unwrap_or_default();
    let cursor_blink = js_sys::Reflect::get(&data, &"cursor_blink".into())
        .ok().and_then(|v| v.as_bool()).unwrap_or(true);

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(ref mut st) = *state {
            st.pattern = pattern;
            st.test = test;
            st.cursor_pos = cursor_pos;
            st.focused = focused_field == "pattern";
            st.cursor_blink = cursor_blink;
        }
    });

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

    draw_regex_ui(&ctx, width, height)
}

fn draw_regex_ui(
    ctx: &CanvasRenderingContext2d,
    width: u32,
    height: u32,
) -> Result<(), JsValue> {
    let w = width as f64;
    let h = height as f64;

    let (pattern, test, cursor_pos, focused, cursor_blink) = STATE.with(|s| {
        let state = s.borrow();
        match state.as_ref() {
            Some(st) => (st.pattern.clone(), st.test.clone(), st.cursor_pos, st.focused, st.cursor_blink),
            None => (String::new(), String::new(), 0, false, true),
        }
    });

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, w, h);

    // Pattern input field
    let pattern_focused = focused;
    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(20.0, 20.0, w - 40.0, 40.0);
    if pattern_focused {
        ctx.set_stroke_style(&"#00e5ff".into());
        ctx.set_line_width(2.0);
    } else {
        ctx.set_stroke_style(&"#333333".into());
        ctx.set_line_width(1.0);
    }
    ctx.stroke_rect(20.0, 20.0, w - 40.0, 40.0);

    ctx.set_fill_style(&"#888888".into());
    ctx.set_font("12px monospace");
    ctx.fill_text("Pattern:", 30.0, 45.0)?;

    if pattern.is_empty() && !pattern_focused {
        ctx.set_fill_style(&"#555555".into());
        ctx.fill_text("[Enter regex pattern]", 100.0, 45.0)?;
    } else {
        ctx.set_fill_style(&"#ffffff".into());
        ctx.fill_text(&pattern, 100.0, 45.0)?;
        if pattern_focused && cursor_blink {
            let char_offset = pattern.len().min(cursor_pos);
            let before_cursor = &pattern[..char_offset];
            let text_width = before_cursor.len() as f64 * 7.2; // approx monospace char width
            let cursor_x = 100.0 + text_width;
            ctx.set_fill_style(&"#00e5ff".into());
            ctx.fill_rect(cursor_x, 28.0, 2.0, 24.0);
        }
    }

    // Test input field
    let test_focused = !focused;
    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(20.0, 75.0, w - 40.0, 40.0);
    if test_focused {
        ctx.set_stroke_style(&"#00e5ff".into());
        ctx.set_line_width(2.0);
    } else {
        ctx.set_stroke_style(&"#333333".into());
        ctx.set_line_width(1.0);
    }
    ctx.stroke_rect(20.0, 75.0, w - 40.0, 40.0);

    ctx.set_fill_style(&"#888888".into());
    ctx.fill_text("Test:", 30.0, 100.0)?;

    if test.is_empty() && !test_focused {
        ctx.set_fill_style(&"#555555".into());
        ctx.fill_text("[Enter test string]", 80.0, 100.0)?;
    } else {
        ctx.set_fill_style(&"#ffffff".into());
        ctx.fill_text(&test, 80.0, 100.0)?;
        if test_focused && cursor_blink {
            let char_offset = test.len().min(cursor_pos);
            let before_cursor = &test[..char_offset];
            let text_width = before_cursor.len() as f64 * 7.2;
            let cursor_x = 80.0 + text_width;
            ctx.set_fill_style(&"#00e5ff".into());
            ctx.fill_rect(cursor_x, 83.0, 2.0, 24.0);
        }
    }

    // Matches section
    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Matches:", 20.0, 140.0)?;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(20.0, 150.0, w - 40.0, h - 200.0);
    ctx.set_stroke_style(&"#333333".into());
    ctx.stroke_rect(20.0, 150.0, w - 40.0, h - 200.0);

    if pattern.is_empty() || test.is_empty() {
        ctx.set_fill_style(&"#555555".into());
        ctx.set_font("12px monospace");
        ctx.fill_text("Enter pattern and test string above", 30.0, 180.0)?;
    } else {
        // Run regex matching via js_sys
        let re = js_sys::RegExp::new(&pattern, "g");

        let mut y = 170.0f64;
        let mut match_count = 0u64;
        let max_y = h - 50.0;

        // First pass: count and draw matches
        loop {
            let m = re.exec(&test);
            match m {
                Some(m) => {
                    match_count += 1;
                    if y > max_y { continue; } // keep counting but stop drawing

                    let full_match = js_sys::Reflect::get(&m, &"0".into())
                        .ok().and_then(|v| v.as_string()).unwrap_or_default();
                    let index_val = js_sys::Reflect::get(&m, &"index".into())
                        .ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;

                    ctx.set_fill_style(&"#00e5ff".into());
                    let match_line = format!("Match {}: \"{}\" at index {}", match_count, full_match, index_val);
                    ctx.fill_text(&match_line, 30.0, y)?;
                    y += 15.0;

                    // Extract capture groups (m[1], m[2], ...)
                    let m_len = js_sys::Reflect::get(&m, &"length".into())
                        .ok().and_then(|v| v.as_f64()).unwrap_or(1.0) as u32;
                    for g in 1..m_len {
                        if y > max_y { break; }
                        let group_val = js_sys::Reflect::get(&m, &g.into())
                            .ok().and_then(|v| v.as_string()).unwrap_or_default();
                        ctx.set_fill_style(&"#ffcc00".into());
                        let group_line = format!("  Group {}: \"{}\"", g, group_val);
                        ctx.fill_text(&group_line, 30.0, y)?;
                        y += 15.0;
                    }

                    if y > max_y {
                        ctx.set_fill_style(&"#888888".into());
                        ctx.fill_text("...", 30.0, y)?;
                    }
                }
                None => break,
            }
        }
    }

    // Status bar
    ctx.set_fill_style(&"#1a1a2e".into());
    ctx.fill_rect(0.0, h - 25.0, w, 25.0);
    ctx.set_fill_style(&"#666666".into());
    ctx.set_font("10px monospace");
    let status = format!("Pattern: {} chars | Test: {} chars | Click fields to type", pattern.len(), test.len());
    ctx.fill_text(&status, 10.0, h - 8.0)?;

    Ok(())
}

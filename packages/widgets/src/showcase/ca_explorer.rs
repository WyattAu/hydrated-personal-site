use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Elementary Cellular Automaton — Rule 30 (Wolfram).
/// Each row is computed from the previous row via neighborhood lookup.

const GRID_W: usize = 200;
const GRID_H: usize = 150;

thread_local! {
    static GRID: std::cell::RefCell<([u8; GRID_W], usize)> = std::cell::RefCell::new(([0u8; GRID_W], 0));
    static ROWS: std::cell::RefCell<Vec<[u8; GRID_W]>> = std::cell::RefCell::new(Vec::new());
}

// Rule 30 lookup table: pattern[neighborhood] → output
// neighborhood = (left << 2) | (center << 1) | right
// Rule 30 binary: 00011110 → index 0→0, 1→1, 2→1, 3→1, 4→1, 5→0, 6→0, 7→0
const RULE30: [u8; 8] = [0, 1, 1, 1, 1, 0, 0, 0];

fn apply_rule(left: u8, center: u8, right: u8) -> u8 {
    let idx = ((left as usize) << 2) | ((center as usize) << 1) | (right as usize);
    RULE30[idx]
}

#[wasm_bindgen]
pub fn create_ca_explorer(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    GRID.with(|g| {
        let mut g = g.borrow_mut();
        g.0 = [0u8; GRID_W];
        g.0[GRID_W / 2] = 1; // single seed in center
        g.1 = 0;
    });
    ROWS.with(|r| { r.borrow_mut().clear(); });
    update_ca_explorer(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_ca_explorer(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;

    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);

    // Generate next row
    GRID.with(|g| {
        let mut g = g.borrow_mut();
        let current = g.0;
        let mut next = [0u8; GRID_W];
        for i in 0..GRID_W {
            let left = if i > 0 { current[i - 1] } else { current[GRID_W - 1] };
            let center = current[i];
            let right = if i < GRID_W - 1 { current[i + 1] } else { current[0] };
            next[i] = apply_rule(left, center, right);
        }
        g.0 = next;
        g.1 += 1;
    });

    // Store current row
    GRID.with(|g| {
        let row = g.borrow().0;
        ROWS.with(|r| {
            let mut rows = r.borrow_mut();
            rows.push(row);
            if rows.len() > GRID_H {
                rows.remove(0);
            }
        });
    });

    // Render all stored rows
    let cell_w = wf / GRID_W as f64;
    let cell_h = hf / GRID_H as f64;

    ROWS.with(|rows| {
        let rows = rows.borrow();
        for (row_idx, row) in rows.iter().enumerate() {
            for (col_idx, &cell) in row.iter().enumerate() {
                if cell == 1 {
                    let hue = ((col_idx as f64 / GRID_W as f64) * 120.0 + 180.0) % 360.0;
                    ctx.set_fill_style(&format!("hsl({}, 80%, 55%)", hue).into());
                    ctx.fill_rect(
                        col_idx as f64 * cell_w,
                        row_idx as f64 * cell_h,
                        cell_w + 1.0,
                        cell_h + 1.0,
                    );
                }
            }
        }
    });

    Ok(())
}

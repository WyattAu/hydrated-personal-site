use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
use std::cell::RefCell;

struct CellState {
    grid: Vec<u8>,
    next: Vec<u8>,
    cols: u32,
    rows: u32,
    cell_size: u32,
    alive: bool,
}

thread_local! {
    static STATE: RefCell<Option<Box<CellState>>> = RefCell::new(None);
}

#[wasm_bindgen]
pub fn create_cellular_automata(canvas_id: &str, width: u32, height: u32) -> Result<(), JsValue> {
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

    let cell_size = 8u32;
    let cols = width / cell_size;
    let rows = height / cell_size;
    let total = (cols * rows) as usize;

    let mut grid: Vec<u8> = Vec::with_capacity(total);
    for _ in 0..total {
        grid.push((js_sys::Math::random() > 0.7) as u8);
    }
    let next = vec![0u8; total];

    STATE.with(|s| {
        *s.borrow_mut() = Some(Box::new(CellState { grid, next, cols, rows, cell_size, alive: true }));
    });

    STATE.with(|s| {
        let state = s.borrow();
        let st = state.as_ref().unwrap();
        draw_grid(&ctx, &st.grid, st.cols, st.rows, st.cell_size, width, height)
    })
}

#[wasm_bindgen]
pub fn update_cellular_automata(
    canvas_id: &str,
    width: u32,
    height: u32,
    _time: f64,
) -> Result<(), JsValue> {
    // Step + draw all in one borrow to avoid any borrow-splitting issues
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let st = match state.as_mut() {
            Some(st) if st.alive => st,
            _ => return Ok(()),
        };

        let cols = st.cols;
        let rows = st.rows;
        let cell_size = st.cell_size;

        // Zero out next
        for v in st.next.iter_mut() {
            *v = 0;
        }

        // Step Conway's Game of Life
        for row in 0..rows {
            for col in 0..cols {
                let idx = (row * cols + col) as usize;
                let mut neighbors = 0u8;

                for dr in 0..3u32 {
                    for dc in 0..3u32 {
                        if dr == 1 && dc == 1 {
                            continue;
                        }
                        let nr = (row + dr + rows - 1) % rows;
                        let nc = (col + dc + cols - 1) % cols;
                        let ni = (nr * cols + nc) as usize;
                        neighbors += st.grid[ni];
                    }
                }

                let alive = st.grid[idx] == 1;
                st.next[idx] = match (alive, neighbors) {
                    (true, 2..=3) => 1,
                    (false, 3) => 1,
                    _ => 0,
                };
            }
        }

        // Copy next to grid
        for i in 0..st.grid.len() {
            st.grid[i] = st.next[i];
        }

        // Draw
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
        draw_grid(&ctx, &st.grid, cols, rows, cell_size, width, height)
    })
}

fn draw_grid(
    ctx: &CanvasRenderingContext2d,
    grid: &[u8],
    cols: u32,
    rows: u32,
    cell_size: u32,
    width: u32,
    height: u32,
) -> Result<(), JsValue> {
    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, width as f64, height as f64);

    for row in 0..rows {
        for col in 0..cols {
            let idx = (row * cols + col) as usize;
            if grid[idx] == 1 {
                ctx.set_fill_style(&"#00e5ff".into());
                ctx.fill_rect(
                    (col * cell_size) as f64,
                    (row * cell_size) as f64,
                    cell_size as f64 - 1.0,
                    cell_size as f64 - 1.0,
                );
            }
        }
    }

    ctx.set_fill_style(&"#ffffff".into());
    ctx.set_font("11px monospace");
    ctx.fill_text("Conway's Game of Life", 10.0, 20.0)?;
    ctx.fill_text(
        &format!("Grid: {}x{}", cols, rows),
        10.0,
        height as f64 - 10.0,
    )?;

    Ok(())
}

use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

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

    let cell_size = 8;
    let cols = width / cell_size;
    let rows = height / cell_size;
    let total_cells = (cols * rows) as usize;

    let mut grid: Vec<u8> = Vec::with_capacity(total_cells);
    for _ in 0..total_cells {
        let val = (js_sys::Math::random() > 0.7) as u8;
        grid.push(val);
    }

    draw_grid(&ctx, &grid, cols, rows, cell_size, width, height)?;

    let _grid_ptr = grid.as_ptr() as u32;
    let _grid_len = grid.len() as u32;
    grid.leak();

    let _closure = Closure::wrap(Box::new(move || {
        // This is a simplified step - in production, use requestAnimationFrame loop
    }) as Box<dyn FnMut()>);

    Ok(())
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

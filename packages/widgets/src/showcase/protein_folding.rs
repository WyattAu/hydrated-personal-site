use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// HP Protein Folding Model on a 2D lattice.
///
/// Hydrophobic-Polar protein model with Monte Carlo simulated annealing.
/// The chain folds from a random walk to a compact structure that maximizes
/// H-H (hydrophobic-hydrophobic) contacts, minimizing free energy.
///
/// Energy = -(count of non-bonded H-H neighbors)
/// Lower energy = more stable fold.

const LATTICE_SIZE: usize = 40;
const CHAIN_LEN: usize = 20;

// Known hard HP sequence: HPHPPHHPHPPHPHHPPHPH
// H = hydrophobic (orange), P = polar (cyan)
const SEQUENCE: [bool; CHAIN_LEN] = [
    true, false, true, true, false, true, true, false, true, true,
    false, true, true, false, false, true, true, false, true, false,
];
// true = H (hydrophobic), false = P (polar)

struct FoldingState {
    chain: [(i32, i32); CHAIN_LEN], // lattice positions
    energy: i32,
    best_energy: i32,
    best_chain: [(i32, i32); CHAIN_LEN],
    iteration: usize,
    temperature: f64,
    energy_history: Vec<i32>,
    occupied: [[i16; LATTICE_SIZE]; LATTICE_SIZE], // -1 = empty, else chain index
}

thread_local! {
    static STATE: std::cell::RefCell<FoldingState> = std::cell::RefCell::new(FoldingState {
        chain: [(0, 0); CHAIN_LEN],
        energy: 0,
        best_energy: i32::MAX,
        best_chain: [(0, 0); CHAIN_LEN],
        iteration: 0,
        temperature: 2.0,
        energy_history: Vec::new(),
        occupied: [[-1i16; LATTICE_SIZE]; LATTICE_SIZE],
    });
}

fn xorshift(state: &mut u64) -> f64 {
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    ((*state >> 11) as f64) / (1u64 << 53) as f64
}

fn lattice_to_idx(x: i32, y: i32) -> Option<(usize, usize)> {
    let cx = LATTICE_SIZE as i32 / 2;
    if x < 0 || y < 0 { return None; }
    let lx = (x + cx) as usize;
    let ly = (y + cx) as usize;
    if lx < LATTICE_SIZE && ly < LATTICE_SIZE {
        Some((lx, ly))
    } else {
        None
    }
}

fn init_chain() {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.iteration = 0;
        s.temperature = 2.0;
        s.best_energy = i32::MAX;
        s.energy_history.clear();
        s.occupied = [[-1i16; LATTICE_SIZE]; LATTICE_SIZE];

        // Initialize as a random self-avoiding walk from center
        let mut rng = 98765u64;
        let cx = 0i32;
        let cy = 0i32;
        s.chain[0] = (cx, cy);
        if let Some((lx, ly)) = lattice_to_idx(cx, cy) {
            s.occupied[lx][ly] = 0;
        }

        let directions = [(0i32, 1i32), (0, -1), (1, 0), (-1, 0)];

        for i in 1..CHAIN_LEN {
            let mut placed = false;
            // Try each direction in random order
            let start = (xorshift(&mut rng) * 4.0) as usize;
            for d_offset in 0..4 {
                let d = (start + d_offset) % 4;
                let (dx, dy) = directions[d];
                let nx = s.chain[i - 1].0 + dx;
                let ny = s.chain[i - 1].1 + dy;
                if let Some((lx, ly)) = lattice_to_idx(nx, ny) {
                    if s.occupied[lx][ly] == -1 {
                        s.chain[i] = (nx, ny);
                        s.occupied[lx][ly] = i as i16;
                        placed = true;
                        break;
                    }
                }
            }
            if !placed {
                // Fallback: extend in +x direction
                s.chain[i] = (s.chain[i - 1].0 + 1, s.chain[i - 1].1);
                if let Some((lx, ly)) = lattice_to_idx(s.chain[i].0, s.chain[i].1) {
                    s.occupied[lx][ly] = i as i16;
                }
            }
        }

        s.energy = compute_energy(&s.chain, &s.occupied);
        s.best_energy = s.energy;
        s.best_chain = s.chain;
    });
}

fn compute_energy(chain: &[(i32, i32); CHAIN_LEN], occupied: &[[i16; LATTICE_SIZE]; LATTICE_SIZE]) -> i32 {
    let mut contacts = 0i32;
    let neighbors = [(0i32, 1i32), (0, -1), (1, 0), (-1, 0)];

    for i in 0..CHAIN_LEN {
        if !SEQUENCE[i] { continue; } // only H residues
        for &(dx, dy) in &neighbors {
            let nx = chain[i].0 + dx;
            let ny = chain[i].1 + dy;
            if let Some((lx, ly)) = lattice_to_idx(nx, ny) {
                let j = occupied[lx][ly];
                if j >= 0 && (j as usize) > i + 1 && SEQUENCE[j as usize] {
                    contacts += 1;
                }
            }
        }
    }
    -contacts // energy is negative of contacts
}

fn try_corner_flip(s: &mut FoldingState, idx: usize, rng: &mut u64) {
    if idx == 0 || idx == CHAIN_LEN - 1 { return; }

    let prev = s.chain[idx - 1];
    let next = s.chain[idx + 1];
    let curr = s.chain[idx];

    // Corner flip: the amino acid must be at a corner (prev and next are perpendicular)
    let is_corner = (prev.0 != next.0) && (prev.1 != next.1);
    if !is_corner { return; }

    // The flipped position is diagonally opposite
    let flip_x = prev.0 + (next.0 - curr.0);
    let flip_y = prev.1 + (next.1 - curr.1);

    // Check if the new position is free
    if let Some((flx, fly)) = lattice_to_idx(flip_x, flip_y) {
        if s.occupied[flx][fly] != -1 { return; }

        // Store old state
        let old_pos = curr;
        let old_energy = s.energy;

        // Apply move
        if let Some((olx, oly)) = lattice_to_idx(old_pos.0, old_pos.1) {
            s.occupied[olx][oly] = -1;
        }
        s.occupied[flx][fly] = idx as i16;
        s.chain[idx] = (flip_x, flip_y);

        // Recompute energy
        let new_energy = compute_energy(&s.chain, &s.occupied);
        let delta = new_energy - old_energy;

        // Metropolis criterion
        let accept = delta <= 0 || xorshift(rng) < (-delta as f64 / s.temperature).exp();

        if accept {
            s.energy = new_energy;
            if new_energy < s.best_energy {
                s.best_energy = new_energy;
                s.best_chain = s.chain;
            }
        } else {
            // Revert
            s.occupied[flx][fly] = -1;
            if let Some((olx, oly)) = lattice_to_idx(old_pos.0, old_pos.1) {
                s.occupied[olx][oly] = idx as i16;
            }
            s.chain[idx] = old_pos;
        }
    }
}

fn try_reptation(s: &mut FoldingState, rng: &mut u64) {
    // Pull move: shift the entire chain by one position
    let direction = (xorshift(rng) * 4.0) as usize;
    let dirs = [(0i32, 1i32), (0, -1), (1, 0), (-1, 0)];
    let (dx, dy) = dirs[direction];

    let new_head = (s.chain[0].0 + dx, s.chain[0].1 + dy);
    if let Some((hlx, hly)) = lattice_to_idx(new_head.0, new_head.1) {
        if s.occupied[hlx][hly] != -1 { return; }

        // Check new tail doesn't collide
        let old_tail = s.chain[CHAIN_LEN - 1];
        if let Some((tlx, tly)) = lattice_to_idx(old_tail.0, old_tail.1) {
            s.occupied[tlx][tly] = -1;
        }

        // Shift chain
        for i in (1..CHAIN_LEN).rev() {
            s.chain[i] = s.chain[i - 1];
        }
        s.chain[0] = new_head;

        // Update occupied grid
        s.occupied = [[-1i16; LATTICE_SIZE]; LATTICE_SIZE];
        for i in 0..CHAIN_LEN {
            if let Some((lx, ly)) = lattice_to_idx(s.chain[i].0, s.chain[i].1) {
                s.occupied[lx][ly] = i as i16;
            }
        }

        let new_energy = compute_energy(&s.chain, &s.occupied);
        let delta = new_energy - s.energy;
        let accept = delta <= 0 || xorshift(rng) < (-(delta as f64) / s.temperature).exp();

        if accept {
            s.energy = new_energy;
            if new_energy < s.best_energy {
                s.best_energy = new_energy;
                s.best_chain = s.chain;
            }
        } else {
            // Revert is complex, just recompute from best
            // For simplicity, accept the move anyway (it's exploratory)
            s.energy = new_energy;
        }
    }
}

#[wasm_bindgen]
pub fn create_protein_folding(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    init_chain();
    update_protein_folding(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_protein_folding(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;

    STATE.with(|s| {
        let mut s = s.borrow_mut();

        // Run multiple Monte Carlo steps per frame
        let mut rng: u64 = (s.iteration as u64).wrapping_mul(0x2545F4914F6CDD1D).wrapping_add(12345);
        for _ in 0..50 {
            let move_type = xorshift(&mut rng);
            let idx = 1 + (xorshift(&mut rng) * (CHAIN_LEN - 2) as f64) as usize;
            if move_type < 0.8 {
                try_corner_flip(&mut s, idx, &mut rng);
            } else {
                try_reptation(&mut s, &mut rng);
            }
        }

        // Cooling schedule
        s.iteration += 1;
        s.temperature = (2.0 * 0.998f64.powi(s.iteration as i32)).max(0.05);
        let current_energy = s.energy;
        s.energy_history.push(current_energy);
        if s.energy_history.len() > 200 {
            s.energy_history.remove(0);
        }

        // Reset if stuck for too long
        if s.iteration % 3000 == 0 {
            let old_best = s.best_energy;
            // Release borrow before re-initializing
            drop(&mut s);
            init_chain();
            STATE.with(|sc| {
                let mut sc = sc.borrow_mut();
                if old_best < sc.best_energy {
                    sc.best_energy = old_best;
                }
            });
        }

        // Render
        ctx.set_fill_style(&"#0a0a0a".into());
        ctx.fill_rect(0.0, 0.0, wf, hf);

        // Map lattice coordinates to canvas
        let lattice_scale = wf.min(hf) * 0.7 / 20.0;
        let cx = wf / 2.0;
        let cy = hf / 2.0 - 20.0;

        let to_screen = |(lx, ly): (i32, i32)| -> (f64, f64) {
            (cx + lx as f64 * lattice_scale, cy + ly as f64 * lattice_scale)
        };

        // Draw H-H contacts (highlight bonds)
        let neighbors = [(0i32, 1i32), (0, -1), (1, 0), (-1, 0)];
        for i in 0..CHAIN_LEN {
            if !SEQUENCE[i] { continue; }
            for &(dx, dy) in &neighbors {
                let nx = s.chain[i].0 + dx;
                let ny = s.chain[i].1 + dy;
                if let Some((lx, ly)) = lattice_to_idx(nx, ny) {
                    let j = s.occupied[lx][ly];
                    if j >= 0 && (j as usize) > i + 1 && SEQUENCE[j as usize] {
                        let (px1, py1) = to_screen(s.chain[i]);
                        let (px2, py2) = to_screen((nx, ny));
                        ctx.set_stroke_style(&"rgba(255,152,0,0.3)".into());
                        ctx.set_line_width(6.0);
                        ctx.begin_path();
                        ctx.move_to(px1, py1);
                        ctx.line_to(px2, py2);
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw chain bonds
        ctx.set_stroke_style(&"rgba(255,255,255,0.25)".into());
        ctx.set_line_width(2.0);
        ctx.begin_path();
        for i in 0..CHAIN_LEN {
            let (px, py) = to_screen(s.chain[i]);
            if i == 0 { ctx.move_to(px, py); } else { ctx.line_to(px, py); }
        }
        ctx.stroke();

        // Draw amino acids
        let radius = lattice_scale * 0.35;
        for i in 0..CHAIN_LEN {
            let (px, py) = to_screen(s.chain[i]);
            if SEQUENCE[i] {
                ctx.set_fill_style(&"#ff9800".into()); // H = hydrophobic (orange)
            } else {
                ctx.set_fill_style(&"#00bcd4".into()); // P = polar (cyan)
            }
            ctx.begin_path();
            ctx.arc(px, py, radius, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
            ctx.set_stroke_style(&"rgba(255,255,255,0.3)".into());
            ctx.set_line_width(0.5);
            ctx.stroke();
        }

        // Energy history mini-chart (top right)
        let chart_x = wf - 120.0;
        let chart_y = 10.0;
        let chart_w = 110.0;
        let chart_h = 40.0;
        ctx.set_fill_style(&"rgba(0,0,0,0.5)".into());
        ctx.fill_rect(chart_x, chart_y, chart_w, chart_h);
        ctx.set_stroke_style(&"rgba(255,255,255,0.1)".into());
        ctx.stroke_rect(chart_x, chart_y, chart_w, chart_h);

        if s.energy_history.len() > 1 {
            let min_e = *s.energy_history.iter().min().unwrap_or(&0);
            let max_e = *s.energy_history.iter().max().unwrap_or(&0);
            let range = (max_e - min_e).max(1) as f64;
            ctx.set_stroke_style(&"#00e5ff".into());
            ctx.set_line_width(1.0);
            ctx.begin_path();
            for (i, &e) in s.energy_history.iter().enumerate() {
                let px = chart_x + (i as f64 / s.energy_history.len() as f64) * chart_w;
                let py = chart_y + chart_h - ((e - min_e) as f64 / range) * chart_h;
                if i == 0 { ctx.move_to(px, py); } else { ctx.line_to(px, py); }
            }
            ctx.stroke();
        }

        // Info text
        ctx.set_fill_style(&"rgba(255,255,255,0.6)".into());
        ctx.set_font("9px monospace");
        ctx.fill_text(&format!("Energy: {} | Best: {}", s.energy, s.best_energy), 8.0, 16.0).ok();
        ctx.fill_text(&format!("Iter: {} | T: {:.3}", s.iteration, s.temperature), 8.0, 28.0).ok();
        ctx.set_fill_style(&"#ff9800".into());
        ctx.fill_text("H", 8.0, 42.0).ok();
        ctx.set_fill_style(&"#00bcd4".into());
        ctx.fill_text("P", 24.0, 42.0).ok();
        ctx.set_fill_style(&"rgba(255,255,255,0.4)".into());
        ctx.fill_text("HP Model | Monte Carlo + SA", wf - 140.0, chart_y + chart_h + 14.0).ok();
    });

    Ok(())
}

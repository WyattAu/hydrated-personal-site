use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

/// Solar system with Kepler-compliant relative orbital periods.
/// Orbital speeds follow Kepler's 3rd law: T ∝ a^(3/2).

thread_local! {
    static TRAILS: std::cell::RefCell<Vec<Vec<(f64, f64)>>> = std::cell::RefCell::new(Vec::new());
}

// (semi_major_axis_px, eccentricity, size_px, color, orbital_period_years)
struct PlanetSpec {
    a: f64,        // semi-major axis in pixels
    ecc: f64,      // eccentricity
    size: f64,     // render radius
    color: &'static str,
    period: f64,   // orbital period in Earth years
    name: &'static str,
}

const PLANETS: [PlanetSpec; 8] = [
    PlanetSpec { a: 22.0,  ecc: 0.21, size: 1.5,  color: "#9e9e9e", period: 0.24,  name: "Mercury" },
    PlanetSpec { a: 36.0,  ecc: 0.01, size: 3.0,  color: "#ff9800", period: 0.62,  name: "Venus" },
    PlanetSpec { a: 52.0,  ecc: 0.02, size: 3.5,  color: "#2196f3", period: 1.0,   name: "Earth" },
    PlanetSpec { a: 70.0,  ecc: 0.09, size: 2.5,  color: "#f44336", period: 1.88,  name: "Mars" },
    PlanetSpec { a: 100.0, ecc: 0.05, size: 9.0,  color: "#ff8a65", period: 11.86, name: "Jupiter" },
    PlanetSpec { a: 128.0, ecc: 0.06, size: 7.5,  color: "#ffcc80", period: 29.46, name: "Saturn" },
    PlanetSpec { a: 150.0, ecc: 0.05, size: 5.0,  color: "#80deea", period: 84.01, name: "Uranus" },
    PlanetSpec { a: 170.0, ecc: 0.01, size: 4.5,  color: "#42a5f5", period: 164.8, name: "Neptune" },
];

#[wasm_bindgen]
pub fn create_solar(canvas_id: &str, w: u32, h: u32) -> Result<(), JsValue> {
    TRAILS.with(|t| {
        t.borrow_mut().clear();
        for _ in 0..PLANETS.len() {
            t.borrow_mut().push(Vec::new());
        }
    });
    update_solar(canvas_id, w, h, 0.0)
}

#[wasm_bindgen]
pub fn update_solar(canvas_id: &str, w: u32, h: u32, _t: f64) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).ok_or_else(|| JsValue::from_str("Canvas not found"))?;
    let canvas: HtmlCanvasElement = canvas.dyn_into()?;
    canvas.set_width(w); canvas.set_height(h);
    let ctx: CanvasRenderingContext2d = canvas.get_context("2d")?.unwrap().dyn_into()?;
    let wf = w as f64;
    let hf = h as f64;
    let cx = wf / 2.0;
    let cy = hf / 2.0;
    let t = js_sys::Date::now() as f64 / 3000.0; // time multiplier

    // Clear with fade for star trail effect
    ctx.set_fill_style(&"#0a0a0a".into());
    ctx.fill_rect(0.0, 0.0, wf, hf);

    // Draw stars
    let mut star_rng = 42u64;
    for _ in 0..80 {
        star_rng = star_rng.wrapping_mul(6364136223846793005).wrapping_add(1);
        let sx = ((star_rng >> 33) as f64 / (1u64 << 31) as f64) * wf;
        star_rng = star_rng.wrapping_mul(6364136223846793005).wrapping_add(1);
        let sy = ((star_rng >> 33) as f64 / (1u64 << 31) as f64) * hf;
        star_rng = star_rng.wrapping_mul(6364136223846793005).wrapping_add(1);
        let brightness = 0.2 + ((star_rng >> 40) as f64 / (1u64 << 24) as f64) * 0.5;
        ctx.set_fill_style(&format!("rgba(255,255,255,{})", brightness).into());
        ctx.fill_rect(sx, sy, 1.0, 1.0);
    }

    // Sun with glow (concentric circles)
    for (radius, alpha) in [(40.0, 0.05), (30.0, 0.1), (20.0, 0.2)] {
        ctx.set_fill_style(&format!("rgba(255,152,0,{})", alpha).into());
        ctx.begin_path();
        ctx.arc(cx, cy, radius, 0.0, std::f64::consts::TAU).ok();
        ctx.fill();
    }
    ctx.set_fill_style(&"#ffeb3b".into());
    ctx.begin_path();
    ctx.arc(cx, cy, 12.0, 0.0, std::f64::consts::TAU).ok();
    ctx.fill();

    // Draw planets with elliptical orbits
    TRAILS.with(|trails_cell| {
        let mut trails = trails_cell.borrow_mut();

        for (i, planet) in PLANETS.iter().enumerate() {
            let b = planet.a * (1.0 - planet.ecc * planet.ecc).sqrt(); // semi-minor axis
            let mean_anomaly = t * 2.0 * std::f64::consts::PI / planet.period + i as f64 * 0.7;

            // Simple Kepler approximation: use mean anomaly directly for position
            // (full Kepler equation solver would iterate E - e*sin(E) = M)
            let e = planet.ecc;
            let mut ea = mean_anomaly;
            for _ in 0..5 {
                ea = ea - (ea - e * ea.sin() - mean_anomaly) / (1.0 - e * ea.cos());
            }

            // Position relative to focus (sun at focus, not center)
            let x_orbit = planet.a * (ea.cos() - e);
            let y_orbit = b * ea.sin();

            let px = cx + x_orbit;
            let py = cy + y_orbit;

            // Draw orbit ellipse (faint)
            ctx.set_stroke_style(&"rgba(255,255,255,0.04)".into());
            ctx.set_line_width(1.0);
            ctx.begin_path();
            ctx.ellipse(cx - planet.a * e, cy, planet.a, b, 0.0, 0.0, std::f64::consts::TAU).ok();
            ctx.stroke();

            // Update trail
            if trails.len() > i {
                let trail = &mut trails[i];
                trail.push((px, py));
                if trail.len() > 100 {
                    trail.remove(0);
                }
                // Draw trail
                for (ti, &(tx, ty)) in trail.iter().enumerate() {
                    let alpha = (ti as f64 / trail.len() as f64) * 0.3;
                    ctx.set_fill_style(&format!("{}{}", planet.color, if alpha > 0.1 { "" } else { "" }).into());
                    ctx.set_global_alpha(alpha);
                    ctx.begin_path();
                    ctx.arc(tx, ty, 1.0, 0.0, std::f64::consts::TAU).ok();
                    ctx.fill();
                }
                ctx.set_global_alpha(1.0);
            }

            // Draw planet
            ctx.set_fill_style(&planet.color.into());
            ctx.begin_path();
            ctx.arc(px, py, planet.size, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();

            // Saturn ring
            if planet.name == "Saturn" {
                ctx.set_stroke_style(&"rgba(255,204,128,0.5)".into());
                ctx.set_line_width(2.0);
                ctx.begin_path();
                ctx.ellipse(px, py, planet.size + 4.0, planet.size * 0.4, 0.3, 0.0, std::f64::consts::TAU).ok();
                ctx.stroke();
            }

            // Label
            ctx.set_fill_style(&"rgba(255,255,255,0.3)".into());
            ctx.set_font("8px monospace");
            ctx.fill_text(planet.name, px + planet.size + 2.0, py + 3.0).ok();
        }
    });

    // Info
    ctx.set_fill_style(&"rgba(255,255,255,0.4)".into());
    ctx.set_font("9px monospace");
    ctx.fill_text("Kepler orbits | All 8 planets", 8.0, hf - 8.0).ok();

    Ok(())
}

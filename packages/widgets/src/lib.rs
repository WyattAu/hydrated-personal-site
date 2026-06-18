mod science;
mod devtools;
mod finance;
mod creative;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

pub use science::fourier::create_fourier_viz;
pub use science::cellular::create_cellular_automata;
pub use science::climate::{create_climate, update_climate};
pub use science::physics::create_physics;

pub use devtools::regex::create_regex_playground;
pub use devtools::network::{create_network, update_network};

pub use finance::order_book::{create_order_book, update_order_book};
pub use finance::treemap::{create_treemap, update_treemap};
pub use finance::btc_health::{create_btc_health, update_btc_health};
pub use finance::correlation::{create_correlation, update_correlation};
pub use finance::backtest::{create_backtest, update_backtest};

pub use creative::generative::{create_generative, update_generative};
pub use creative::colorblind::{create_colorblind, update_colorblind};

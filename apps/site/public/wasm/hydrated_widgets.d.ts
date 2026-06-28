/* tslint:disable */
/* eslint-disable */

export class AudioVisualizer {
    free(): void;
    [Symbol.dispose](): void;
    fft_size(): number;
    frequency_bins(): number;
    get_frequency_data(): Float32Array;
    get_time_data(): Float32Array;
    constructor(canvas_id: string, width: number, height: number);
    process_fft(input: Float32Array): Float32Array;
    set_time_data(data: Float32Array): void;
}

export class Body {
    free(): void;
    [Symbol.dispose](): void;
    constructor(x: number, y: number, vx: number, vy: number, mass: number);
    mass: number;
    vx: number;
    vy: number;
    x: number;
    y: number;
}

export class NBodySimulation {
    free(): void;
    [Symbol.dispose](): void;
    add_body(x: number, y: number, vx: number, vy: number, mass: number): void;
    body_count(): number;
    clear(): void;
    get_masses(): Float64Array;
    get_positions(): Float64Array;
    constructor(canvas_id: string, width: number, height: number);
    set_dt(dt: number): void;
    set_gravity(g: number): void;
    step(): void;
}

export class TerrainGenerator {
    free(): void;
    [Symbol.dispose](): void;
    generate(width: number, height: number, scale: number): Float64Array;
    get_height(x: number, y: number): number;
    constructor(seed: number, octaves: number, persistence: number);
    octaves(): number;
    persistence(): number;
    seed(): number;
    set_octaves(octaves: number): void;
    set_persistence(persistence: number): void;
    set_scale(scale: number): void;
    set_seed(seed: number): void;
}

export function create_audio_visualizer(canvas_id: string, width: number, height: number): void;

export function create_backtest(canvas_id: string, width: number, height: number): void;

export function create_boids(canvas_id: string, w: number, h: number): void;

export function create_btc_health(canvas_id: string, width: number, height: number): void;

/**
 * Elementary cellular automaton explorer.
 */
export function create_ca_explorer(canvas_id: string, w: number, h: number): void;

export function create_cellular_automata(canvas_id: string, width: number, height: number): void;

export function create_climate(canvas_id: string, width: number, height: number): void;

export function create_colorblind(canvas_id: string, width: number, height: number): void;

export function create_correlation(canvas_id: string, width: number, height: number): void;

export function create_double_pendulum(canvas_id: string, w: number, h: number): void;

/**
 * Fluid dynamics smoke simulation.
 */
export function create_fluids(canvas_id: string, w: number, h: number): void;

export function create_fourier_viz(canvas_id: string, width: number, height: number): void;

export function create_generative(canvas_id: string, width: number, height: number): void;

/**
 * Gradient descent on loss landscape.
 */
export function create_gradient_descent(canvas_id: string, w: number, h: number): void;

export function create_kmeans(canvas_id: string, w: number, h: number): void;

/**
 * Lightning Network topology.
 */
export function create_lightning(canvas_id: string, w: number, h: number): void;

export function create_lorenz(canvas_id: string, w: number, h: number): void;

export function create_mandelbrot(canvas_id: string, w: number, h: number): void;

export function create_nbody_simulation(canvas_id: string, width: number, height: number): void;

export function create_network(canvas_id: string, width: number, height: number): void;

/**
 * Neural network forward pass visualization.
 */
export function create_neural_net(canvas_id: string, w: number, h: number): void;

export function create_order_book(canvas_id: string, width: number, height: number): void;

export function create_physics(canvas_id: string, width: number, height: number): void;

/**
 * Gray-Scott Turing pattern formation.
 */
export function create_reaction_diffusion(canvas_id: string, w: number, h: number): void;

export function create_regex_playground(canvas_id: string, width: number, height: number): void;

/**
 * Sankey flow diagram.
 */
export function create_sankey(canvas_id: string, w: number, h: number): void;

export function create_solar(canvas_id: string, w: number, h: number): void;

/**
 * Frequency spectrogram.
 */
export function create_spectrogram(canvas_id: string, w: number, h: number): void;

export function create_terrain_generator(canvas_id: string, width: number, height: number): void;

/**
 * Trade flow particle system.
 */
export function create_trade_flow(canvas_id: string, w: number, h: number): void;

export function create_treemap(canvas_id: string, width: number, height: number): void;

/**
 * t-SNE dimensionality reduction.
 */
export function create_tsne(canvas_id: string, w: number, h: number): void;

/**
 * 3D implied volatility surface.
 */
export function create_vol_surface(canvas_id: string, w: number, h: number): void;

/**
 * Voronoi treemap animation.
 */
export function create_voronoi(canvas_id: string, w: number, h: number): void;

/**
 * 2D wave equation simulation.
 */
export function create_wave(canvas_id: string, w: number, h: number): void;

export function main(): void;

/**
 * Concentration analysis from portfolio weights.
 * Returns JSON: { hhi, normalised_hhi, effective_n, entropy, max_entropy, top5, top10, gini, classification }
 */
export function quant_concentration(weights: Float64Array): string;

/**
 * Correlation matrix from a returns matrix (N assets x T periods, row-major).
 */
export function quant_correlation_matrix(returns: Float64Array, n_assets: number, n_periods: number): string;

/**
 * Drawdown analysis from price series.
 * Returns JSON: { underwater, max_drawdown, max_dd_duration, current_drawdown, calmar, ulcer, pain }
 */
export function quant_drawdown(prices: Float64Array, periods_per_year: number): string;

/**
 * Factor exposure regression (OLS).
 * Returns JSON: { alpha, betas, r_squared, adj_r_squared, f_statistic, t_stats }
 */
export function quant_factor_regression(y: Float64Array, x: Float64Array, n_factors: number, n_obs: number): string;

/**
 * GARCH(1,1) fit and forecast.
 */
export function quant_garch(returns: Float64Array, forecast_steps: number): string;

/**
 * Black-Scholes call Greeks across a spot price range.
 * Returns JSON: { spot: [...], delta: [...], gamma: [...], theta: [...], vega: [...], rho: [...] }
 */
export function quant_greeks(spot_min: number, spot_max: number, num_points: number, strike: number, time_to_expiry: number, risk_free_rate: number, implied_vol: number, is_call: boolean): string;

/**
 * Monte Carlo GBM simulation from historical close prices.
 * Returns JSON: { drift, volatility, s0, p5, p25, p50, p75, p95 }
 */
export function quant_montecarlo(closes: Float64Array, periods_per_year: number, horizon_days: number, num_paths: number): string;

/**
 * Seed the WASM PRNG from JS (use crypto.getRandomValues for entropy).
 */
export function quant_seed(s0: number, s1: number): void;

/**
 * Value at Risk and Expected Shortfall from a return series.
 */
export function quant_var(returns: Float64Array, alpha: number): string;

/**
 * Nelson-Siegel yield curve fit.
 */
export function quant_yield_curve(maturities: Float64Array, yields: Float64Array): string;

export function update_backtest(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_boids(canvas_id: string, w: number, h: number, _t: number): void;

export function update_btc_health(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_ca_explorer(canvas_id: string, w: number, h: number, time: number): void;

export function update_cellular_automata(canvas_id: string, width: number, height: number, _time: number): void;

export function update_climate(canvas_id: string, width: number, height: number, csv_data: string): void;

export function update_colorblind(canvas_id: string, width: number, height: number, img_data_json: string): void;

export function update_correlation(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_double_pendulum(canvas_id: string, w: number, h: number, _t: number): void;

export function update_fluids(canvas_id: string, w: number, h: number, time: number): void;

export function update_fourier_viz(canvas_id: string, width: number, height: number, time: number): void;

export function update_generative(canvas_id: string, width: number, height: number, seed: number, speed: number, density: number, time: number): void;

export function update_gradient_descent(canvas_id: string, w: number, h: number, time: number): void;

export function update_kmeans(canvas_id: string, w: number, h: number, _t: number): void;

export function update_lightning(canvas_id: string, w: number, h: number, time: number): void;

export function update_lorenz(canvas_id: string, w: number, h: number, _t: number): void;

export function update_mandelbrot(canvas_id: string, w: number, h: number, _t: number): void;

export function update_network(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_neural_net(canvas_id: string, w: number, h: number, time: number): void;

export function update_order_book(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_physics(canvas_id: string, width: number, height: number, _time: number): void;

export function update_reaction_diffusion(canvas_id: string, w: number, h: number, time: number): void;

export function update_regex_playground(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_sankey(canvas_id: string, w: number, h: number, time: number): void;

export function update_solar(canvas_id: string, w: number, h: number, _t: number): void;

export function update_spectrogram(canvas_id: string, w: number, h: number, time: number): void;

export function update_trade_flow(canvas_id: string, w: number, h: number, time: number): void;

export function update_treemap(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_tsne(canvas_id: string, w: number, h: number, time: number): void;

export function update_vol_surface(canvas_id: string, w: number, h: number, time: number): void;

export function update_voronoi(canvas_id: string, w: number, h: number, time: number): void;

export function update_wave(canvas_id: string, w: number, h: number, time: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_audiovisualizer_free: (a: number, b: number) => void;
    readonly __wbg_body_free: (a: number, b: number) => void;
    readonly __wbg_get_body_mass: (a: number) => number;
    readonly __wbg_get_body_vx: (a: number) => number;
    readonly __wbg_get_body_vy: (a: number) => number;
    readonly __wbg_get_body_x: (a: number) => number;
    readonly __wbg_get_body_y: (a: number) => number;
    readonly __wbg_nbodysimulation_free: (a: number, b: number) => void;
    readonly __wbg_set_body_mass: (a: number, b: number) => void;
    readonly __wbg_set_body_vx: (a: number, b: number) => void;
    readonly __wbg_set_body_vy: (a: number, b: number) => void;
    readonly __wbg_set_body_x: (a: number, b: number) => void;
    readonly __wbg_set_body_y: (a: number, b: number) => void;
    readonly __wbg_terraingenerator_free: (a: number, b: number) => void;
    readonly audiovisualizer_fft_size: (a: number) => number;
    readonly audiovisualizer_frequency_bins: (a: number) => number;
    readonly audiovisualizer_get_frequency_data: (a: number) => [number, number];
    readonly audiovisualizer_get_time_data: (a: number) => [number, number];
    readonly audiovisualizer_new: (a: number, b: number, c: number, d: number) => number;
    readonly audiovisualizer_process_fft: (a: number, b: number, c: number) => [number, number];
    readonly audiovisualizer_set_time_data: (a: number, b: number, c: number) => void;
    readonly body_new: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly create_audio_visualizer: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_backtest: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_boids: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_btc_health: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_ca_explorer: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_cellular_automata: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_climate: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_colorblind: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_correlation: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_double_pendulum: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_fluids: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_fourier_viz: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_generative: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_gradient_descent: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_kmeans: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_lightning: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_lorenz: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_mandelbrot: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_nbody_simulation: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_network: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_neural_net: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_order_book: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_physics: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_reaction_diffusion: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_regex_playground: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_sankey: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_solar: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_spectrogram: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_terrain_generator: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_trade_flow: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_treemap: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_tsne: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_vol_surface: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_voronoi: (a: number, b: number, c: number, d: number) => [number, number];
    readonly create_wave: (a: number, b: number, c: number, d: number) => [number, number];
    readonly main: () => void;
    readonly nbodysimulation_add_body: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly nbodysimulation_body_count: (a: number) => number;
    readonly nbodysimulation_clear: (a: number) => void;
    readonly nbodysimulation_get_masses: (a: number) => [number, number];
    readonly nbodysimulation_get_positions: (a: number) => [number, number];
    readonly nbodysimulation_new: (a: number, b: number, c: number, d: number) => number;
    readonly nbodysimulation_set_dt: (a: number, b: number) => void;
    readonly nbodysimulation_set_gravity: (a: number, b: number) => void;
    readonly nbodysimulation_step: (a: number) => void;
    readonly quant_concentration: (a: number, b: number) => [number, number];
    readonly quant_correlation_matrix: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_drawdown: (a: number, b: number, c: number) => [number, number];
    readonly quant_factor_regression: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly quant_garch: (a: number, b: number, c: number) => [number, number];
    readonly quant_greeks: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly quant_montecarlo: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly quant_seed: (a: number, b: number) => void;
    readonly quant_var: (a: number, b: number, c: number) => [number, number];
    readonly quant_yield_curve: (a: number, b: number, c: number, d: number) => [number, number];
    readonly terraingenerator_generate: (a: number, b: number, c: number, d: number) => [number, number];
    readonly terraingenerator_get_height: (a: number, b: number, c: number) => number;
    readonly terraingenerator_new: (a: number, b: number, c: number) => number;
    readonly terraingenerator_octaves: (a: number) => number;
    readonly terraingenerator_seed: (a: number) => number;
    readonly terraingenerator_set_octaves: (a: number, b: number) => void;
    readonly terraingenerator_set_persistence: (a: number, b: number) => void;
    readonly terraingenerator_set_scale: (a: number, b: number) => void;
    readonly terraingenerator_set_seed: (a: number, b: number) => void;
    readonly update_backtest: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_boids: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_btc_health: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_ca_explorer: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_cellular_automata: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_climate: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_colorblind: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_correlation: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_double_pendulum: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_fluids: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_fourier_viz: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_generative: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly update_gradient_descent: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_kmeans: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_lightning: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_lorenz: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_mandelbrot: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_network: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_neural_net: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_order_book: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_physics: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_reaction_diffusion: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_regex_playground: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_sankey: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_solar: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_spectrogram: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_trade_flow: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_treemap: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly update_tsne: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_vol_surface: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_voronoi: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly update_wave: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly terraingenerator_persistence: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

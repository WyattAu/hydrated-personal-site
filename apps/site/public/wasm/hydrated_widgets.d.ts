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

export function create_ca_explorer(canvas_id: string, w: number, h: number): void;

export function create_cellular_automata(canvas_id: string, width: number, height: number): void;

export function create_climate(canvas_id: string, width: number, height: number): void;

export function create_colorblind(canvas_id: string, width: number, height: number): void;

export function create_correlation(canvas_id: string, width: number, height: number): void;

export function create_double_pendulum(canvas_id: string, w: number, h: number): void;

export function create_fluids(canvas_id: string, w: number, h: number): void;

/**
 * wave_type: 0=sine, 1=square, 2=triangle, 3=sawtooth, 4=pulse
 */
export function create_fourier_viz(canvas_id: string, width: number, height: number): void;

export function create_generative(canvas_id: string, width: number, height: number): void;

export function create_gradient_descent(canvas_id: string, w: number, h: number): void;

export function create_kmeans(canvas_id: string, w: number, h: number): void;

/**
 * Lightning Network topology.
 */
export function create_lightning(canvas_id: string, w: number, h: number): void;

export function create_lorenz(canvas_id: string, w: number, h: number): void;

/**
 * Renders the Mandelbrot set at a given center and zoom level.
 * center_x/center_y: complex-plane coordinates of the viewport center
 * scale: half-width of the visible region in complex plane (smaller = zoomed in)
 * max_iter: iteration cap (higher = more detail when zoomed in)
 */
export function create_mandelbrot(canvas_id: string, w: number, h: number): void;

export function create_nbody_simulation(canvas_id: string, width: number, height: number): void;

export function create_network(canvas_id: string, width: number, height: number): void;

export function create_neural_net(canvas_id: string, w: number, h: number): void;

export function create_order_book(canvas_id: string, width: number, height: number): void;

export function create_physics(canvas_id: string, width: number, height: number): void;

export function create_protein_folding(canvas_id: string, w: number, h: number): void;

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

export function create_tsne(canvas_id: string, w: number, h: number): void;

/**
 * 3D Implied Volatility Surface — rotating wireframe with labeled axes.
 * Shows the classic vol smile/skew shape: high IV at deep ITM/OTM,
 * lower at ATM. Term structure decreases with expiry for equity indices.
 */
export function create_vol_surface(canvas_id: string, w: number, h: number): void;

/**
 * Voronoi treemap animation.
 */
export function create_voronoi(canvas_id: string, w: number, h: number): void;

export function create_wave(canvas_id: string, w: number, h: number): void;

export function main(): void;

/**
 * Black-Litterman portfolio optimization.
 * Combines market equilibrium prior with investor views.
 */
export function quant_black_litterman(returns: Float64Array, n_assets: number, n_periods: number, views: Float64Array, picking: Float64Array, n_views: number, risk_free: number, tau: number): string;

/**
 * Engle-Granger cointegration test for two price series.
 * Returns JSON: { hedge_ratio, intercept, adf_statistic, half_life, is_cointegrated, z_score }
 */
export function quant_cointegration(y: Float64Array, x: Float64Array): string;

/**
 * Component VaR decomposition.
 */
export function quant_component_var(returns: Float64Array, n_assets: number, n_periods: number, weights: Float64Array, alpha: number): string;

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
 * Efficient frontier computation.
 * Returns JSON: {
 *   random: [{ret, risk, sharpe}, ...],
 *   frontier: [{ret, risk, sharpe}, ...],
 *   assets: [{label, ret, risk}, ...],
 *   tangency: {ret, risk, sharpe},
 *   min_variance: {ret, risk}
 * }
 */
export function quant_efficient_frontier(returns: Float64Array, n_assets: number, n_periods: number, risk_free: number, n_random: number, n_frontier: number, periods_per_year: number): string;

/**
 * Factor exposure regression (OLS).
 * Returns JSON: { alpha, betas, r_squared, adj_r_squared, f_statistic, t_stats }
 */
export function quant_factor_regression(y: Float64Array, x: Float64Array, n_factors: number, n_obs: number): string;

/**
 * Forward rate curve from Nelson-Siegel parameters.
 * Derives instantaneous forward rates: f(τ) = d/dτ [τ · y(τ)]
 */
export function quant_forward_rates(maturities: Float64Array, yields: Float64Array): string;

/**
 * Full weighted ETF holdings overlap analysis.
 */
export function quant_full_overlap(tickers_a: string, weights_a: Float64Array, tickers_b: string, weights_b: Float64Array): string;

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
 * Holdings overlap analysis (Jaccard index).
 */
export function quant_holdings_overlap(a: string, b: string): string;

/**
 * Hierarchical Risk Parity allocation.
 */
export function quant_hrp(returns: Float64Array, n_assets: number, n_periods: number): string;

/**
 * Black-Scholes implied volatility solver (Newton-Raphson).
 */
export function quant_implied_vol(market_price: number, spot: number, strike: number, t: number, r: number, is_call: boolean): number;

/**
 * Kelly criterion analysis from returns.
 */
export function quant_kelly(returns: Float64Array): string;

/**
 * Liquidity analysis from OHLCV data.
 * Returns JSON: { amihud, cs_spread, roll_spread, kyle_lambda, avg_dollar_volume }
 */
export function quant_liquidity(highs: Float64Array, lows: Float64Array, closes: Float64Array, volumes: Float64Array): string;

/**
 * Monte Carlo GBM simulation from historical close prices.
 * Returns JSON: { drift, volatility, s0, p5, p25, p50, p75, p95 }
 */
export function quant_montecarlo(closes: Float64Array, periods_per_year: number, horizon_days: number, num_paths: number): string;

/**
 * Pairs trading signal from two cointegrated price series.
 */
export function quant_pairs_signal(y: Float64Array, x: Float64Array): string;

/**
 * Realized volatility decomposition (bipower variation).
 * Returns JSON: { realized_var, bipower_var, continuous_var, jump_var, jump_ratio, annualized_vol, jump_days }
 */
export function quant_realized_vol(returns: Float64Array): string;

/**
 * Market regime detection via 2-state Gaussian HMM.
 * Returns JSON: { states_tail, transition, means, variances, probs_tail, current_regime, regime_label }
 */
export function quant_regime(returns: Float64Array): string;

/**
 * Risk-adjusted return ratios (Sharpe, Sortino, Calmar, Treynor).
 */
export function quant_risk_ratios(closes: Float64Array, risk_free: number, periods_per_year: number): string;

/**
 * Rolling multi-factor regression time series.
 */
export function quant_rolling_factor(y: Float64Array, x: Float64Array, n_factors: number, window: number, step: number): string;

/**
 * Seed the WASM PRNG from JS (use crypto.getRandomValues for entropy).
 */
export function quant_seed(s0: number, s1: number): void;

/**
 * Historical stress test on a portfolio.
 */
export function quant_stress_test(symbols_json: string, weights: Float64Array): string;

/**
 * Tail dependence (copula) analysis for two return series.
 * Returns JSON: { lower, upper, kendall_tau, spearman_rho }
 */
export function quant_tail_dependence(x: Float64Array, y: Float64Array): string;

/**
 * N×N tail dependence matrix (lower tail, 5% level).
 */
export function quant_tail_matrix(returns: Float64Array, n_assets: number, n_periods: number): string;

/**
 * Value at Risk and Expected Shortfall from a return series.
 */
export function quant_var(returns: Float64Array, alpha: number): string;

/**
 * Nelson-Siegel yield curve fit.
 */
export function quant_yield_curve(maturities: Float64Array, yields: Float64Array): string;

export function render_mandelbrot(canvas_id: string, w: number, h: number, center_x: number, center_y: number, scale: number, max_iter: number): void;

export function update_backtest(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_boids(canvas_id: string, w: number, h: number, _t: number): void;

export function update_btc_health(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_ca_explorer(canvas_id: string, w: number, h: number, _t: number): void;

export function update_cellular_automata(canvas_id: string, width: number, height: number, _time: number): void;

export function update_climate(canvas_id: string, width: number, height: number, csv_data: string): void;

export function update_colorblind(canvas_id: string, width: number, height: number, img_data_json: string): void;

export function update_correlation(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_double_pendulum(canvas_id: string, w: number, h: number, _t: number): void;

export function update_fluids(canvas_id: string, w: number, h: number, time: number): void;

export function update_fourier_viz(canvas_id: string, width: number, height: number, time: number): void;

export function update_fourier_viz_full(canvas_id: string, width: number, height: number, time: number, harmonics: number, wave_type: number): void;

export function update_generative(canvas_id: string, width: number, height: number, _seed: number, _speed: number, _density: number, _time: number): void;

export function update_gradient_descent(canvas_id: string, w: number, h: number, _time: number): void;

export function update_kmeans(canvas_id: string, w: number, h: number, _t: number): void;

export function update_lightning(canvas_id: string, w: number, h: number, time: number): void;

export function update_lorenz(canvas_id: string, w: number, h: number, _t: number): void;

export function update_mandelbrot(canvas_id: string, w: number, h: number, _t: number): void;

export function update_network(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_neural_net(canvas_id: string, w: number, h: number, _time: number): void;

export function update_order_book(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_physics(canvas_id: string, width: number, height: number, _time: number): void;

export function update_protein_folding(canvas_id: string, w: number, h: number, _t: number): void;

export function update_reaction_diffusion(canvas_id: string, w: number, h: number, _time: number): void;

export function update_regex_playground(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_sankey(canvas_id: string, w: number, h: number, time: number): void;

export function update_solar(canvas_id: string, w: number, h: number, _t: number): void;

export function update_spectrogram(canvas_id: string, w: number, h: number, time: number): void;

export function update_trade_flow(canvas_id: string, w: number, h: number, time: number): void;

export function update_treemap(canvas_id: string, width: number, height: number, data_json: string): void;

export function update_tsne(canvas_id: string, w: number, h: number, _time: number): void;

export function update_vol_surface(canvas_id: string, w: number, h: number, _t: number): void;

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
    readonly create_protein_folding: (a: number, b: number, c: number, d: number) => [number, number];
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
    readonly quant_black_litterman: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly quant_cointegration: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_component_var: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly quant_concentration: (a: number, b: number) => [number, number];
    readonly quant_correlation_matrix: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_drawdown: (a: number, b: number, c: number) => [number, number];
    readonly quant_efficient_frontier: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly quant_factor_regression: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly quant_forward_rates: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_full_overlap: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly quant_garch: (a: number, b: number, c: number) => [number, number];
    readonly quant_greeks: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly quant_holdings_overlap: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_hrp: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_implied_vol: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly quant_kelly: (a: number, b: number) => [number, number];
    readonly quant_liquidity: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly quant_montecarlo: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly quant_pairs_signal: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_realized_vol: (a: number, b: number) => [number, number];
    readonly quant_regime: (a: number, b: number) => [number, number];
    readonly quant_risk_ratios: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_rolling_factor: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly quant_seed: (a: number, b: number) => void;
    readonly quant_stress_test: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_tail_dependence: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_tail_matrix: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quant_var: (a: number, b: number, c: number) => [number, number];
    readonly quant_yield_curve: (a: number, b: number, c: number, d: number) => [number, number];
    readonly render_mandelbrot: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
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
    readonly update_fourier_viz_full: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
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
    readonly update_protein_folding: (a: number, b: number, c: number, d: number, e: number) => [number, number];
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

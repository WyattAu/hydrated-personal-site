/* @ts-self-types="./hydrated_widgets.d.ts" */

export class AudioVisualizer {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    AudioVisualizerFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_audiovisualizer_free(ptr, 0);
  }
  /**
   * @returns {number}
   */
  fft_size() {
    const ret = wasm.audiovisualizer_fft_size(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  frequency_bins() {
    const ret = wasm.audiovisualizer_frequency_bins(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {Float32Array}
   */
  get_frequency_data() {
    const ret = wasm.audiovisualizer_get_frequency_data(this.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {Float32Array}
   */
  get_time_data() {
    const ret = wasm.audiovisualizer_get_time_data(this.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @param {string} canvas_id
   * @param {number} width
   * @param {number} height
   */
  constructor(canvas_id, width, height) {
    const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.audiovisualizer_new(ptr0, len0, width, height);
    this.__wbg_ptr = ret;
    AudioVisualizerFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {Float32Array} input
   * @returns {Float32Array}
   */
  process_fft(input) {
    const ptr0 = passArrayF32ToWasm0(input, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.audiovisualizer_process_fft(this.__wbg_ptr, ptr0, len0);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
  }
  /**
   * @param {Float32Array} data
   */
  set_time_data(data) {
    const ptr0 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.audiovisualizer_set_time_data(this.__wbg_ptr, ptr0, len0);
  }
}
if (Symbol.dispose) AudioVisualizer.prototype[Symbol.dispose] = AudioVisualizer.prototype.free;

export class Body {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    BodyFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_body_free(ptr, 0);
  }
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {number} mass
   */
  constructor(x, y, vx, vy, mass) {
    const ret = wasm.body_new(x, y, vx, vy, mass);
    this.__wbg_ptr = ret;
    BodyFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get mass() {
    const ret = wasm.__wbg_get_body_mass(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  get vx() {
    const ret = wasm.__wbg_get_body_vx(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  get vy() {
    const ret = wasm.__wbg_get_body_vy(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  get x() {
    const ret = wasm.__wbg_get_body_x(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  get y() {
    const ret = wasm.__wbg_get_body_y(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {number} arg0
   */
  set mass(arg0) {
    wasm.__wbg_set_body_mass(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} arg0
   */
  set vx(arg0) {
    wasm.__wbg_set_body_vx(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} arg0
   */
  set vy(arg0) {
    wasm.__wbg_set_body_vy(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} arg0
   */
  set x(arg0) {
    wasm.__wbg_set_body_x(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} arg0
   */
  set y(arg0) {
    wasm.__wbg_set_body_y(this.__wbg_ptr, arg0);
  }
}
if (Symbol.dispose) Body.prototype[Symbol.dispose] = Body.prototype.free;

export class NBodySimulation {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    NBodySimulationFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_nbodysimulation_free(ptr, 0);
  }
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {number} mass
   */
  add_body(x, y, vx, vy, mass) {
    wasm.nbodysimulation_add_body(this.__wbg_ptr, x, y, vx, vy, mass);
  }
  /**
   * @returns {number}
   */
  body_count() {
    const ret = wasm.nbodysimulation_body_count(this.__wbg_ptr);
    return ret >>> 0;
  }
  clear() {
    wasm.nbodysimulation_clear(this.__wbg_ptr);
  }
  /**
   * @returns {Float64Array}
   */
  get_masses() {
    const ret = wasm.nbodysimulation_get_masses(this.__wbg_ptr);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
  }
  /**
   * @returns {Float64Array}
   */
  get_positions() {
    const ret = wasm.nbodysimulation_get_positions(this.__wbg_ptr);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
  }
  /**
   * @param {string} canvas_id
   * @param {number} width
   * @param {number} height
   */
  constructor(canvas_id, width, height) {
    const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.nbodysimulation_new(ptr0, len0, width, height);
    this.__wbg_ptr = ret;
    NBodySimulationFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {number} dt
   */
  set_dt(dt) {
    wasm.nbodysimulation_set_dt(this.__wbg_ptr, dt);
  }
  /**
   * @param {number} g
   */
  set_gravity(g) {
    wasm.nbodysimulation_set_gravity(this.__wbg_ptr, g);
  }
  step() {
    wasm.nbodysimulation_step(this.__wbg_ptr);
  }
}
if (Symbol.dispose) NBodySimulation.prototype[Symbol.dispose] = NBodySimulation.prototype.free;

export class TerrainGenerator {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    TerrainGeneratorFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_terraingenerator_free(ptr, 0);
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} scale
   * @returns {Float64Array}
   */
  generate(width, height, scale) {
    const ret = wasm.terraingenerator_generate(this.__wbg_ptr, width, height, scale);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
  }
  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  get_height(x, y) {
    const ret = wasm.terraingenerator_get_height(this.__wbg_ptr, x, y);
    return ret;
  }
  /**
   * @param {number} seed
   * @param {number} octaves
   * @param {number} persistence
   */
  constructor(seed, octaves, persistence) {
    const ret = wasm.terraingenerator_new(seed, octaves, persistence);
    this.__wbg_ptr = ret;
    TerrainGeneratorFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  octaves() {
    const ret = wasm.terraingenerator_octaves(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  persistence() {
    const ret = wasm.terraingenerator_persistence(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  seed() {
    const ret = wasm.terraingenerator_seed(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number} octaves
   */
  set_octaves(octaves) {
    wasm.terraingenerator_set_octaves(this.__wbg_ptr, octaves);
  }
  /**
   * @param {number} persistence
   */
  set_persistence(persistence) {
    wasm.terraingenerator_set_persistence(this.__wbg_ptr, persistence);
  }
  /**
   * @param {number} scale
   */
  set_scale(scale) {
    wasm.terraingenerator_set_scale(this.__wbg_ptr, scale);
  }
  /**
   * @param {number} seed
   */
  set_seed(seed) {
    wasm.terraingenerator_set_seed(this.__wbg_ptr, seed);
  }
}
if (Symbol.dispose) TerrainGenerator.prototype[Symbol.dispose] = TerrainGenerator.prototype.free;

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_audio_visualizer(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_audio_visualizer(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_backtest(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_backtest(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_boids(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_boids(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_btc_health(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_btc_health(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * ca_explorer visualization widget.
 * Renders to canvas with create_ca_explorer / update_ca_explorer pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_ca_explorer(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_ca_explorer(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_cellular_automata(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_cellular_automata(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_climate(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_climate(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_colorblind(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_colorblind(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_correlation(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_correlation(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_fluids(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_fluids(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_fourier_viz(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_fourier_viz(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_generative(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_generative(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * gradient_descent visualization widget.
 * Renders to canvas with create_gradient_descent / update_gradient_descent pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_gradient_descent(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_gradient_descent(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_kmeans(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_kmeans(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * lightning visualization widget.
 * Renders to canvas with create_lightning / update_lightning pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_lightning(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_lightning(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_lorenz(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_lorenz(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_mandelbrot(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_mandelbrot(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_nbody_simulation(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_nbody_simulation(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_network(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_network(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * neural_net visualization widget.
 * Renders to canvas with create_neural_net / update_neural_net pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_neural_net(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_neural_net(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_order_book(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_order_book(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_pendulum(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_pendulum(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_physics(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_physics(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_reaction_diffusion(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_reaction_diffusion(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_regex_playground(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_regex_playground(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * sankey visualization widget.
 * Renders to canvas with create_sankey / update_sankey pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_sankey(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_sankey(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_solar(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_solar(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * spectrogram visualization widget.
 * Renders to canvas with create_spectrogram / update_spectrogram pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_spectrogram(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_spectrogram(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_terrain_generator(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_terrain_generator(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * trade_flow visualization widget.
 * Renders to canvas with create_trade_flow / update_trade_flow pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_trade_flow(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_trade_flow(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 */
export function create_treemap(canvas_id, width, height) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_treemap(ptr0, len0, width, height);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * tsne visualization widget.
 * Renders to canvas with create_tsne / update_tsne pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_tsne(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_tsne(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * vol_surface visualization widget.
 * Renders to canvas with create_vol_surface / update_vol_surface pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_vol_surface(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_vol_surface(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * voronoi visualization widget.
 * Renders to canvas with create_voronoi / update_voronoi pattern.
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_voronoi(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_voronoi(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 */
export function create_wave(canvas_id, w, h) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.create_wave(ptr0, len0, w, h);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

export function main() {
  wasm.main();
}

/**
 * Concentration analysis from portfolio weights.
 * Returns JSON: { hhi, normalised_hhi, effective_n, entropy, max_entropy, top5, top10, gini, classification }
 * @param {Float64Array} weights
 * @returns {string}
 */
export function quant_concentration(weights) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ptr0 = passArrayF64ToWasm0(weights, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.quant_concentration(ptr0, len0);
    deferred2_0 = ret[0];
    deferred2_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Correlation matrix from a returns matrix (N assets x T periods, row-major).
 * @param {Float64Array} returns
 * @param {number} n_assets
 * @param {number} n_periods
 * @returns {string}
 */
export function quant_correlation_matrix(returns, n_assets, n_periods) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ptr0 = passArrayF64ToWasm0(returns, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.quant_correlation_matrix(ptr0, len0, n_assets, n_periods);
    deferred2_0 = ret[0];
    deferred2_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Drawdown analysis from price series.
 * Returns JSON: { underwater, max_drawdown, max_dd_duration, current_drawdown, calmar, ulcer, pain }
 * @param {Float64Array} prices
 * @param {number} periods_per_year
 * @returns {string}
 */
export function quant_drawdown(prices, periods_per_year) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ptr0 = passArrayF64ToWasm0(prices, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.quant_drawdown(ptr0, len0, periods_per_year);
    deferred2_0 = ret[0];
    deferred2_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Factor exposure regression (OLS).
 * Returns JSON: { alpha, betas, r_squared, adj_r_squared, f_statistic, t_stats }
 * @param {Float64Array} y
 * @param {Float64Array} x
 * @param {number} n_factors
 * @param {number} n_obs
 * @returns {string}
 */
export function quant_factor_regression(y, x, n_factors, n_obs) {
  let deferred3_0;
  let deferred3_1;
  try {
    const ptr0 = passArrayF64ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(x, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.quant_factor_regression(ptr0, len0, ptr1, len1, n_factors, n_obs);
    deferred3_0 = ret[0];
    deferred3_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
  }
}

/**
 * GARCH(1,1) fit and forecast.
 * @param {Float64Array} returns
 * @param {number} forecast_steps
 * @returns {string}
 */
export function quant_garch(returns, forecast_steps) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ptr0 = passArrayF64ToWasm0(returns, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.quant_garch(ptr0, len0, forecast_steps);
    deferred2_0 = ret[0];
    deferred2_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Black-Scholes call Greeks across a spot price range.
 * Returns JSON: { spot: [...], delta: [...], gamma: [...], theta: [...], vega: [...], rho: [...] }
 * @param {number} spot_min
 * @param {number} spot_max
 * @param {number} num_points
 * @param {number} strike
 * @param {number} time_to_expiry
 * @param {number} risk_free_rate
 * @param {number} implied_vol
 * @param {boolean} is_call
 * @returns {string}
 */
export function quant_greeks(
  spot_min,
  spot_max,
  num_points,
  strike,
  time_to_expiry,
  risk_free_rate,
  implied_vol,
  is_call,
) {
  let deferred1_0;
  let deferred1_1;
  try {
    const ret = wasm.quant_greeks(
      spot_min,
      spot_max,
      num_points,
      strike,
      time_to_expiry,
      risk_free_rate,
      implied_vol,
      is_call,
    );
    deferred1_0 = ret[0];
    deferred1_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
  }
}

/**
 * Monte Carlo GBM simulation from historical close prices.
 * Returns JSON: { drift, volatility, s0, p5, p25, p50, p75, p95 }
 * @param {Float64Array} closes
 * @param {number} periods_per_year
 * @param {number} horizon_days
 * @param {number} num_paths
 * @returns {string}
 */
export function quant_montecarlo(closes, periods_per_year, horizon_days, num_paths) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ptr0 = passArrayF64ToWasm0(closes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.quant_montecarlo(ptr0, len0, periods_per_year, horizon_days, num_paths);
    deferred2_0 = ret[0];
    deferred2_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Seed the WASM PRNG from JS (use crypto.getRandomValues for entropy).
 * @param {number} s0
 * @param {number} s1
 */
export function quant_seed(s0, s1) {
  wasm.quant_seed(s0, s1);
}

/**
 * Value at Risk and Expected Shortfall from a return series.
 * @param {Float64Array} returns
 * @param {number} alpha
 * @returns {string}
 */
export function quant_var(returns, alpha) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ptr0 = passArrayF64ToWasm0(returns, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.quant_var(ptr0, len0, alpha);
    deferred2_0 = ret[0];
    deferred2_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Nelson-Siegel yield curve fit.
 * @param {Float64Array} maturities
 * @param {Float64Array} yields
 * @returns {string}
 */
export function quant_yield_curve(maturities, yields) {
  let deferred3_0;
  let deferred3_1;
  try {
    const ptr0 = passArrayF64ToWasm0(maturities, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(yields, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.quant_yield_curve(ptr0, len0, ptr1, len1);
    deferred3_0 = ret[0];
    deferred3_1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_backtest(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_backtest(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} _params
 */
export function update_boids(canvas_id, w, h, _params) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(_params, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_boids(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_btc_health(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_btc_health(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_ca_explorer(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_ca_explorer(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {number} _time
 */
export function update_cellular_automata(canvas_id, width, height, _time) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.update_cellular_automata(ptr0, len0, width, height, _time);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} csv_data
 */
export function update_climate(canvas_id, width, height, csv_data) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(csv_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_climate(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} img_data_json
 */
export function update_colorblind(canvas_id, width, height, img_data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(img_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_colorblind(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_correlation(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_correlation(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_fluids(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_fluids(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {number} time
 */
export function update_fourier_viz(canvas_id, width, height, time) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.update_fourier_viz(ptr0, len0, width, height, time);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {number} seed
 * @param {number} speed
 * @param {number} density
 * @param {number} time
 */
export function update_generative(canvas_id, width, height, seed, speed, density, time) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.update_generative(ptr0, len0, width, height, seed, speed, density, time);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_gradient_descent(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_gradient_descent(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} _params
 */
export function update_kmeans(canvas_id, w, h, _params) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(_params, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_kmeans(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_lightning(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_lightning(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} _params
 */
export function update_lorenz(canvas_id, w, h, _params) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(_params, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_lorenz(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_mandelbrot(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_mandelbrot(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_network(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_network(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_neural_net(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_neural_net(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_order_book(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_order_book(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_pendulum(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_pendulum(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {number} _time
 */
export function update_physics(canvas_id, width, height, _time) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.update_physics(ptr0, len0, width, height, _time);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_reaction_diffusion(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_reaction_diffusion(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_regex_playground(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_regex_playground(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_sankey(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_sankey(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} _params
 */
export function update_solar(canvas_id, w, h, _params) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(_params, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_solar(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_spectrogram(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_spectrogram(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_trade_flow(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_trade_flow(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} width
 * @param {number} height
 * @param {string} data_json
 */
export function update_treemap(canvas_id, width, height, data_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_treemap(ptr0, len0, width, height, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_tsne(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_tsne(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_vol_surface(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_vol_surface(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} params_json
 */
export function update_voronoi(canvas_id, w, h, params_json) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_voronoi(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {string} canvas_id
 * @param {number} w
 * @param {number} h
 * @param {string} _params
 */
export function update_wave(canvas_id, w, h, _params) {
  const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(_params, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.update_wave(ptr0, len0, w, h, ptr1, len1);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_boolean_get_edaed31a367ce1bd: function (arg0) {
      const v = arg0;
      const ret = typeof v === 'boolean' ? v : undefined;
      return isLikeNone(ret) ? 0xffffff : ret ? 1 : 0;
    },
    __wbg___wbindgen_is_undefined_721f8decd50c87a3: function (arg0) {
      const ret = arg0 === undefined;
      return ret;
    },
    __wbg___wbindgen_number_get_1cc01dd708740256: function (arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === 'number' ? obj : undefined;
      getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    },
    __wbg___wbindgen_string_get_71bb4348194e31f0: function (arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === 'string' ? obj : undefined;
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_throw_ea4887a5f8f9a9db: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_arc_74cf0c033e9df542: function () {
      return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        arg0.arc(arg1, arg2, arg3, arg4, arg5);
      }, arguments);
    },
    __wbg_beginPath_c99b5be3516a2077: function (arg0) {
      arg0.beginPath();
    },
    __wbg_closePath_47136fd7a8a2f043: function (arg0) {
      arg0.closePath();
    },
    __wbg_document_2634180a4c694068: function (arg0) {
      const ret = arg0.document;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_error_a6fa202b58aa1cd3: function (arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_exec_072e76b05687c361: function (arg0, arg1, arg2) {
      const ret = arg0.exec(getStringFromWasm0(arg1, arg2));
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_fillRect_3c420f5077df8d3b: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.fillRect(arg1, arg2, arg3, arg4);
    },
    __wbg_fillText_cdea0ac33ff3d2d1: function () {
      return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        arg0.fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
      }, arguments);
    },
    __wbg_fill_b39141050e50c461: function (arg0) {
      arg0.fill();
    },
    __wbg_from_50138b2ca136f50c: function (arg0) {
      const ret = Array.from(arg0);
      return ret;
    },
    __wbg_getContext_486aab500e1c34c9: function () {
      return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
      }, arguments);
    },
    __wbg_getElementById_c7aba6b93b34bf01: function (arg0, arg1, arg2) {
      const ret = arg0.getElementById(getStringFromWasm0(arg1, arg2));
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_get_197a3fe98f169e38: function (arg0, arg1) {
      const ret = arg0[arg1 >>> 0];
      return ret;
    },
    __wbg_get_dddb90ff5d27a080: function () {
      return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
      }, arguments);
    },
    __wbg_get_unchecked_54a4374c38e08460: function (arg0, arg1) {
      const ret = arg0[arg1 >>> 0];
      return ret;
    },
    __wbg_instanceof_CanvasRenderingContext2d_d0cab9e931424c52: function (arg0) {
      let result;
      try {
        result = arg0 instanceof CanvasRenderingContext2D;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_instanceof_HtmlCanvasElement_8ce29a370a2b10a4: function (arg0) {
      let result;
      try {
        result = arg0 instanceof HTMLCanvasElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_instanceof_Window_0d356b88a2f77c42: function (arg0) {
      let result;
      try {
        result = arg0 instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_length_c6054974c0a6cdb9: function (arg0) {
      const ret = arg0.length;
      return ret;
    },
    __wbg_lineTo_2a649fce185f0bf0: function (arg0, arg1, arg2) {
      arg0.lineTo(arg1, arg2);
    },
    __wbg_moveTo_8973531c3399ba16: function (arg0, arg1, arg2) {
      arg0.moveTo(arg1, arg2);
    },
    __wbg_new_227d7c05414eb861: function () {
      const ret = new Error();
      return ret;
    },
    __wbg_new_36e147a8ced3c6e0: function () {
      const ret = new Array();
      return ret;
    },
    __wbg_new_823438cabd5628d6: function (arg0, arg1, arg2, arg3) {
      const ret = new RegExp(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
      return ret;
    },
    __wbg_new_with_u8_clamped_array_and_sh_adb3f647b0414eb2: function () {
      return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0);
        return ret;
      }, arguments);
    },
    __wbg_now_d2e0afbad4edbe82: function () {
      const ret = Date.now();
      return ret;
    },
    __wbg_parse_1f9d3f9cbc8a7da2: function () {
      return handleError(function (arg0, arg1) {
        const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
        return ret;
      }, arguments);
    },
    __wbg_push_f724b5db8acf89d2: function (arg0, arg1) {
      const ret = arg0.push(arg1);
      return ret;
    },
    __wbg_putImageData_d36ffa8305aea239: function () {
      return handleError(function (arg0, arg1, arg2, arg3) {
        arg0.putImageData(arg1, arg2, arg3);
      }, arguments);
    },
    __wbg_random_3182549db57fb083: function () {
      const ret = Math.random();
      return ret;
    },
    __wbg_setLineDash_7394cefd476e675f: function () {
      return handleError(function (arg0, arg1) {
        arg0.setLineDash(arg1);
      }, arguments);
    },
    __wbg_set_fillStyle_01152e00b5737643: function (arg0, arg1) {
      arg0.fillStyle = arg1;
    },
    __wbg_set_font_e2bce6175ef42bc3: function (arg0, arg1, arg2) {
      arg0.font = getStringFromWasm0(arg1, arg2);
    },
    __wbg_set_height_ad5056ea051acd78: function (arg0, arg1) {
      arg0.height = arg1 >>> 0;
    },
    __wbg_set_lineWidth_fef15cb5c15a6cdc: function (arg0, arg1) {
      arg0.lineWidth = arg1;
    },
    __wbg_set_strokeStyle_77f54c809146a711: function (arg0, arg1) {
      arg0.strokeStyle = arg1;
    },
    __wbg_set_width_031bdecd763c5855: function (arg0, arg1) {
      arg0.width = arg1 >>> 0;
    },
    __wbg_stack_3b0d974bbf31e44f: function (arg0, arg1) {
      const ret = arg1.stack;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_static_accessor_GLOBAL_THIS_2fee5048bcca5938: function () {
      const ret = typeof globalThis === 'undefined' ? null : globalThis;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_GLOBAL_ce44e66a4935da8c: function () {
      const ret = typeof global === 'undefined' ? null : global;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_SELF_44f6e0cb5e67cdad: function () {
      const ret = typeof self === 'undefined' ? null : self;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_WINDOW_168f178805d978fe: function () {
      const ret = typeof window === 'undefined' ? null : window;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_strokeRect_a9cb57c3713e908d: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.strokeRect(arg1, arg2, arg3, arg4);
    },
    __wbg_stroke_d0c2cfbe28711bcb: function (arg0) {
      arg0.stroke();
    },
    __wbindgen_cast_0000000000000001: function (arg0) {
      // Cast intrinsic for `F64 -> Externref`.
      const ret = arg0;
      return ret;
    },
    __wbindgen_cast_0000000000000002: function (arg0, arg1) {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_init_externref_table: function () {
      const table = wasm.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    },
  };
  return {
    __proto__: null,
    './hydrated_widgets_bg.js': import0,
  };
}

const AudioVisualizerFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_audiovisualizer_free(ptr, 1));
const BodyFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_body_free(ptr, 1));
const NBodySimulationFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_nbodysimulation_free(ptr, 1));
const TerrainGeneratorFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_terraingenerator_free(ptr, 1));

function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

function getArrayF32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayF64FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getClampedArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ClampedArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
  if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
  if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
    cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
  }
  return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

let cachedUint8ClampedArrayMemory0 = null;
function getUint8ClampedArrayMemory0() {
  if (cachedUint8ClampedArrayMemory0 === null || cachedUint8ClampedArrayMemory0.byteLength === 0) {
    cachedUint8ClampedArrayMemory0 = new Uint8ClampedArray(wasm.memory.buffer);
  }
  return cachedUint8ClampedArrayMemory0;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function passArrayF32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getFloat32ArrayMemory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 8, 8) >>> 0;
  getFloat64ArrayMemory0().set(arg, ptr / 8);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length,
    };
  };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedFloat32ArrayMemory0 = null;
  cachedFloat64ArrayMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  cachedUint8ClampedArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}

async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && expectedResponseType(module.type);

        if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e,
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }

  function expectedResponseType(type) {
    switch (type) {
      case 'basic':
      case 'cors':
      case 'default':
        return true;
    }
    return false;
  }
}

function initSync(module) {
  if (wasm !== undefined) return wasm;

  if (module !== undefined) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
    }
  }

  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;

  if (module_or_path !== undefined) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        'using deprecated parameters for the initialization function; pass a single object instead',
      );
    }
  }

  if (module_or_path === undefined) {
    module_or_path = new URL('hydrated_widgets_bg.wasm', import.meta.url);
  }
  const imports = __wbg_get_imports();

  if (
    typeof module_or_path === 'string' ||
    (typeof Request === 'function' && module_or_path instanceof Request) ||
    (typeof URL === 'function' && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

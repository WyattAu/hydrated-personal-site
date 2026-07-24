import { createSignal, onCleanup, onMount } from 'solid-js';
import { getWasmMod } from '../../../lib/wasm-loader';

const WAVE_TYPES = ['Sine', 'Square', 'Triangle', 'Sawtooth', 'Pulse'];

export default function FourierDemo() {
  const [harmonics, setHarmonics] = createSignal(5);
  const [waveType, setWaveType] = createSignal(0);
  let canvasRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;
  let animFrame = 0;
  let startTime = 0;

  async function loadWasm() {
    wasmMod = await getWasmMod();
  }

  function render(time: number) {
    if (!canvasRef || !wasmMod) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = 300;
    canvasRef.width = w * dpr;
    canvasRef.height = h * dpr;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    // WASM draws using canvas ID, so we need to use the WASM function's internal canvas lookup
    // But since we changed width/height here, the WASM function will detect the canvas by ID
    const canvasId = canvasRef.id;
    try {
      wasmMod.update_fourier_viz_full(canvasId, w, h, time, harmonics(), waveType());
    } catch {
      // Canvas not found by ID in WASM context — draw directly
    }
  }

  function animate(ts: number) {
    if (!startTime) startTime = ts;
    const elapsed = (ts - startTime) / 1000;
    const phase = elapsed * 0.5;
    render(phase);
    animFrame = requestAnimationFrame(animate);
  }

  onMount(async () => {
    await loadWasm();
    animFrame = requestAnimationFrame(animate);
  });

  onCleanup(() => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(animFrame);
  });

  return (
    <div>
      <canvas id="fourier-demo-canvas" ref={canvasRef} class="w-full" style={{ height: '300px' }} />
      <div class="mt-3 space-y-2">
        <div class="flex items-center gap-3">
          <label
            class="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)', 'min-width': '70px' }}
          >
            Harmonics
          </label>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={harmonics()}
            onInput={(e) => setHarmonics(Number(e.currentTarget.value))}
            class="flex-1"
          />
          <span
            class="font-mono text-xs"
            style={{ color: 'var(--accent)', 'min-width': '24px', 'text-align': 'right' }}
          >
            {harmonics()}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <label
            class="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)', 'min-width': '70px' }}
          >
            Waveform
          </label>
          <select
            class="font-mono text-[10px] px-2 py-1 border flex-1"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={waveType()}
            onChange={(e) => setWaveType(Number(e.currentTarget.value))}
          >
            {WAVE_TYPES.map((name, i) => (
              <option value={i}>{name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

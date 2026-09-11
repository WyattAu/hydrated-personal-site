import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { getWasmMod } from '../../../lib/wasm-loader';

const WAVE_TYPES = ['Sine', 'Square', 'Triangle', 'Sawtooth', 'Pulse'];
const CANVAS_H = 260;

interface Coeff {
  n: number;
  amp: number;
  phase: number;
}

interface FourierStats {
  l2_error: number;
  coeffs: Coeff[];
  formula: string;
}

const PER_WAVE_COEFFS: string[] = [
  'Sine: a_1 = 1, all other a_n = 0.',
  'Square: a_n = 4/(pi*n) for odd n, a_n = 0 for even n.',
  'Triangle: a_n = 8/(pi^2*n^2) with alternating sign for odd n, 0 for even n.',
  'Sawtooth: a_n = 2*(-1)^(n+1)/(pi*n) for all n >= 1.',
  'Pulse: broadband spectrum, model a_n = 1/sqrt(n).',
];

export default function FourierDemo() {
  const [harmonics, setHarmonics] = createSignal(5);
  const [waveType, setWaveType] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);
  const [wasmError, setWasmError] = createSignal<string | null>(null);
  const [stats, setStats] = createSignal<FourierStats | null>(null);

  let timeRef: HTMLCanvasElement | undefined;
  let freqRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;
  let animFrame = 0;
  let statsTimer = 0;
  let lastTs = 0;
  let phase = 0;
  let drawFailed = false;

  // Size the backing store in device pixels and the element in CSS pixels,
  // then hand the device-pixel dimensions to WASM. Previously the code set
  // canvas.width = w * dpr and passed bare CSS w to WASM, whose
  // canvas.set_width(w) call wiped the DPR scaling (blurry output).
  function sizeCanvas(canvas: HTMLCanvasElement): { w: number; h: number } {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(CANVAS_H * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${CANVAS_H}px`;
    return { w: canvas.width, h: canvas.height };
  }

  function hasNewFns(): boolean {
    return (
      wasmMod &&
      typeof wasmMod.update_fourier_time === 'function' &&
      typeof wasmMod.update_fourier_freq === 'function' &&
      typeof wasmMod.fourier_stats === 'function'
    );
  }

  function fail(message: string): void {
    if (drawFailed) return;
    drawFailed = true;
    setWasmError(message);
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = 0;
    if (statsTimer) window.clearInterval(statsTimer);
    statsTimer = 0;
  }

  function drawFrame(ts: number): void {
    animFrame = requestAnimationFrame(drawFrame);
    if (!wasmMod || !timeRef || !freqRef || drawFailed) return;
    if (lastTs) phase += ((ts - lastTs) / 1000) * 0.5 * (playing() ? 1 : 0);
    lastTs = ts;
    try {
      const t = sizeCanvas(timeRef);
      wasmMod.update_fourier_time(timeRef.id, t.w, t.h, phase, harmonics(), waveType());
      const f = sizeCanvas(freqRef);
      wasmMod.update_fourier_freq(freqRef.id, f.w, f.h, harmonics(), waveType());
    } catch (err) {
      fail(`Fourier render failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function pollStats(): void {
    if (!wasmMod || drawFailed) return;
    try {
      const raw: string = wasmMod.fourier_stats(phase, harmonics(), waveType());
      const parsed = JSON.parse(raw) as FourierStats;
      if (typeof parsed.l2_error === 'number' && Array.isArray(parsed.coeffs)) {
        setStats(parsed);
      }
    } catch {
      // Keep the last good readout; render-loop errors are surfaced separately.
    }
  }

  onMount(async () => {
    try {
      wasmMod = await getWasmMod();
    } catch (err) {
      setWasmError(
        `Could not load the WASM module: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }
    if (!hasNewFns()) {
      setWasmError(
        'Loaded WASM bundle is stale (missing update_fourier_time / update_fourier_freq / fourier_stats). Rebuild the widgets package.',
      );
      return;
    }
    lastTs = 0;
    animFrame = requestAnimationFrame(drawFrame);
    // Coefficient readout at ~2 Hz; the rAF loop above already reads the
    // signals every frame so slider/select changes take effect immediately.
    statsTimer = window.setInterval(pollStats, 500);
    pollStats();
  });

  onCleanup(() => {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (statsTimer) window.clearInterval(statsTimer);
  });

  return (
    <div>
      <Show when={wasmError()}>
        <div
          class="font-mono text-xs px-3 py-2 mb-3 border"
          style={{
            color: '#ff6b6b',
            'border-color': '#ff6b6b',
            background: 'var(--bg-secondary)',
          }}
          role="alert"
        >
          {wasmError()}
        </div>
      </Show>

      <canvas
        id="fourier-time-canvas"
        ref={timeRef}
        class="w-full"
        style={{ height: `${CANVAS_H}px` }}
      />
      <canvas
        id="fourier-freq-canvas"
        ref={freqRef}
        class="w-full mt-2"
        style={{ height: `${CANVAS_H}px` }}
      />

      <div class="mt-3 space-y-2">
        <div class="flex items-center gap-3">
          <label
            for="fourier-harmonics"
            class="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)', 'min-width': '70px' }}
          >
            Harmonics
          </label>
          <input
            id="fourier-harmonics"
            type="range"
            min="1"
            max="50"
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
            for="fourier-waveform"
            class="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)', 'min-width': '70px' }}
          >
            Waveform
          </label>
          <select
            id="fourier-waveform"
            class="font-mono text-[10px] px-2 py-1 border flex-1"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={waveType()}
            onChange={(e) => setWaveType(Number(e.currentTarget.value))}
          >
            <For each={WAVE_TYPES}>{(name, i) => <option value={i()}>{name}</option>}</For>
          </select>
          <button
            type="button"
            class="font-mono text-[10px] px-3 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            onClick={() => setPlaying(!playing())}
          >
            {playing() ? 'PAUSE' : 'PLAY'}
          </button>
        </div>
      </div>

      <Show when={stats()}>
        <div class="mt-3">
          <p
            class="font-mono text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Coefficients
          </p>
          <table class="font-mono text-[11px] w-full" style={{ color: 'var(--accent)' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th class="text-left font-normal pr-4">n</th>
                <th class="text-left font-normal pr-4">a_n</th>
                <th class="text-left font-normal">phase</th>
              </tr>
            </thead>
            <tbody>
              <For each={stats()?.coeffs.slice(0, 8) ?? []}>
                {(c) => (
                  <tr>
                    <td class="pr-4">{c.n}</td>
                    <td class="pr-4">{c.amp.toFixed(4)}</td>
                    <td>{c.phase.toFixed(4)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <p class="font-mono text-[11px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            L2 error: <span style={{ color: 'var(--accent)' }}>{stats()?.l2_error.toFixed(5)}</span>
          </p>
          <p class="font-mono text-[11px] mt-1 break-all" style={{ color: 'var(--accent)' }}>
            {stats()?.formula}
          </p>
        </div>
      </Show>

      <div class="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <p class="font-mono text-[11px]" style={{ color: 'var(--accent)' }}>
          S_N(t) = sum_n a_n * sin(n * w * t + phi_n)
        </p>
        <p class="text-xs">{PER_WAVE_COEFFS[waveType()]}</p>
        <p class="text-xs">
          Truncating the series at N leaves an RMS (L2) error that shrinks as N grows; smooth
          targets (sine, triangle) converge fastest. Near a jump discontinuity the partial sums
          overshoot by about 8.9% no matter how large N gets. This is the Gibbs phenomenon: the
          overshoot narrows but never disappears.
        </p>
      </div>
    </div>
  );
}

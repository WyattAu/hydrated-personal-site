import { For, createSignal, onMount } from 'solid-js';

/**
 * Space Weather Console — GOES X-ray flare classification + 24h activity.
 * OSINT source: NOAA SWPC GOES primary X-ray detector (1-day window).
 * Flares classify on the long channel (0.1–0.8 nm): A <1e-7, B <1e-7…,
 * C <1e-6, M <1e-5, X ≥1e-5 W/m².
 */

interface XRayPoint {
  time_tag: string;
  flux: number;
  obs_flux: number;
  energy: string;
}

const LONG_CHANNEL = '0.1-0.8nm';

function letterClass(flux: number): { letter: string; value: number } {
  const v = Math.max(1e-9, flux);
  if (v >= 1e-4) return { letter: 'X', value: v / 1e-4 };
  if (v >= 1e-5) return { letter: 'M', value: v / 1e-5 };
  if (v >= 1e-6) return { letter: 'C', value: v / 1e-6 };
  if (v >= 1e-7) return { letter: 'B', value: v / 1e-7 };
  return { letter: 'A', value: v / 1e-8 };
}

function fmtClass(flux: number): string {
  const { letter, value } = letterClass(flux);
  return `${letter}${value.toFixed(1)}`;
}

const FLARE_COLORS: Record<string, string> = {
  X: '#ef4444',
  M: '#f97316',
  C: '#eab308',
  B: '#38bdf8',
  A: '#94a3b8',
};

export default function SpaceWeatherConsole() {
  const [points, setPoints] = createSignal<XRayPoint[]>([]);
  const [current, setCurrent] = createSignal('');
  const [peak, setPeak] = createSignal('');
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json');
      if (!res.ok) throw new Error(`SWPC ${res.status}`);
      const d = (await res.json()) as XRayPoint[];
      const long = d.filter((p) => p.energy === LONG_CHANNEL && p.flux > 0);
      setPoints(long);
      if (long.length > 0) {
        setCurrent(fmtClass(long[long.length - 1].flux));
        setPeak(fmtClass(Math.max(...long.map((p) => p.flux))));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SWPC feed unavailable');
    }
  });

  const counts = () => {
    const c: Record<string, number> = { X: 0, M: 0, C: 0 };
    for (const p of points()) {
      const { letter } = letterClass(p.flux);
      if (letter in c) c[letter] += 1;
    }
    return c;
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          SPACE WEATHER
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'NOAA SWPC'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="flex items-baseline justify-between mb-2">
        <span
          class="font-mono text-2xl font-bold"
          style={{ color: FLARE_COLORS[current().charAt(0)] ?? 'var(--text-primary)' }}
        >
          {current() || '—'}
        </span>
        <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          GOES PRIMARY · 0.1–0.8 nm
        </span>
      </div>
      <div class="grid grid-cols-3 gap-1 mb-3 font-mono text-[9px] text-center">
        <For each={['X', 'M', 'C']}>
          {(letter) => (
            <div class="border py-1" style={{ 'border-color': 'var(--border)' }}>
              <div style={{ color: FLARE_COLORS[letter] ?? 'var(--text-primary)' }}>
                {counts()[letter] ?? 0}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{letter}-class</div>
            </div>
          )}
        </For>
      </div>
      <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
        24h peak: {peak() || '—'} · background X-ray flux, last 24 h
      </p>
    </div>
  );
}

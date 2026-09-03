import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getPlychart } from '../../../lib/plychart-loader';

const H = 240;

const CITIES = [
  { name: 'LONDON', lat: 51.5, lon: -0.1 },
  { name: 'NEW YORK', lat: 40.7, lon: -74.0 },
  { name: 'TOKYO', lat: 35.7, lon: 139.7 },
  { name: 'HK', lat: 22.3, lon: 114.2 },
  { name: 'SYDNEY', lat: -33.9, lon: 151.2 },
];

interface CityWeather {
  name: string;
  current: number;
  daily: number[];
}

export default function WeatherStrip() {
  const [data, setData] = createSignal<CityWeather[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const settled = await Promise.allSettled(
        CITIES.map(async (c) => {
          const res = await fetch(`${apiBase()}/api/weather?lat=${c.lat}&lon=${c.lon}`);
          if (!res.ok) throw new Error(c.name);
          const json = await res.json();
          const current = Number(json?.current?.temperature_2m) || 0;
          const daily: number[] = (json?.daily?.temperature_2m_max ?? []).map((v: number) =>
            Number(v),
          );
          return { name: c.name, current, daily } as CityWeather;
        }),
      );
      const ok: CityWeather[] = [];
      for (const r of settled)
        if (r.status === 'fulfilled' && r.value.daily.length > 0) ok.push(r.value);
      if (ok.length === 0) throw new Error('No weather');
      setData(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('weather-strip') as HTMLCanvasElement | null;
      if (canvas) {
        const w = canvas.clientWidth || 600;
        p.create_chart('weather-strip', w, H);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const cities = data();
    const ready = wasmReady();
    if (!cities || !ready) return;
    const canvas = document.getElementById('weather-strip') as HTMLCanvasElement | null;
    if (!canvas) return;
    getPlychart().then((p) => {
      const w = canvas.clientWidth || 600;
      p.create_chart('weather-strip', w, H);
      // 5 cities x 7 days temp matrix
      const matrix: number[][] = cities.map((c) => c.daily.slice(0, 7));
      p.update_heatmap('weather-strip', JSON.stringify(matrix), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        WEATHER STRIP
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading weather...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas id="weather-strip" class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        5 cities x 7 days | open-meteo | colour scaled -10C to 35C
      </p>
    </div>
  );
}

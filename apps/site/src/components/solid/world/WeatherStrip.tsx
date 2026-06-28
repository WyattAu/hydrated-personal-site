import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

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

function tempColor(t: number): string {
  const lo = -10;
  const hi = 35;
  const f = Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
  const r = Math.round(f * 255);
  const b = Math.round((1 - f) * 255);
  return `rgb(${r},40,${b})`;
}

export default function WeatherStrip() {
  const [data, setData] = createSignal<CityWeather[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const settled = await Promise.allSettled(
        CITIES.map(async (c) => {
          const res = await fetch(`/api/weather?lat=${c.lat}&lon=${c.lon}`);
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

  function draw() {
    const canvas = canvasRef;
    const cities = data();
    if (!canvas || !cities) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, H);

    const headerH = 38;
    const colW = w / cities.length;
    const days = 7;
    const cellH = (H - headerH - 8) / days;

    for (let ci = 0; ci < cities.length; ci++) {
      const c = cities[ci];
      const ox = ci * colW;

      ctx.fillStyle = colors.textPrimary || '#fff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(c.name, ox + colW / 2, 4);
      ctx.fillStyle = colors.accent || '#00e5ff';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c.current.toFixed(0)}C`, ox + colW / 2, 24);

      const nd = Math.min(days, c.daily.length);
      for (let d = 0; d < nd; d++) {
        const t = c.daily[d];
        const y = headerH + d * cellH;
        ctx.fillStyle = tempColor(t);
        ctx.fillRect(ox + 4, y + 1, colW - 8, cellH - 2);
        ctx.fillStyle = t > 20 || t < -5 ? '#fff' : '#000';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t.toFixed(0)}`, ox + colW / 2, y + cellH / 2);
      }
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('7-day daily high | blue = cold, red = hot', 4, H - 2);
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = data();
    if (v) draw();
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
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        5 cities x 7 days | open-meteo | colour scaled -10C to 35C
      </p>
    </div>
  );
}

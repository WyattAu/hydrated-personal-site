import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 220;

const BINS = [
  { label: 'M0-1', min: 0, max: 1 },
  { label: 'M1-2', min: 1, max: 2 },
  { label: 'M2-3', min: 2, max: 3 },
  { label: 'M3-4', min: 3, max: 4 },
  { label: 'M4-5', min: 4, max: 5 },
  { label: 'M5-6', min: 5, max: 6 },
  { label: 'M6+', min: 6, max: Number.POSITIVE_INFINITY },
];

export default function EarthquakeHistogram() {
  const [counts, setCounts] = createSignal<number[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/earthquakes`);
      if (!res.ok) throw new Error('API');
      const raw = await res.json();
      const features: Array<{ properties: { mag: number | null } }> =
        (raw.data || raw).features || [];
      const out = BINS.map(
        (b) =>
          features.filter(
            (f) => (f.properties.mag ?? 0) >= b.min && (f.properties.mag ?? 0) < b.max,
          ).length,
      );
      setCounts(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const c = counts();
    if (!canvas || !c) return;
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

    const pad = { l: 40, r: 12, t: 14, b: 30 };
    const cW = w - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const maxCount = Math.max(1, ...c);
    const logMax = Math.log10(maxCount + 1);

    // Y axis log ticks
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '8px "JetBrains Mono", monospace';
    const ticks = [1, 10, 100, 1000].filter((t) => t <= maxCount);
    for (const t of ticks) {
      const y = pad.t + cH - (Math.log10(t + 1) / logMax) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${t}`, pad.l - 4, y);
    }

    const barW = cW / BINS.length;
    for (let i = 0; i < BINS.length; i++) {
      const count = c[i];
      const x = pad.l + i * barW;
      const hgt = count > 0 ? (Math.log10(count + 1) / logMax) * cH : 0;
      const y = pad.t + cH - hgt;
      const intensity = Math.min(1, (i + 1) / BINS.length);
      const red = Math.floor(120 + intensity * 135);
      ctx.fillStyle = `rgb(${red},${Math.floor(60 + (1 - intensity) * 80)},60)`;
      ctx.fillRect(x + 2, y, barW - 4, hgt);
      ctx.fillStyle = colors.textPrimary || '#fff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (count > 0) ctx.fillText(`${count}`, x + barW / 2, y - 2);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(BINS[i].label, x + barW / 2, pad.t + cH + 4);
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('log scale (Gutenberg-Richter)', w - pad.r, 2);
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = counts();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        EARTHQUAKE MAGNITUDE HISTOGRAM
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading USGS feed...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        USGS 24h feed | binned by magnitude | log Y axis
      </p>
    </div>
  );
}

import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 200;

interface Gauge {
  label: string;
  value: number;
  max: number;
  unit: string;
  spark: number[];
  signed: boolean;
}

export default function SolarWindPanel() {
  const [data, setData] = createSignal<Gauge[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const [plasmaRes, magRes] = await Promise.all([
        fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json'),
        fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json'),
      ]);
      if (!plasmaRes.ok || !magRes.ok) throw new Error('SWPC unavailable');

      const plasma = (await plasmaRes.json()) as unknown[][];
      const mag = (await magRes.json()) as unknown[][];
      const pRows = plasma.slice(1);
      const mRows = mag.slice(1);

      const col = (rows: unknown[][], idx: number): number[] =>
        rows.map((r) => Number(r[idx])).filter((v) => Number.isFinite(v));

      const speeds = col(pRows, 2);
      const dens = col(pRows, 1);
      const temps = col(pRows, 3);
      const bzs = col(mRows, 3);

      const last = (a: number[]) => (a.length ? a[a.length - 1] : 0);

      setData([
        {
          label: 'SPEED',
          value: last(speeds),
          max: 800,
          unit: 'km/s',
          spark: speeds.slice(-60),
          signed: false,
        },
        {
          label: 'DENSITY',
          value: last(dens),
          max: 30,
          unit: 'p/cm3',
          spark: dens.slice(-60),
          signed: false,
        },
        {
          label: 'TEMP',
          value: last(temps),
          max: 1e6,
          unit: 'K',
          spark: temps.slice(-60),
          signed: false,
        },
        { label: 'Bz', value: last(bzs), max: 20, unit: 'nT', spark: bzs.slice(-60), signed: true },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const gauges = data();
    if (!canvas || !gauges) return;
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

    const rowH = H / gauges.length;
    const labelW = 70;
    const valueW = 96;
    const sparkW = 70;

    for (let i = 0; i < gauges.length; i++) {
      const g = gauges[i];
      const y = i * rowH;
      const cy = y + rowH / 2;

      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.55)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.label, 8, cy - 8);

      const barX = labelW;
      const barW = w - labelW - valueW - sparkW - 12;
      const trackY = y + rowH / 2 - 4;
      ctx.fillStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
      ctx.fillRect(barX, trackY, barW, 8);

      let frac: number;
      if (g.signed) {
        frac = Math.max(0, Math.min(1, 0.5 + (g.value / g.max) * 0.5));
      } else {
        frac = Math.max(0, Math.min(1, g.value / g.max));
      }
      const danger = g.signed ? g.value < -10 : g.value >= g.max * 0.85;
      ctx.fillStyle = danger ? '#ef4444' : colors.accent || '#00e5ff';
      if (g.signed) {
        const mid = barX + barW / 2;
        if (g.value < 0)
          ctx.fillRect(
            mid + (g.value / g.max) * (barW / 2),
            trackY,
            -((g.value / g.max) * (barW / 2)),
            8,
          );
        else ctx.fillRect(mid, trackY, (g.value / g.max) * (barW / 2), 8);
        ctx.strokeStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(mid, trackY - 2);
        ctx.lineTo(mid, trackY + 10);
        ctx.stroke();
      } else {
        ctx.fillRect(barX, trackY, barW * frac, 8);
      }

      ctx.fillStyle = colors.textPrimary || '#fff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      const display =
        g.unit === 'K' && g.value >= 1000 ? `${(g.value / 1000).toFixed(0)}k` : g.value.toFixed(1);
      ctx.fillText(`${display} ${g.unit}`, barX + barW + valueW, cy);

      // 1h sparkline
      const sx = barX + barW + valueW + 4;
      const sw = sparkW;
      const sh = rowH - 12;
      const sp = g.spark;
      if (sp.length >= 2) {
        const mn = Math.min(...sp);
        const mx = Math.max(...sp);
        const rng = mx - mn || 1;
        ctx.strokeStyle = danger ? '#ef4444' : colors.accent || '#00e5ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < sp.length; j++) {
          const px = sx + (j / (sp.length - 1)) * sw;
          const py = y + 6 + (1 - (sp[j] - mn) / rng) * sh;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = data();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        SOLAR WIND PANEL
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Fetching NOAA SWPC...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        NOAA SWPC | 1-day plasma + mag | 1h sparkline
      </p>
    </div>
  );
}

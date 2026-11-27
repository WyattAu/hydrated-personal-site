import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { getThemeColors } from '../../../lib/theme-colors';

/**
 * Geomagnetic activity panel — driven by NOAA's 1-minute planetary Kp
 * feed, the only remaining high-cadence geomagnetic product after the
 * solar-wind plasma/mag family retirement (2026-11). Two gauge rows
 * (1-min estimated Kp + 3-hour Kp index) over a recent-history band
 * (the upstream file rolls continuously, roughly 6h of rows) with the
 * with the G1 storm onset threshold (Kp 5) marked.
 */

const H = 220;
const GAUGE_H = 56;
const STORM_KP = 5;

interface Gauge {
  label: string;
  value: number;
  max: number;
  unit: string;
  dangerAt: number;
}

interface Kp1mPayload {
  current: { time_tag: string; kp_index: number; estimated_kp: number } | null;
  series: Array<{ t: string; kp: number; idx: number }>;
}

export default function SolarWindPanel() {
  const [gauges, setGauges] = createSignal<Gauge[] | null>(null);
  const [series, setSeries] = createSignal<Kp1mPayload['series']>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/kp-1m`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Kp feed unavailable');
      const payload = (await res.json()) as Kp1mPayload;
      const cur = payload.current;
      if (!cur) throw new Error('Kp feed empty');
      setSeries(Array.isArray(payload.series) ? payload.series : []);
      setGauges([
        {
          label: 'KP EST',
          value: Number(cur.estimated_kp) || 0,
          max: 9,
          unit: '',
          dangerAt: STORM_KP,
        },
        {
          label: 'KP IDX',
          value: Number(cur.kp_index) || 0,
          max: 9,
          unit: '',
          dangerAt: STORM_KP,
        },
      ]);
      setChartMetaState('solar-wind', { fallback: false, error: null, freshAt: Date.now() });
    } catch (e) {
      setChartMetaState('solar-wind', {
        fallback: false,
        error: e instanceof Error ? e.message : 'kp feed failed',
        freshAt: Date.now(),
      });
      setErr('Geomagnetic feed unavailable (NOAA 1-min Kp)');
      setGauges(null);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const g = gauges();
    if (!canvas || !g) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const colors = getThemeColors();
    ctx.clearRect(0, 0, w, H);

    const labelW = 70;
    const valueW = 72;

    for (let i = 0; i < g.length; i++) {
      const row = g[i];
      const y = i * GAUGE_H;
      const cy = y + GAUGE_H / 2;
      const danger = row.value >= row.dangerAt;

      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.55)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(row.label, 8, cy);

      const barX = labelW;
      const barW = w - labelW - valueW - 12;
      const trackY = cy - 4;
      ctx.fillStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
      ctx.fillRect(barX, trackY, barW, 8);

      // Kp scale: quiet (0-4) gold, storm (5-9) red; storm zone outlined
      const stormX = barX + (row.dangerAt / row.max) * barW;
      ctx.fillStyle = danger ? '#ef4444' : colors.accent || '#c9a86c';
      ctx.fillRect(barX, trackY, (Math.min(row.value, row.max) / row.max) * barW, 8);
      ctx.strokeStyle = 'rgba(239,68,68,0.55)';
      ctx.beginPath();
      ctx.moveTo(stormX, trackY - 3);
      ctx.lineTo(stormX, trackY + 11);
      ctx.stroke();

      ctx.fillStyle = danger ? '#ef4444' : colors.textPrimary || '#fff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(row.value.toFixed(2), barX + barW + valueW, cy);
    }

    // recent history band
    const bandY = 2 * GAUGE_H + 8;
    const bandH = H - bandY - 12;
    const s = series();
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.55)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('KP HISTORY', 8, bandY + 4);

    if (s.length >= 2) {
      const bx = labelW;
      const bw = w - labelW - 12;
      const by = bandY + 10;
      const bh = bandH - 10;
      const maxKp = Math.max(9, ...s.map((p) => p.kp));
      const ky = (v: number) => by + (1 - Math.min(v, maxKp) / maxKp) * bh;
      const kx = (i: number) => bx + (i / (s.length - 1)) * bw;

      // storm zone tint above Kp 5
      ctx.fillStyle = 'rgba(239,68,68,0.06)';
      ctx.fillRect(bx, by, bw, ky(STORM_KP) - by);
      // threshold line
      ctx.strokeStyle = 'rgba(239,68,68,0.45)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(bx, ky(STORM_KP));
      ctx.lineTo(bx + bw, ky(STORM_KP));
      ctx.stroke();
      ctx.setLineDash([]);

      // quiet fill under the curve
      ctx.beginPath();
      ctx.moveTo(kx(0), by + bh);
      for (let i = 0; i < s.length; i++) ctx.lineTo(kx(i), ky(s[i].kp));
      ctx.lineTo(kx(s.length - 1), by + bh);
      ctx.closePath();
      ctx.fillStyle = colors.accent || '#c9a86c';
      ctx.globalAlpha = 0.1;
      ctx.fill();
      ctx.globalAlpha = 1;

      // curve
      const lastKp = s[s.length - 1].kp;
      ctx.strokeStyle = lastKp >= STORM_KP ? '#ef4444' : colors.accent || '#c9a86c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < s.length; i++) {
        const px = kx(i);
        const py = ky(s[i].kp);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // scale labels
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('9', bx - 14, by + 4);
      ctx.fillText('0', bx - 14, by + bh);
    }
  }

  onMount(() => {
    attachChartMeta('solar-wind', {
      source: 'NOAA SWPC',
      detail: '1-min planetary Kp + recent history',
    });
    loadData();
  });
  createEffect(() => {
    gauges();
    series();
    draw();
  });

  const storming = () => (gauges() ?? []).some((g) => g.value >= g.dangerAt);

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        GEOMAGNETIC PANEL
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
      <canvas
        ref={canvasRef}
        id="solar-wind"
        class="w-full"
        style={{ height: `${H}px` }}
        aria-label="Planetary K index: current 1-minute estimate, 3-hour index, and recent history with storm threshold"
      />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        NOAA SWPC | 1-min planetary Kp | recent history, G1 threshold at 5
        <Show when={storming()}>
          <span style={{ color: '#ef4444' }}> | STORM LEVEL</span>
        </Show>
      </p>
    </div>
  );
}

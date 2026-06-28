import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 260;

interface StressData {
  quakeCount: number;
  kp: number;
  fear: number;
  vix: number;
  quakeStress: number;
  kpStress: number;
  fearStress: number;
  vixStress: number;
  total: number;
}

function stressColor(total: number): string {
  if (total < 30) return '#22c55e';
  if (total < 60) return '#eab308';
  if (total < 80) return '#f97316';
  return '#ef4444';
}

export default function GlobalStressGauge() {
  const [data, setData] = createSignal<StressData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const [eqRes, kpRes, fgRes, vixRes] = await Promise.all([
        fetch('/api/earthquakes'),
        fetch('/api/kp-index'),
        fetch('/api/fear-greed'),
        fetch('/api/stock-quote?symbols=%5EVIX'),
      ]);

      let quakeCount = 0;
      if (eqRes.ok) {
        const eqRaw = await eqRes.json();
        const features: Array<{ properties: { mag: number | null } }> =
          (eqRaw.data || eqRaw).features || [];
        quakeCount = features.filter((f) => (f.properties.mag ?? 0) >= 4.5).length;
      }

      let kp = 0;
      if (kpRes.ok) {
        const kpRaw = await kpRes.json();
        const arr = kpRaw.data || kpRaw;
        if (Array.isArray(arr) && arr.length > 0) {
          const latest = arr[arr.length - 1];
          kp = Number(Array.isArray(latest) ? latest[1] : latest.kp_index) || 0;
        }
      }

      let fear = 50;
      if (fgRes.ok) {
        const fgRaw = await fgRes.json();
        const f0 = fgRaw.data?.[0] ?? (Array.isArray(fgRaw) ? fgRaw[0] : null);
        if (f0) fear = Number(f0.value) || 50;
      }

      let vix = 20;
      if (vixRes.ok) {
        const vRaw = await vixRes.json();
        const items: Array<{ symbol?: string; price?: number }> = Array.isArray(vRaw)
          ? vRaw
          : vRaw.data || [];
        const v = items.find((x) => x.symbol === '^VIX');
        if (v) vix = Number(v.price) || 20;
      }

      const quakeStress = Math.min(quakeCount / 300, 1) * 25;
      const kpStress = Math.min(kp / 9, 1) * 25;
      const fearStress = ((100 - fear) / 100) * 25;
      const vixStress = Math.min(vix / 40, 1) * 25;
      setData({
        quakeCount,
        kp,
        fear,
        vix,
        quakeStress,
        kpStress,
        fearStress,
        vixStress,
        total: quakeStress + kpStress + fearStress + vixStress,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const d = data();
    if (!canvas || !d) return;
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

    const cx = w / 2;
    const cy = H * 0.6;
    const radius = Math.max(48, Math.min(w / 2 - 56, 96));
    const startDeg = -120;
    const endDeg = 120;
    const sweep = endDeg - startDeg;
    const frac = Math.max(0, Math.min(1, d.total / 100));
    const valDeg = startDeg + sweep * frac;

    const d2r = (dd: number) => ((dd - 90) * Math.PI) / 180;
    const pt = (deg: number, r: number) => ({
      x: cx + r * Math.sin((deg * Math.PI) / 180),
      y: cy - r * Math.cos((deg * Math.PI) / 180),
    });

    // Background arc
    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, d2r(startDeg), d2r(endDeg), false);
    ctx.stroke();

    // Zone tick marks (30/60/80)
    ctx.strokeStyle = colors.canvasText || 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (const zone of [30, 60, 80]) {
      const a = pt(startDeg + (sweep * zone) / 100, radius - 9);
      const b = pt(startDeg + (sweep * zone) / 100, radius + 9);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Value arc
    ctx.strokeStyle = stressColor(d.total);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, d2r(startDeg), d2r(valDeg), false);
    ctx.stroke();

    // Labels around arc
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.55)';
    ctx.font = '8px "JetBrains Mono", monospace';
    const labels: Array<[string, number]> = [
      ['GEOPHYSICAL', -118],
      ['MARKETS', 0],
      ['SENTIMENT', 118],
    ];
    for (const [text, deg] of labels) {
      const off = Math.abs(deg) > 90 ? radius + 16 : radius + 18;
      const p = pt(deg, off);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, p.x, p.y);
    }

    // Center readout
    ctx.fillStyle = stressColor(d.total);
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(d.total).toString(), cx, cy - 6);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('STRESS INDEX', cx, cy + 22);

    // Breakdown footer
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.45)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const lines = [
      `QUAKE  ${d.quakeStress.toFixed(1)}  (M4.5+ ${d.quakeCount})`,
      `KP     ${d.kpStress.toFixed(1)}  (${d.kp.toFixed(1)})`,
      `FEAR   ${d.fearStress.toFixed(1)}  (${Math.round(d.fear)})`,
      `VIX    ${d.vixStress.toFixed(1)}  (${d.vix.toFixed(1)})`,
    ];
    let y = 12;
    for (const ln of lines) {
      ctx.fillText(ln, 8, y);
      y += 11;
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
        GLOBAL STRESS GAUGE
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing stress signal...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        geophysical + markets + sentiment composite | arc 0-100
      </p>
    </div>
  );
}

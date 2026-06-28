import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 360;

interface Series {
  code: string;
  label: string;
  values: number[];
}

const SERIES = [
  { code: 'CPIAUCSL', label: 'CPI' },
  { code: 'UNRATE', label: 'UNEMP' },
  { code: 'FEDFUNDS', label: 'FEDFUNDS' },
  { code: 'M2SL', label: 'M2' },
  { code: 'T10Y2Y', label: '10Y-2Y' },
  { code: 'ICSA', label: 'CLAIMS' },
  { code: 'UMCSENT', label: 'SENT' },
  { code: 'INDPRO', label: 'INDPRO' },
];

function parseFredCsv(csv: string): number[] {
  const out: number[] = [];
  for (const line of csv.split('\n')) {
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const v = Number(parts[1]);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  if (a >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

export default function FredSparklines() {
  const [series, setSeries] = createSignal<Series[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const settled = await Promise.allSettled(
        SERIES.map(async (s) => {
          const res = await fetch(
            `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.code}&limit=30`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (!res.ok) throw new Error(`${s.code}`);
          const csv = await res.text();
          const vals = parseFredCsv(csv).slice(-30);
          return { code: s.code, label: s.label, values: vals } as Series;
        }),
      );
      const ok: Series[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value.values.length >= 2) ok.push(r.value);
      }
      if (ok.length === 0) throw new Error('No FRED data');
      setSeries(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const list = series();
    if (!canvas || list.length === 0) return;
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

    const cols = 4;
    const rows = 2;
    const colW = w / cols;
    const rowH = H / rows;
    const pad = 10;

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = col * colW;
      const oy = row * rowH;
      const vals = s.values;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const rng = max - min || 1;
      const up = vals[vals.length - 1] >= vals[0];
      const stroke = up ? '#22c55e' : '#ef4444';
      const fill = up ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)';
      const plotW = colW - pad * 2;
      const plotH = rowH - pad * 2 - 16;
      const xAt = (j: number) => ox + pad + (j / (vals.length - 1)) * plotW;
      const yAt = (v: number) => oy + pad + 12 + (1 - (v - min) / rng) * plotH;

      ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + pad, oy + pad, colW - pad * 2, rowH - pad * 2);

      ctx.beginPath();
      for (let j = 0; j < vals.length; j++) {
        const x = xAt(j);
        const y = yAt(vals[j]);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(xAt(vals.length - 1), oy + pad + 12 + plotH);
      ctx.lineTo(xAt(0), oy + pad + 12 + plotH);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let j = 0; j < vals.length; j++) {
        const x = xAt(j);
        const y = yAt(vals[j]);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = colors.textPrimary || '#fff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(s.label, ox + pad + 4, oy + pad + 2);
      ctx.fillStyle = stroke;
      ctx.textAlign = 'right';
      ctx.fillText(fmt(vals[vals.length - 1]), ox + colW - pad - 4, oy + pad + 2);
    }
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = series();
    if (v.length) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        FRED SPARKLINES
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading FRED series...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        8 macro series | last 30 obs | green = latest higher than first
      </p>
    </div>
  );
}

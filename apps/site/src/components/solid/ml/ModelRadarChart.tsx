import { For, Show, createEffect, createMemo } from 'solid-js';
import { useLlmData } from '../../../lib/llm-data';
import { getThemeColors } from '../../../lib/theme-colors';
import type { LLMBenchmarkModel } from '../../../lib/types';

const ALL_AXES: { key: keyof LLMBenchmarkModel; label: string }[] = [
  { key: 'average_score', label: 'Avg Score' },
  { key: 'mmlu', label: 'MMLU' },
  { key: 'humaneval', label: 'HumanEval' },
  { key: 'gsm8k', label: 'GSM8K' },
  { key: 'hellaswag', label: 'HellaSwag' },
  { key: 'arc', label: 'ARC' },
  { key: 'truthfulqa', label: 'TruthfulQA' },
];

const PALETTE = ['#00e5ff', '#ff4081', '#7c4dff', '#4caf50', '#ffa726'];

export default function ModelRadarChart() {
  const { data, loading } = useLlmData();
  let canvasRef: HTMLCanvasElement | undefined;

  const top5 = createMemo<LLMBenchmarkModel[]>(() => {
    const d = data();
    if (d.length === 0) return [];
    return [...d].sort((a, b) => b.average_score - a.average_score).slice(0, 5);
  });

  // Dynamically determine which axes have data across the top 5 models
  const axes = createMemo(() => {
    const models = top5();
    if (models.length === 0) return ALL_AXES;
    return ALL_AXES.filter((axis) => {
      const nonzero = models.filter((m) => {
        const val = Number(m[axis.key]);
        return val > 0;
      }).length;
      return nonzero >= Math.max(1, models.length * 0.4); // at least 40% of top models have data
    });
  });

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;
    const models = top5();
    const ax = axes();
    if (models.length === 0 || ax.length < 3) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 320 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 320;
    const colors = getThemeColors();
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 56;
    const n = ax.length;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    // Grid rings
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Spokes
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.stroke();
    }

    // Scale ticks along the top spoke (0 -> 100)
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4;
      ctx.fillText(String(ring * 25), cx + 6, cy - r);
    }

    // Axis labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const lx = cx + (radius + 22) * Math.cos(angle);
      const ly = cy + (radius + 22) * Math.sin(angle);
      ctx.fillText(ax[i].label, lx, ly);
    }

    // One polygon per model. Only vertices with a value > 0 are plotted; axes
    // that are 0 / undefined / NaN for a model are skipped so partial data
    // doesn't collapse the polygon to the centre.
    models.forEach((m, mi) => {
      const color = PALETTE[mi % PALETTE.length];
      ctx.fillStyle = `${color}1f`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;

      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        const val = Number(m[ax[i].key]);
        if (!val || val <= 0) continue; // skip missing / zero benchmarks
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = (Math.max(0, Math.min(100, val)) / 100) * radius;
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }

      if (pts.length > 0) {
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        if (pts.length >= 3) {
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();
      }

      // Vertices
      ctx.fillStyle = color;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  createEffect(() => {
    top5();
    draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        TOP 5 MODEL RADAR
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading benchmarks...
        </p>
      </Show>
      <Show when={!loading() && top5().length === 0}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No benchmark data available.
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '320px' }} />
      <Show when={top5().length > 0}>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <For each={top5()}>
            {(m, i) => (
              <div class="flex items-center gap-1.5">
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    background: PALETTE[i() % PALETTE.length],
                  }}
                />
                <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {m.model}
                </span>
              </div>
            )}
          </For>
        </div>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          6-axis benchmark profile | scale 0-100 | top 5 by average score
        </p>
      </Show>
    </div>
  );
}

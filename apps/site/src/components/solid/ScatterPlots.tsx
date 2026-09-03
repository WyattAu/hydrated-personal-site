import { createEffect, createSignal } from 'solid-js';
import { useLlmData } from '../../lib/llm-data';
import { renderPlychart, usePlychartAuto } from '../../lib/plychart-render';

interface Point {
  x: number;
  y: number;
  label: string;
}

const SCATTER_H = 320;

function ScatterCanvas(props: {
  id: string;
  points: () => Point[];
  xLabel: string;
  yLabel: string;
  title: string;
}) {
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; label: string } | null>(null);

  function renderChart() {
    const pts = props.points();
    if (pts.length === 0) return;
    const scatterData = pts.map((p) => [p.x, p.y]);
    renderPlychart(props.id, 'update_scatter', JSON.stringify(scatterData), '');
  }

  createEffect(() => {
    props.points();
    renderChart();
  });

  usePlychartAuto(() => props.id, renderChart);

  function handleMouseMove(e: MouseEvent) {
    const canvas = document.getElementById(props.id);
    const pts = props.points();
    if (!canvas || pts.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    const mx = xMin + ((e.clientX - rect.left) / rect.width) * xRange;
    const my = yMax - ((e.clientY - rect.top) / rect.height) * yRange;

    let closest: Point | null = null;
    let minDist = Number.POSITIVE_INFINITY;
    for (const p of pts) {
      const dx = (p.x - mx) / xRange;
      const dy = (p.y - my) / yRange;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    if (closest && minDist < 0.0025) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: closest.label });
    } else {
      setTooltip(null);
    }
  }

  return (
    <div class="border relative" style="border-color: var(--border); background: var(--bg-card);">
      <p class="label px-4 pt-3 pb-2" style="color: var(--accent);">
        {props.title}
      </p>
      <div>
        <canvas
          id={props.id}
          class="w-full"
          style={{ height: `${SCATTER_H}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          role="img"
          aria-label={props.title}
        />
      </div>
      <p class="font-mono text-[9px] px-4 pb-2" style="color: var(--text-secondary);">
        {props.yLabel} ↑ | {props.xLabel} →
      </p>
      {tooltip() && (
        <div
          class="absolute px-2 py-1 font-mono text-xs pointer-events-none"
          style={{
            left: `${(tooltip()?.x ?? 0) + 12}px`,
            top: `${(tooltip()?.y ?? 0) - 28}px`,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {tooltip()?.label}
        </div>
      )}
    </div>
  );
}

export default function ScatterPlots() {
  const { data, loading } = useLlmData();

  const intelligenceVsPrice = (): Point[] => {
    return data()
      .filter((m) => m.average_score > 0 && (m.price_per_m_token ?? 0) > 0)
      .map((m) => ({
        x: m.price_per_m_token ?? 0,
        y: m.average_score,
        label: m.model,
      }));
  };

  const intelligenceVsSpeed = (): Point[] => {
    return data()
      .filter((m) => m.average_score > 0 && (m.tokens_per_sec ?? 0) > 0)
      .map((m) => ({
        x: m.tokens_per_sec ?? 0,
        y: m.average_score,
        label: m.model,
      }));
  };

  return (
    <div>
      <p class="label mb-3" style="color: var(--accent);">
        SCATTER PLOTS
      </p>
      {!loading() && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ScatterCanvas
            id="scatter-intel-price"
            points={intelligenceVsPrice}
            xLabel="Price ($/1M tokens)"
            yLabel="Intelligence Index"
            title="Intelligence vs. Price"
          />
          <ScatterCanvas
            id="scatter-intel-speed"
            points={intelligenceVsSpeed}
            xLabel="Output Tokens/sec"
            yLabel="Intelligence Index"
            title="Intelligence vs. Speed"
          />
        </div>
      )}
      {loading() && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div
            class="border flex items-center justify-center"
            style="border-color: var(--border); background: var(--bg-card); height: 360px;"
          >
            <p class="code-text" style="color: var(--text-secondary);">
              Loading benchmarks...
            </p>
          </div>
          <div
            class="border flex items-center justify-center"
            style="border-color: var(--border); background: var(--bg-card); height: 360px;"
          >
            <p class="code-text" style="color: var(--text-secondary);">
              Loading benchmarks...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

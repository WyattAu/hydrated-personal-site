import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { useLlmData } from '../../lib/llm-data';

interface Point {
  x: number;
  y: number;
  label: string;
}

function parseParams(params: string): number {
  if (!params || params === '?') return 0;
  const lower = params.toLowerCase();
  if (lower.includes('t')) return Number.parseFloat(lower) * 1000;
  if (lower.includes('b')) return Number.parseFloat(lower) * 1;
  if (lower.includes('m')) return Number.parseFloat(lower) / 1000;
  return Number.parseFloat(lower) || 0;
}

function ScatterCanvas(props: {
  points: () => Point[];
  xLabel: string;
  yLabel: string;
  title: string;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; label: string } | null>(null);

  function draw() {
    const canvas = canvasRef;
    const container = containerRef;
    const pts = props.points();
    if (!canvas || !container || pts.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 320;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padLeft = 60;
    const padRight = 20;
    const padTop = 16;
    const padBottom = 40;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const xPad = xRange * 0.1;
    const yPad = yRange * 0.1;

    const xLo = xMin - xPad;
    const xHi = xMax + xPad;
    const yLo = yMin - yPad;
    const yHi = yMax + yPad;
    const xR = xHi - xLo;
    const yR = yHi - yLo;

    const toX = (v: number) => padLeft + ((v - xLo) / xR) * chartW;
    const toY = (v: number) => padTop + (1 - (v - yLo) / yR) * chartH;

    const bg = getComputedStyle(document.documentElement);
    const bgColor = bg.getPropertyValue('--bg-card').trim() || '#0c0c0c';
    const accent = bg.getPropertyValue('--accent').trim() || '#00e5ff';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const yv = yLo + (yR * i) / 5;
      const y = toY(yv);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(yv.toFixed(1), padLeft - 8, y + 3);

      const xv = xLo + (xR * i) / 5;
      const x = toX(xv);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(xv.toFixed(1), x, h - padBottom + 16);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(props.xLabel, padLeft + chartW / 2, h - 4);
    ctx.save();
    ctx.translate(14, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(props.yLabel, 0, 0);
    ctx.restore();

    pts.forEach((p) => {
      const x = toX(p.x);
      const y = toY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (pts.length <= 15) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        const shortLabel = p.label.length > 12 ? `${p.label.slice(0, 12)}...` : p.label;
        ctx.fillText(shortLabel, x + 8, y + 3);
      }
    });
  }

  createEffect(() => {
    props.points();
    draw();
  });

  onMount(() => {
    const observer = new ResizeObserver(() => draw());
    if (containerRef) observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  function handleMouseMove(e: MouseEvent) {
    const canvas = canvasRef;
    const pts = props.points();
    if (!canvas || pts.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const padLeft = 60;
    const padRight = 20;
    const padTop = 16;
    const padBottom = 40;
    const w = rect.width;
    const h = 320;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const xLo = Math.min(...xs) * 0.9;
    const xHi = Math.max(...xs) * 1.1;
    const yLo = Math.min(...ys) * 0.9;
    const yHi = Math.max(...ys) * 1.1;
    const xR = xHi - xLo;
    const yR = yHi - yLo;

    let closest: { x: number; y: number; label: string } | null = null;
    let minDist = 20;

    pts.forEach((p) => {
      const px = padLeft + ((p.x - xLo) / xR) * chartW;
      const py = padTop + (1 - (p.y - yLo) / yR) * chartH;
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = { x: px, y: py, label: p.label };
      }
    });

    setTooltip(closest);
  }

  return (
    <div class="border relative" style="border-color: var(--border); background: var(--bg-card);">
      <p class="label px-4 pt-3 pb-2" style="color: var(--accent);">
        {props.title}
      </p>
      <div ref={containerRef}>
        <canvas
          ref={canvasRef}
          class="w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          role="img"
          aria-label={props.title}
        />
      </div>
      {tooltip() && (
        <div
          class="absolute px-2 py-1 font-mono text-xs pointer-events-none"
          style={{
            left: `${tooltip()?.x + 12}px`,
            top: `${tooltip()?.y - 28}px`,
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
      .filter((m) => m.average_score > 0)
      .map((m) => ({
        x: parseParams(m.parameter_count),
        y: m.average_score,
        label: m.model,
      }));
  };

  const intelligenceVsSpeed = (): Point[] => {
    return data()
      .filter((m) => m.average_score > 0 && m.humaneval > 0)
      .map((m) => ({
        x: m.humaneval,
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
            points={intelligenceVsPrice}
            xLabel="Parameters (B)"
            yLabel="Average Score"
            title="LLM Intelligence vs. Size"
          />
          <ScatterCanvas
            points={intelligenceVsSpeed}
            xLabel="HumanEval Score"
            yLabel="Average Score"
            title="LLM Intelligence vs. Coding"
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

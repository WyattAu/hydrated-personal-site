import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

interface DrawdownResult {
  underwater: number[];
  max_drawdown: number;
  max_dd_duration: number;
  current_drawdown: number;
  calmar: number;
  ulcer_index: number;
  pain_index: number;
}

interface ChartResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{ close: Array<number | null> }>;
      };
      timestamp?: number[];
    }>;
  };
  error?: unknown;
}

export default function EtfDrawdownChart(props: { symbol: string }) {
  const [result, setResult] = createSignal<DrawdownResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: WASM dynamic import returns untyped module
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock-chart?symbol=${props.symbol}&range=1y&interval=1d`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: ChartResponse = await res.json();
      if (json.error) throw new Error('chart unavailable');
      const quote = json.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c): c is number => c != null);
      if (closes.length < 30) throw new Error('insufficient data');

      if (!wasmMod) {
        const _w = '/wasm/hydrated_widgets.js';
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const out = wasmMod.quant_drawdown(Float64Array.from(closes), 252);
      setResult(JSON.parse(out));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !result()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 280;
    const colors = getThemeColors();
    const r = result()!;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 56, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    // Zero line sits near the top; drawdowns extend downward.
    const zeroY = pad.t + 8;
    const maxDd = Math.max(...r.underwater, 0.0001);
    // Add headroom and a little tail room.
    const yScale = (cH - 8) / (maxDd * 1.1);

    const n = r.underwater.length;
    const toX = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * cW);
    const toY = (dd: number) => zeroY + dd * yScale;

    // Grid + Y labels (depth percentages)
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const dd = (maxDd * 1.1 * i) / steps;
      const y = zeroY + dd * yScale;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(dd * 100).toFixed(1)}%`, pad.l - 6, y + 3);
    }

    // Underwater filled area (red gradient)
    const grad = ctx.createLinearGradient(0, zeroY, 0, zeroY + cH);
    grad.addColorStop(0, `${colors.accentWarm || '#f0883e'}55`);
    grad.addColorStop(1, `${colors.accentWarm || '#f0883e'}10`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(toX(0), zeroY);
    for (let i = 0; i < n; i++) ctx.lineTo(toX(i), toY(r.underwater[i]));
    ctx.lineTo(toX(n - 1), zeroY);
    ctx.closePath();
    ctx.fill();

    // Underwater stroke
    ctx.strokeStyle = colors.accentWarm || '#f0883e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(i), toY(r.underwater[i])) : ctx.lineTo(toX(i), toY(r.underwater[i]));
    }
    ctx.stroke();

    // Max drawdown marker
    const troughIdx = r.underwater.indexOf(r.max_drawdown);
    if (troughIdx >= 0) {
      const tx = toX(troughIdx);
      const ty = toY(r.max_drawdown);
      ctx.fillStyle = colors.accentWarm || '#f0883e';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.accentWarm || '#f0883e';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      const labelX = Math.min(tx + 6, w - pad.r - 90);
      ctx.fillText(`MAX DD -${(r.max_drawdown * 100).toFixed(2)}%`, labelX, ty - 5);
    }

    // Stats box (top-right)
    const boxW = 138;
    const boxH = 58;
    const boxX = w - pad.r - boxW;
    const boxY = pad.t;
    ctx.fillStyle = `${colors.bgSecondary || '#0a0a0a'}cc`;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = colors.border || '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CALMAR', boxX + 8, boxY + 14);
    ctx.fillText('ULCER IDX', boxX + 8, boxY + 30);
    ctx.fillText('CURRENT', boxX + 8, boxY + 46);
    ctx.fillStyle = colors.textPrimary || '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(r.calmar.toFixed(2), boxX + boxW - 8, boxY + 14);
    ctx.fillText(`${(r.ulcer_index * 100).toFixed(2)}%`, boxX + boxW - 8, boxY + 30);
    ctx.fillText(`${(r.current_drawdown * 100).toFixed(2)}%`, boxX + boxW - 8, boxY + 46);

    // X axis baseline
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(pad.l, zeroY);
    ctx.lineTo(w - pad.r, zeroY);
    ctx.stroke();
  }

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    const v = result();
    if (v) draw();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          DRAWDOWN ANALYSIS
        </p>
        <Show
          when={!loading()}
          fallback={
            <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              LOADING...
            </span>
          }
        >
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {props.symbol}
          </span>
        </Show>
      </div>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
      <Show when={result()} keyed>
        {(d) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            {props.symbol} 1y daily | max DD {(d.max_drawdown * 100).toFixed(2)}% | duration{' '}
            {d.max_dd_duration}d | pain {(d.pain_index * 100).toFixed(2)}%
          </p>
        )}
      </Show>
    </div>
  );
}

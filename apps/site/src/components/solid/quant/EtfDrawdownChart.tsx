import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeTicker } from '../../../lib/etf-store';
import { getThemeColors } from '../../../lib/theme-colors';

interface DDResult {
  underwater: number[];
  max_drawdown: number;
  max_dd_duration: number;
  current_drawdown: number;
  calmar: number;
  ulcer_index: number;
  pain_index: number;
}

let sharedWasm: any = null;

export default function EtfDrawdownChart() {
  // Ticker from shared store
  const [result, setResult] = createSignal<DDResult | null>(null);
  const [loading, setLoading] = createSignal(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeTicker()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error('API');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c: number | null) => c != null);
      if (closes.length < 30) throw new Error('insufficient');

      if (!sharedWasm) {
        const _wasmUrl = '/wasm/hydrated_widgets.js?v=j30';
        sharedWasm = await import(_wasmUrl);
        await sharedWasm.default();
      }
      const out = sharedWasm.quant_drawdown(Float64Array.from(closes), 252);
      setResult(JSON.parse(out));
    } catch {
      setResult(null);
    }
    setLoading(false);
  }

  function draw() {
    const canvas = document.getElementById('etf-dd') as HTMLCanvasElement | undefined;
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
    const pad = { l: 56, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;
    const zeroY = pad.t + 8;
    const maxDD = Math.max(0.01, ...r.underwater);

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = zeroY + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${((-(maxDD * i) / 4) * 100).toFixed(0)}%`, pad.l - 5, y + 3);
    }

    const grad = ctx.createLinearGradient(0, zeroY, 0, zeroY + cH);
    grad.addColorStop(0, 'rgba(255, 64, 129, 0.05)');
    grad.addColorStop(1, 'rgba(255, 64, 129, 0.4)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pad.l, zeroY);
    r.underwater.forEach((dd, i) => {
      const x = pad.l + (i / (r.underwater.length - 1)) * cW;
      const y = zeroY + (dd / maxDD) * cH;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(w - pad.r, zeroY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    r.underwater.forEach((dd, i) => {
      const x = pad.l + (i / (r.underwater.length - 1)) * cW;
      const y = zeroY + (dd / maxDD) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Max DD: ${(r.max_drawdown * 100).toFixed(1)}%`, w - pad.r - 140, pad.t + 14);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`Calmar: ${r.calmar.toFixed(2)}`, w - pad.r - 140, pad.t + 28);
    ctx.fillText(`Ulcer: ${r.ulcer_index.toFixed(3)}`, w - pad.r - 140, pad.t + 42);
    ctx.fillText(`Current: ${(r.current_drawdown * 100).toFixed(1)}%`, w - pad.r - 140, pad.t + 56);
  }

  onMount(() => loadData());
  createEffect(() => {
    activeTicker();
    loadData();
  });
  createEffect(() => {
    const r = result();
    if (r) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        DRAWDOWN ANALYSIS: {activeTicker()}
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading {activeTicker()}...
        </p>
      </Show>
      <canvas id="etf-dd" class="w-full" style={{ height: '280px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        {activeTicker()} 1Y daily underwater curve WASM drawdown
      </p>
    </div>
  );
}

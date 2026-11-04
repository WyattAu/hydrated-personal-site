import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { drawGrid, getChartTheme, setupCanvas } from '../../../lib/chart-utils';
import { activeTicker } from '../../../lib/etf-store';
import { WASM_VERSION } from '../../../lib/wasm-version';

interface VarResult {
  var_historical: number;
  es_historical: number;
  var_parametric: number;
  es_parametric: number;
  histogram_edges: number[];
  histogram_counts: number[];
}

interface ChartResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{ close: Array<number | null> }>;
      };
    }>;
  };
  error?: unknown;
}

export default function EtfVaR() {
  // Ticker from shared store
  const [data, setData] = createSignal<VarResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeTicker()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: ChartResponse = await res.json();
      if (json.error) throw new Error('chart unavailable');
      const quote = json.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c): c is number => c != null);
      if (closes.length < 30) throw new Error('insufficient data');

      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      if (!wasmMod) {
        const _w = `/wasm/hydrated_widgets.js?v=${WASM_VERSION}`;
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const out = wasmMod.quant_var(returns, 0.05);
      setData(JSON.parse(out));
      setChartMetaState('etf-var', { freshAt: Date.now(), error: null });
    } catch (e) {
      setChartMetaState('etf-var', { error: e instanceof Error ? e.message : 'VaR failed' });
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !data()) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = 260;
    const theme = getChartTheme();
    const ctx = setupCanvas(canvas, w, h, theme);
    const pad = { l: 50, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    const d = data()!;
    const edges = d.histogram_edges;
    const counts = d.histogram_counts;
    if (edges.length < 2) return;

    const maxCount = Math.max(...counts) || 1;
    const minRet = edges[0];
    const maxRet = edges[edges.length - 1];
    const range = maxRet - minRet || 1;
    const barW = cW / counts.length;

    const toX = (v: number) => pad.l + ((v - minRet) / range) * cW;
    const toH = (c: number) => (c / maxCount) * cH;

    drawGrid(ctx, w, h, theme, { top: pad.t, right: pad.r, bottom: pad.b, left: pad.l });

    // Histogram bars (tail beyond VaR highlighted)
    counts.forEach((c, i) => {
      const x = pad.l + i * barW;
      const barH = toH(c);
      const isTail = edges[i] <= d.var_historical;
      ctx.fillStyle = isTail ? `${theme.negative}80` : `${theme.primary}40`;
      ctx.fillRect(x + 1, pad.t + cH - barH, barW - 2, barH);
    });

    // VaR line
    const varX = toX(d.var_historical);
    ctx.strokeStyle = theme.negative;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(varX, pad.t);
    ctx.lineTo(varX, pad.t + cH);
    ctx.stroke();
    ctx.fillStyle = theme.negative;
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`VaR(95%) ${(d.var_historical * 100).toFixed(2)}%`, varX + 4, pad.t + 12);

    // ES line
    const esX = toX(d.es_historical);
    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(esX, pad.t);
    ctx.lineTo(esX, pad.t + cH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff4081';
    ctx.fillText(`ES(95%) ${(d.es_historical * 100).toFixed(2)}%`, esX + 4, pad.t + 26);

    ctx.fillStyle = theme.textMuted;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const val = minRet + (range * i) / 5;
      ctx.fillText(`${(val * 100).toFixed(1)}%`, pad.l + (cW * i) / 5, h - 8);
    }
  }

  onMount(() => {
    attachChartMeta('etf-var', {
      source: 'Yahoo Finance',
      detail: '1y daily log returns · 95% HS/param',
    });
    loadData();
  });

  createEffect(() => {
    activeTicker();
    loadData();
  });

  createEffect(() => {
    const v = data();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        VALUE AT RISK: {activeTicker()}
      </p>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas ref={canvasRef} id="etf-var" class="w-full" style={{ height: '260px' }} />
      <Show when={data()} keyed>
        {(d) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            {activeTicker()} 1d log returns | VaR(95%): {(d.var_historical * 100).toFixed(2)}% |
            ES(95%): {(d.es_historical * 100).toFixed(2)}%
          </p>
        )}
      </Show>
    </div>
  );
}

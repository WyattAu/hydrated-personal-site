import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface HrpResult {
  weights: number[];
  method: string;
}

async function fetchRets(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

export default function HrpAllocation() {
  const [labels, setLabels] = createSignal<string[]>([]);
  const [weights, setWeights] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 2) throw new Error('Need at least 2 tickers');

      const fetched = await Promise.all(tickers.map((t) => fetchRets(t.symbol, '1y')));
      const validIdx: number[] = [];
      const validRets: number[][] = [];
      tickers.forEach((_t, i) => {
        if (fetched[i].length >= 30) {
          validIdx.push(i);
          validRets.push(fetched[i]);
        }
      });
      if (validRets.length < 2) throw new Error('Insufficient data');

      const nAssets = validRets.length;
      const nPeriods = Math.min(...validRets.map((r) => r.length));
      const flat = new Float64Array(nAssets * nPeriods);
      for (let i = 0; i < nAssets; i++) {
        for (let j = 0; j < nPeriods; j++) flat[i * nPeriods + j] = validRets[i][j];
      }

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_hrp(flat, nAssets, nPeriods);
      const parsed = JSON.parse(json);
      if (
        !parsed.weights ||
        !Array.isArray(parsed.weights) ||
        parsed.weights.some((w: any) => w === null || Number.isNaN(w))
      ) {
        throw new Error('HRP computation failed - check ticker data');
      }
      setWeights(parsed.weights.map((w: number | null) => w ?? 0));
      setLabels(validIdx.map((i) => tickers[i].label));
    } catch (e) {
      console.error('[HrpAllocation]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setWeights([]);
      setLabels([]);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || weights().length === 0) return;
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
    const labelW = 64;
    const pad = { l: 8, r: 40, t: 16, b: 28 };
    const plotX0 = pad.l + labelW;
    const plotW = w - pad.r - plotX0;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    // Sort descending by weight
    const labs = labels();
    const ws = weights();
    const order = labs.map((_, i) => i).sort((a, b) => (ws[b] ?? 0) - (ws[a] ?? 0));
    const n = Math.min(order.length, labs.length, ws.length);
    if (n < 1) return;

    const maxW = Math.max(...order.slice(0, n).map((i) => ws[i] ?? 0)) || 1;
    const rowH = cH / n;
    const barH = Math.min(20, rowH * 0.6);

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const x = plotX0 + (plotW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + cH);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`${(((maxW * i) / 4) * 100).toFixed(0)}%`, x, h - pad.b + 14);
    }

    for (let r = 0; r < n; r++) {
      const idx = order[r];
      const v = ws[idx] ?? 0;
      const y = pad.t + r * rowH + (rowH - barH) / 2;
      const barW = (v / maxW) * plotW;
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(plotX0, y, Math.max(1, barW), barH);
      // label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'right';
      const lbl = labs[idx].length > 8 ? labs[idx].slice(0, 8) : labs[idx];
      ctx.fillText(lbl, plotX0 - 4, y + barH / 2 + 3);
      // value
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4caf50';
      ctx.fillText(`${(v * 100).toFixed(1)}%`, plotX0 + barW + 4, y + barH / 2 + 3);
    }
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  createEffect(() => {
    weights();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          HRP ALLOCATION
        </p>
        <Show when={!loading() && weights().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {labels().length} assets | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing HRP allocation...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && weights().length === 0}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <Show when={!loading() && weights().length > 0}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Hierarchical Risk Parity | Distance-correlation clustering | Recursive bisection | No
          matrix inversion
        </p>
      </Show>
    </div>
  );
}

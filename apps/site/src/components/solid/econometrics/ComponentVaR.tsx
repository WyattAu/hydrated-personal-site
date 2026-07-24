import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface VarResult {
  portfolio_var: number;
  contributions: number[];
  percentages: number[];
  total_var: number;
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

export default function ComponentVaR() {
  const [labels, setLabels] = createSignal<string[]>([]);
  const [data, setData] = createSignal<VarResult | null>(null);
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
      const w = new Float64Array(nAssets);
      const eq = 1 / nAssets;
      for (let i = 0; i < nAssets; i++) w[i] = eq;

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_component_var(flat, nAssets, nPeriods, w, 0.05);
      const parsed = JSON.parse(json);
      if (!parsed.contributions || !Array.isArray(parsed.contributions)) {
        throw new Error('Component VaR computation failed');
      }
      setData({
        portfolio_var: parsed.portfolio_var ?? 0,
        contributions: Array.isArray(parsed.contributions)
          ? parsed.contributions.map((v: number | null) => v ?? 0)
          : [],
        percentages: Array.isArray(parsed.percentages)
          ? parsed.percentages.map((v: number | null) => v ?? 0)
          : [],
        total_var: parsed.total_var ?? 0,
      });
      setLabels(validIdx.map((i) => tickers[i].label));
    } catch (e) {
      console.error('[ComponentVaR]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !data()) return;
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

    const d = data()!;
    const labs = labels();
    const pcts = d.percentages ?? [];
    const n = Math.min(pcts.length, labs.length);
    if (n < 1) return;

    const vmin = Math.min(0, ...pcts.slice(0, n));
    const vmax = Math.max(0, ...pcts.slice(0, n));
    const range = vmax - vmin || 1;
    const zeroX = plotX0 + (-vmin / range) * plotW;
    const xOf = (v: number) => plotX0 + ((v - vmin) / range) * plotW;
    const rowH = cH / n;
    const barH = Math.min(20, rowH * 0.6);

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';

    for (let i = 0; i < n; i++) {
      const v = pcts[i];
      const y = pad.t + i * rowH + (rowH - barH) / 2;
      const xL = Math.min(zeroX, xOf(v));
      const xR = Math.max(zeroX, xOf(v));
      ctx.fillStyle = v >= 0 ? 'rgba(255, 82, 82, 0.85)' : 'rgba(0, 160, 255, 0.85)';
      ctx.fillRect(xL, y, Math.max(1, xR - xL), barH);
      // label
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'right';
      const lbl = labs[i].length > 8 ? labs[i].slice(0, 8) : labs[i];
      ctx.fillText(lbl, plotX0 - 4, y + barH / 2 + 3);
      // value
      ctx.textAlign = 'left';
      ctx.fillStyle = v >= 0 ? '#ff5252' : '#00a0ff';
      ctx.fillText(`${(v * 100).toFixed(1)}%`, xR + 4, y + barH / 2 + 3);
    }

    // Zero line
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(zeroX, pad.t);
    ctx.lineTo(zeroX, pad.t + cH);
    ctx.stroke();

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['RISK-ADDER', '#ff5252'],
      ['DIVERSIFIER', '#00a0ff'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 8 + i * 110;
      ctx.fillStyle = color;
      ctx.fillRect(x, h - 14, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, h - 7);
    });
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  createEffect(() => {
    data();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          COMPONENT VaR DECOMPOSITION
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {labels().length} assets | 1Y daily | 95%
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing component VaR...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && !data()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <Show when={!loading() && data()}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          95% VaR | Leave-one-out decomposition | Positive = risk contributor | Negative =
          diversifier
        </p>
      </Show>
    </div>
  );
}

import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getThemeColors } from '../../../lib/theme-colors';
import { getWasmMod } from '../../../lib/wasm-loader';

interface VolResult {
  realized_var: number;
  bipower_var: number;
  continuous_var: number;
  jump_var: number;
  jump_ratio: number;
  annualized_vol: number;
  jump_days: number[];
  daily_rv_tail: number[];
  daily_bv_tail: number[];
}

export default function RealizedVolDecomposition() {
  const [data, setData] = createSignal<VolResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 30) throw new Error('Insufficient data');

      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      const wasmMod = await getWasmMod();
      const json2 = wasmMod.quant_realized_vol(returns);
      setData(JSON.parse(json2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
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
    const pad = { l: 50, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const d = data()!;
    const rv = d.daily_rv_tail;
    const bv = d.daily_bv_tail;
    const jumpVar = rv.map((r, i) => Math.max(0, r - (bv[i] ?? 0)));
    const contVar = bv;
    const win = 90;
    const start = Math.max(0, rv.length - win);
    const n = rv.length - start;
    if (n < 2) return;

    const maxV = Math.max(...rv.slice(start)) * 1.1 || 1;
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - v / maxV) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxV - (maxV * i) / 4).toExponential(1)}`, pad.l - 5, y + 3);
    }

    // Continuous (bottom) area — blue
    ctx.fillStyle = `${colors.accent || '#00e5ff'}66`;
    ctx.beginPath();
    ctx.moveTo(toX(0), pad.t + cH);
    for (let i = 0; i < n; i++) ctx.lineTo(toX(i), toY(contVar[start + i] ?? 0));
    ctx.lineTo(toX(n - 1), pad.t + cH);
    ctx.closePath();
    ctx.fill();

    // Jump (top) area stacked on continuous — red
    ctx.fillStyle = `${colors.accentWarm || '#ff6b35'}99`;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(contVar[start + 0] ?? 0));
    for (let i = 0; i < n; i++)
      ctx.lineTo(toX(i), toY((contVar[start + i] ?? 0) + (jumpVar[start + i] ?? 0)));
    ctx.lineTo(toX(n - 1), toY(contVar[start + n - 1] ?? 0));
    ctx.closePath();
    ctx.fill();

    // Jump day markers
    for (let i = 0; i < n; i++) {
      if (d.jump_days[start + i]) {
        const x = toX(i);
        ctx.strokeStyle = '#ff5252aa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pad.t);
        ctx.lineTo(x, pad.t + cH);
        ctx.stroke();
      }
    }

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['CONTINUOUS', colors.accent || '#00e5ff'],
      ['JUMP', colors.accentWarm || '#ff6b35'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 10 + i * 90;
      ctx.fillStyle = color;
      ctx.fillRect(x, h - 14, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, h - 7);
    });
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  createEffect(() => {
    data();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          REALIZED VOLATILITY DECOMPOSITION
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 1Y daily | last 90d
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing realized vol...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />

      <Show when={!loading() && data()} keyed>
        {(d) => (
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Realized Vol
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {((d.annualized_vol ?? 0) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Continuous
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {(((d.continuous_var ?? 0) / (d.realized_var || 1)) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Jump
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent-warm)' }}>
                {(((d.jump_var ?? 0) / (d.realized_var || 1)) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Jump Ratio
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent-warm)' }}>
                {((d.jump_ratio ?? 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

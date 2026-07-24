import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { getThemeColors } from '../../../lib/theme-colors';
import { getWasmMod } from '../../../lib/wasm-loader';

interface RegimeResult {
  states_tail: number[];
  transition: number[][];
  means: number[];
  variances: number[];
  probs_tail: number[];
  current_regime: number;
  regime_label: string;
}

export default function RegimeDetector() {
  const [data, setData] = createSignal<RegimeResult | null>(null);
  const [returns, setReturns] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=3y&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 50) throw new Error('Insufficient data');

      const rets = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) rets[i - 1] = Math.log(closes[i] / closes[i - 1]);

      const wasmMod = await getWasmMod();
      const json2 = wasmMod.quant_regime(rets);
      setData(JSON.parse(json2));
      setReturns(Array.from(rets));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !data() || returns().length === 0) return;
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
    const rets = returns();
    const states = d.states_tail;
    const win = 120;
    const start = Math.max(0, rets.length - win);
    const n = rets.length - start;
    if (n < 2) return;

    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const maxAbs = Math.max(...rets.slice(start).map((r) => Math.abs(r))) || 0.05;
    const toY = (v: number) => pad.t + (1 - (v + maxAbs) / (2 * maxAbs)) * cH;

    // Background by state
    for (let i = 0; i < n; i++) {
      const st = states[start + i] ?? 0;
      ctx.fillStyle = st === 0 ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 82, 82, 0.12)';
      ctx.fillRect(toX(i), pad.t, cW / (n - 1) + 1, cH);
    }

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
      ctx.fillText(`${(((maxAbs * 2 * i) / 4 - maxAbs) * 100).toFixed(1)}%`, pad.l - 5, y + 3);
    }

    // Zero line
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, toY(0));
    ctx.lineTo(w - pad.r, toY(0));
    ctx.stroke();

    // Returns line
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(i), toY(rets[start + i])) : ctx.lineTo(toX(i), toY(rets[start + i]));
    }
    ctx.stroke();

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['LOW-VOL', '#4caf50'],
      ['HIGH-VOL', '#ff5252'],
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

  createEffect(() => {
    activeAsset();
    loadData();
  });

  createEffect(() => {
    data();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          REGIME DETECTION (HMM 2-STATE)
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 3Y daily | last 120d
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing regimes...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />

      <Show when={!loading() && data()} keyed>
        {(d) => {
          const trans = d.transition ?? [
            [0, 0],
            [0, 0],
          ];
          const label = d.regime_label ?? (d.current_regime === 0 ? 'LOW-VOL' : 'HIGH-VOL');
          return (
            <div class="flex items-center gap-4 mt-2 flex-wrap">
              <div
                class="border px-4 py-2 font-mono text-lg font-bold"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                  color: d.current_regime === 0 ? '#4caf50' : '#ff5252',
                }}
              >
                {label}
              </div>
              <div
                class="grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-[9px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span />
                <span class="text-center">→ LOW</span>
                <span class="text-center">→ HIGH</span>
                <span>FROM LOW</span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[0]?.[0] ?? 0) * 100).toFixed(1)}%
                </span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[0]?.[1] ?? 0) * 100).toFixed(1)}%
                </span>
                <span>FROM HIGH</span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[1]?.[0] ?? 0) * 100).toFixed(1)}%
                </span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[1]?.[1] ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}

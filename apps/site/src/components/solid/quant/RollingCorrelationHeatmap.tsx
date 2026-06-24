import { Show, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

export default function RollingCorrelationHeatmap() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [step, setStep] = createSignal(0);
  const [maxSteps, setMaxSteps] = createSignal(0);
  let canvasRef: HTMLCanvasElement | undefined;
  let matrices: number[][][] = []; // [time_steps][N][N]
  let labels: string[] = [];
  let rafId = 0;
  let lastFrame = 0;

  async function loadData() {
    setLoading(true);
    try {
      const assets = [
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'BNBUSDT',
        'XRPUSDT',
        'ADAUSDT',
        'DOGEUSDT',
        'AVAXUSDT',
      ];
      labels = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];
      const allReturns: number[][] = [];

      for (const sym of assets) {
        const res = await fetch(`/api/binance-klines?symbol=${sym}&interval=1d&limit=180`);
        if (!res.ok) continue;
        const klines = await res.json();
        const closes = klines.map((k: (string | number)[]) => Number.parseFloat(k[4] as string));
        allReturns.push(closes.slice(1).map((c: number, i: number) => Math.log(c / closes[i])));
      }

      const n = allReturns.length;
      if (n < 3) throw new Error('insufficient');
      const T = allReturns[0].length;
      const window = 30;
      const numSteps = Math.min(50, T - window);
      setMaxSteps(numSteps);

      matrices = [];
      for (let s = 0; s < numSteps; s++) {
        const offset = s * Math.floor((T - window) / numSteps);
        const matrix: number[][] = [];
        for (let i = 0; i < n; i++) {
          matrix.push([]);
          const iRets = allReturns[i].slice(offset, offset + window);
          const iMean = iRets.reduce((a, b) => a + b, 0) / iRets.length;
          for (let j = 0; j < n; j++) {
            if (i === j) {
              matrix[i][j] = 1;
              continue;
            }
            const jRets = allReturns[j].slice(offset, offset + window);
            const jMean = jRets.reduce((a, b) => a + b, 0) / jRets.length;
            let cov = 0;
            let vi = 0;
            let vj = 0;
            for (let t = 0; t < window; t++) {
              const di = iRets[t] - iMean;
              const dj = jRets[t] - jMean;
              cov += di * dj;
              vi += di * di;
              vj += dj * dj;
            }
            matrix[i][j] = vi === 0 || vj === 0 ? 0 : cov / Math.sqrt(vi * vj);
          }
        }
        matrices.push(matrix);
      }
      setLoading(false);
      animate(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setLoading(false);
    }
  }

  function drawStep() {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = 340 * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = 340;
    const colors = getThemeColors();
    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    if (matrices.length === 0) return;
    const m = matrices[Math.min(step(), matrices.length - 1)];
    const n = m.length;
    const labelPad = 40;
    const cellW = (w - labelPad * 2) / n;
    const cellH = (h - labelPad * 2) / n;
    const startX = labelPad;
    const startY = labelPad;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const val = m[i][j];
        const _r = val < 0 ? 255 : 0;
        const _g = val > 0 ? 200 + val * 55 : 0;
        const _b = val < 0 ? 129 : 0;
        const alpha = Math.min(1, Math.abs(val));
        ctx.fillStyle = val < 0 ? `rgba(255, 64, 129, ${alpha})` : `rgba(0, 229, 255, ${alpha})`;
        ctx.fillRect(startX + j * cellW, startY + i * cellH, cellW - 1, cellH - 1);
      }
    }

    // Labels
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    for (let i = 0; i < n; i++) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], startX - 4, startY + i * cellH + cellH / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(labels[i], startX + i * cellW + cellW / 2, startY - 4);
    }

    // Time indicator
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`step ${step()}/${maxSteps()}`, w - 10, 4);
  }

  function animate(ts: number) {
    if (ts - lastFrame > 500) {
      setStep((s) => (s >= maxSteps() - 1 ? 0 : s + 1));
      lastFrame = ts;
      drawStep();
    }
    rafId = requestAnimationFrame(animate);
  }

  onMount(() => {
    loadData();
    onMount(() => cancelAnimationFrame(rafId));
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          ROLLING CORRELATION MATRIX
        </p>
        <Show when={!loading()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            30d window
          </span>
        </Show>
      </div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing rolling correlations...
        </p>
      </Show>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '340px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        8 assets | 180d daily | animated 30d rolling window | cyan = positive | magenta = negative
      </p>
    </div>
  );
}

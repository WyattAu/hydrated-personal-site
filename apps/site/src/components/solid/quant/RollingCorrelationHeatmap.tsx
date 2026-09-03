import { Show, createSignal, onMount } from 'solid-js';
import { getPlychart } from '../../../lib/plychart-loader';

const CANVAS_ID = 'rolling-corr';
const H = 340;

export default function RollingCorrelationHeatmap() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [step, setStep] = createSignal(0);
  const [maxSteps, setMaxSteps] = createSignal(0);
  const [wasmReady, setWasmReady] = createSignal(false);
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
        const _raw = await res.json();
        const klines = _raw.data || _raw;
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

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
      if (canvas) {
        p.create_chart(CANVAS_ID, canvas.clientWidth || 600, H);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  function drawStep() {
    if (!wasmReady()) return;
    if (matrices.length === 0) return;
    const m = matrices[Math.min(step(), matrices.length - 1)];
    getPlychart().then((p) => {
      p.update_heatmap(CANVAS_ID, JSON.stringify(m), '');
    });
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
    initWasm();
    loadData();
    onMount(() => cancelAnimationFrame(rafId));
  });

  const labelsLine = () => labels.join(' ');

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          ROLLING CORRELATION MATRIX
        </p>
        <Show when={!loading()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            30d window | step {step()}/{maxSteps()}
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
      <canvas id={CANVAS_ID} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        {labelsLine()} | 8 assets | 180d daily | animated 30d rolling window | cyan = positive |
        magenta = negative
      </p>
    </div>
  );
}

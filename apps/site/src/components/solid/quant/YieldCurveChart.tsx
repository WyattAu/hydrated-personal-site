import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { WASM_VERSION } from '../../../lib/wasm-version';

interface YieldResult {
  beta0: number;
  beta1: number;
  beta2: number;
  lambda: number;
  fitted: number[];
  spread_10y_3m: number;
  recession_probability: number;
}

interface YieldPoint {
  label: string;
  maturity: number;
  yield: number;
}

export default function YieldCurveChart() {
  const [data, setData] = createSignal<YieldResult | null>(null);
  const [raw, setRaw] = createSignal<YieldPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/treasury-yields`);
      if (!res.ok) throw new Error('API');
      const yields = await res.json();
      if (!Array.isArray(yields) || yields.length < 3) throw new Error('insufficient');
      setRaw(yields);

      const maturities = new Float64Array(yields.map((y: YieldPoint) => y.maturity));
      const yieldVals = new Float64Array(yields.map((y: YieldPoint) => y.yield));

      if (!wasmMod) {
        const _w = `/wasm/hydrated_widgets.js?${WASM_VERSION}`;
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const json = wasmMod.quant_yield_curve(maturities, yieldVals);
      setData(JSON.parse(json));
    } catch {
      /* skip */
    } finally {
      setLoading(false);
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const d = data();
    if (!d) return;

    // Generate Nelson-Siegel fitted curve over 100 steps (log-spaced maturities)
    const minM = 0.05;
    const maxM = 30.0;
    const steps = 100;
    const fittedData: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];
    for (let i = 0; i <= steps; i++) {
      const m = minM * (maxM / minM) ** (i / steps);
      const x = m / d.lambda;
      const f1 = x < 1e-10 ? 1 : (1 - Math.exp(-x)) / x;
      const f2 = f1 - Math.exp(-m / d.lambda);
      const y = d.beta0 + d.beta1 * f1 + d.beta2 * f2;
      fittedData.push({ time: i, open: 0, high: 0, low: 0, close: y, volume: 0 });
    }

    const series = [{ color: '#00e5ff', data: fittedData }];
    tipData = fittedData;

    renderPlychart('yield-curve', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'yield-curve', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('yield-curve', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        YIELD CURVE (NELSON-SIEGEL)
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading FRED Treasury data...
        </p>
      </Show>
      <canvas id="yield-curve" class="w-full" style={{ height: '280px' }} />
      <Show when={data()} keyed>
        {(d) => (
          <>
            <p
              class="font-mono text-[10px] mt-1"
              style={{ color: d.recession_probability > 0.5 ? 'var(--accent-warm)' : '#4caf50' }}
            >
              RECESSION RISK: {(d.recession_probability * 100).toFixed(0)}% | spread 10Y-3M:{' '}
              {d.spread_10y_3m.toFixed(2)}%
            </p>
            <p class="font-mono text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              FRED DGS1MO-DGS30 | NS fit: b0={d.beta0.toFixed(2)} b1={d.beta1.toFixed(2)} b2=
              {d.beta2.toFixed(2)} lam={d.lambda.toFixed(1)}
            </p>
          </>
        )}
      </Show>
    </div>
  );
}

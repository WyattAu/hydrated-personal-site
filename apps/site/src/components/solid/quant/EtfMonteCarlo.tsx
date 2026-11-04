import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { activeTicker } from '../../../lib/etf-store';
import {
  attachPlychartTooltip,
  renderPlychart,
  setChartLabels,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { WASM_VERSION } from '../../../lib/wasm-version';

interface MCResult {
  drift: number;
  volatility: number;
  s0: number;
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
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

type QuantWasmModule = {
  default: () => Promise<void>;
  quant_seed: (a: number, b: number) => void;
  quant_montecarlo: (
    data: Float64Array,
    tradingDays: number,
    horizon: number,
    paths: number,
  ) => string;
};

export default function EtfMonteCarlo() {
  const [result, setResult] = createSignal<MCResult | null>(null);
  const [historical, setHistorical] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let wasmMod: QuantWasmModule | null = null;

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
      setHistorical(closes);

      let mod = wasmMod;
      if (!mod) {
        const _w = `/wasm/hydrated_widgets.js?${WASM_VERSION}`;
        const imported = (await import(_w)) as QuantWasmModule;
        await imported.default();
        imported.quant_seed(Math.random() * 1e18, Math.random() * 1e18);
        wasmMod = imported;
        mod = imported;
      }
      const out = mod.quant_montecarlo(Float64Array.from(closes), 252, 90, 1000);
      setResult(JSON.parse(out));
      setChartMetaState('etf-mc-fan', { freshAt: Date.now(), error: null });
    } catch (e) {
      setChartMetaState('etf-mc-fan', {
        error: e instanceof Error ? e.message : 'simulation failed',
      });
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(v: number): string {
    if (v >= 10000) return v.toFixed(0);
    if (v >= 100) return v.toFixed(1);
    if (v >= 1) return v.toFixed(2);
    return v.toFixed(4);
  }

  let tipData: object[] = [];

  function renderChart() {
    const r = result();
    const h = historical();
    if (!r || h.length === 0) return;

    const histLen = h.length;

    const p95Data = r.p95.map((v, i) => ({
      time: histLen + i,
      open: v,
      high: v,
      low: v,
      close: v,
      volume: 0,
    }));
    const p50Data = r.p50.map((v, i) => ({
      time: histLen + i,
      open: v,
      high: v,
      low: v,
      close: v,
      volume: 0,
    }));
    const p5Data = r.p5.map((v, i) => ({
      time: histLen + i,
      open: v,
      high: v,
      low: v,
      close: v,
      volume: 0,
    }));

    const areaSeries = [
      { color: '#4ade80', data: p95Data },
      { color: '#c8a23c', data: p50Data },
      { color: '#4ade80', data: p5Data },
    ];
    tipData = p95Data;

    renderPlychart('etf-mc-fan', 'update_area', JSON.stringify(areaSeries), '');
  }

  createEffect(() => {
    result();
    historical();
    renderChart();
  });

  usePlychartAuto(() => 'etf-mc-fan', renderChart);

  onMount(() => {
    attachChartMeta('etf-mc-fan', {
      source: 'synthetic · GBM',
      detail: '10k paths · vol fitted to Yahoo 1y',
    });
    setChartLabels('etf-mc-fan', { yUnit: 'price (USD)' });
    loadData();
    const disposeTip = attachPlychartTooltip('etf-mc-fan', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  createEffect(() => {
    activeTicker();
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        MONTE CARLO FORECAST: {activeTicker()}
      </p>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas id="etf-mc-fan" class="w-full" style={{ height: '320px' }} />
      <Show when={result()} keyed>
        {(mc) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            {activeTicker()} | 1000 GBM paths | annualized vol {(mc.volatility * 100).toFixed(1)}% |
            drift {(mc.drift * 100).toFixed(1)}%
          </p>
        )}
      </Show>
    </div>
  );
}

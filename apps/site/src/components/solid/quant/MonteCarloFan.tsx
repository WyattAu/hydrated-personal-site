import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import {
  attachPlychartTooltip,
  renderPlychart,
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

export default function MonteCarloFan(props: { symbol?: string }) {
  const symbol = () => activeAsset();
  const [result, setResult] = createSignal<MCResult | null>(null);
  const [historical, setHistorical] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [horizon, setHorizon] = createSignal(90);
  const [error, setError] = createSignal<string | null>(null);
  let wasmMod: QuantWasmModule | null = null;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol())}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
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

      const mcJson = mod.quant_montecarlo(new Float64Array(closes), 252, horizon(), 1000);
      setResult(JSON.parse(mcJson));
    } catch (e) {
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

    renderPlychart('mc-fan', 'update_area', JSON.stringify(areaSeries), '');
  }

  createEffect(() => {
    result();
    historical();
    renderChart();
  });

  usePlychartAuto(() => 'mc-fan', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('mc-fan', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
    const interval = setInterval(loadData, 120000);
    onCleanup(() => clearInterval(interval));
  });

  onAssetChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          MONTE CARLO FORECAST
        </p>
        <Show
          when={!loading()}
          fallback={
            <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              SIMULATING...
            </span>
          }
        >
          <div class="flex gap-1">
            {[30, 90, 180, 365].map((h) => (
              <button
                data-key={h}
                type="button"
                class="font-mono text-[10px] px-2 py-1.5 border transition-colors"
                style={{
                  'border-color': horizon() === h ? 'var(--accent)' : 'var(--border)',
                  color: horizon() === h ? 'var(--accent)' : 'var(--text-secondary)',
                  background: horizon() === h ? 'var(--bg-secondary)' : 'transparent',
                }}
                onClick={() => {
                  setHorizon(h);
                  loadData();
                }}
              >
                {h}d
              </button>
            ))}
          </div>
        </Show>
      </div>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas id="mc-fan" class="w-full" style={{ height: '320px' }} />
      <Show when={result()} keyed>
        {(mc) => (
          <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
            {symbol()} | 1000 GBM paths | annualized vol {(mc.volatility * 100).toFixed(1)}% | drift{' '}
            {(mc.drift * 100).toFixed(1)}%
          </p>
        )}
      </Show>
    </div>
  );
}

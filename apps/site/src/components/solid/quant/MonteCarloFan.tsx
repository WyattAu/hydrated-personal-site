import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';
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

export default function MonteCarloFan(props: { symbol?: string }) {
  const symbol = () => activeAsset();
  const [result, setResult] = createSignal<MCResult | null>(null);
  const [historical, setHistorical] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [horizon, setHorizon] = createSignal(90);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);
  let wasmMod: {
    default: () => Promise<void>;
    quant_seed: (a: number, b: number) => void;
    quant_montecarlo: (
      data: Float64Array,
      tradingDays: number,
      horizon: number,
      paths: number,
    ) => string;
  } | null = null;

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

      if (!wasmMod) {
        const _w = `/wasm/hydrated_widgets.js?${WASM_VERSION}`;
        wasmMod = await import(_w);
        await wasmMod.default();
        wasmMod.quant_seed(Math.random() * 1e18, Math.random() * 1e18);
      }

      const mcJson = wasmMod.quant_montecarlo(new Float64Array(closes), 252, horizon(), 1000);
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

  async function initWasm() {
    try {
      const plychart = await getPlychart();
      const canvas = document.getElementById('mc-fan') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        plychart.create_chart('mc-fan', Math.round(rect.width), 320);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const r = result();
    const h = historical();
    const ready = wasmReady();
    if (!r || h.length === 0 || !ready) return;

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

    getPlychart().then((p) => {
      p.update_area('mc-fan', JSON.stringify(areaSeries), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
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
                class="font-mono text-[9px] px-2 py-0.5 border transition-colors"
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

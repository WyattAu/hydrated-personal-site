import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';
import { WASM_VERSION } from '../../../lib/wasm-version';

const H = 260;
const CANVAS_ID = 'risk-metrics';

interface VarResult {
  var_historical: number;
  es_historical: number;
  var_parametric: number;
  es_parametric: number;
  histogram_edges: number[];
  histogram_counts: number[];
}

export default function RiskMetrics(props: { symbol?: string }) {
  const symbol = () => activeAsset();
  const [data, setData] = createSignal<VarResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [wasmReady, setWasmReady] = createSignal(false);
  let returnsFlat: Float64Array | null = null;
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol())}&range=1y&interval=1d`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      if (!wasmMod) {
        const _w = `/wasm/hydrated_widgets.js?${WASM_VERSION}`;
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const wasmJson = wasmMod.quant_var(returns, 0.05);
      returnsFlat = returns;
      setData(JSON.parse(wasmJson));
    } catch {
      /* skip */
    } finally {
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

  onMount(() => {
    initWasm();
    loadData();
  });

  onAssetChanged(() => loadData());

  createEffect(() => {
    const d = data();
    const ready = wasmReady();
    if (!d || !ready || !returnsFlat || returnsFlat.length === 0) return;
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) return;
    const binCount = Math.max(1, d.histogram_edges.length - 1);
    getPlychart().then((p) => {
      p.create_chart(CANVAS_ID, canvas.clientWidth || 600, H);
      p.update_histogram(CANVAS_ID, JSON.stringify(Array.from(returnsFlat!)), binCount, '');
    });
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        VALUE AT RISK
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing...
        </p>
      </Show>
      <canvas id={CANVAS_ID} class="w-full" style={{ height: `${H}px` }} />
      <Show when={data()} keyed>
        {(d) => (
          <>
            <div class="flex items-center gap-2 mt-2 flex-wrap font-mono text-[10px]">
              <span
                class="border px-2 py-0.5"
                style={{ 'border-color': 'var(--accent-warm)', color: 'var(--accent-warm)' }}
              >
                VaR(95%) {(d.var_historical * 100).toFixed(2)}%
              </span>
              <span
                class="border px-2 py-0.5"
                style={{ 'border-color': '#ff4081', color: '#ff4081' }}
              >
                ES(95%) {(d.es_historical * 100).toFixed(2)}%
              </span>
              <span
                class="border px-2 py-0.5"
                style={{ 'border-color': 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Parametric VaR {(d.var_parametric * 100).toFixed(2)}%
              </span>
            </div>
            <p class="font-mono text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              {symbol()} 1d log returns histogram | {d.histogram_edges.length - 1} bins
            </p>
          </>
        )}
      </Show>
    </div>
  );
}

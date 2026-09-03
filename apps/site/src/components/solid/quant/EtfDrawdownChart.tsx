import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeTicker } from '../../../lib/etf-store';
import { getPlychart } from '../../../lib/plychart-loader';
import { WASM_VERSION } from '../../../lib/wasm-version';

interface DDResult {
  underwater: number[];
  max_drawdown: number;
  max_dd_duration: number;
  current_drawdown: number;
  calmar: number;
  ulcer_index: number;
  pain_index: number;
}

let sharedWasm: any = null;

export default function EtfDrawdownChart() {
  // Ticker from shared store
  const [result, setResult] = createSignal<DDResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeTicker()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error('API');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c: number | null) => c != null);
      if (closes.length < 30) throw new Error('insufficient');

      if (!sharedWasm) {
        const _wasmUrl = `/wasm/hydrated_widgets.js?v=${WASM_VERSION}`;
        sharedWasm = await import(_wasmUrl);
        await sharedWasm.default();
      }
      const out = sharedWasm.quant_drawdown(Float64Array.from(closes), 252);
      setResult(JSON.parse(out));
    } catch {
      setResult(null);
    }
    setLoading(false);
  }

  async function initWasm() {
    try {
      const plychart = await getPlychart();
      const canvas = document.getElementById('etf-drawdown') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        plychart.create_chart('etf-drawdown', Math.round(rect.width), 260);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const r = result();
    const ready = wasmReady();
    if (!r || !ready) return;
    const color = Math.abs(r.max_drawdown) > 0.2 ? '#ff4081' : '#c8a23c';
    const data = r.underwater.map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    getPlychart().then((p) => {
      p.update_area('etf-drawdown', JSON.stringify([{ color, data }]), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });
  createEffect(() => {
    activeTicker();
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        DRAWDOWN ANALYSIS: {activeTicker()}
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading {activeTicker()}...
        </p>
      </Show>
      <canvas id="etf-drawdown" class="w-full" style={{ height: '260px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        {activeTicker()} 1Y daily underwater curve WASM drawdown
      </p>
    </div>
  );
}

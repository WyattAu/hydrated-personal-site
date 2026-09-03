import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getPlychart } from '../../../lib/plychart-loader';

const H = 300;

export default function FundingRateHeatmap() {
  const [data, setData] = createSignal<Array<{ symbol: string; rate: number }>>([]);
  const [loading, setLoading] = createSignal(true);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/funding-rates`);
      if (!res.ok) throw new Error('API');
      const d = await res.json();
      if (Array.isArray(d)) setData(d.slice(0, 30));
    } catch {
      /* skip */
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('funding-rate-heatmap') as HTMLCanvasElement | null;
      if (canvas) {
        const w = canvas.clientWidth || 600;
        p.create_chart('funding-rate-heatmap', w, H);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const d = data();
    const ready = wasmReady();
    if (d.length === 0 || !ready) return;
    const canvas = document.getElementById('funding-rate-heatmap') as HTMLCanvasElement | null;
    if (!canvas) return;
    getPlychart().then((p) => {
      const w = canvas.clientWidth || 600;
      p.create_chart('funding-rate-heatmap', w, H);
      const barData = d.map((item, i) => ({
        time: i,
        open: 0,
        high: 0,
        low: 0,
        close: item.rate,
        volume: 0,
      }));
      p.update_bar('funding-rate-heatmap', JSON.stringify(barData), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        FUNDING RATES (PERPS)
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading...
        </p>
      </Show>
      <canvas id="funding-rate-heatmap" class="w-full" style={{ height: '300px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Binance perpetuals | green = longs pay shorts | red = shorts pay longs
      </p>
    </div>
  );
}

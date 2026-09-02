import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';
import { getPlychart } from '../../lib/plychart-loader';

interface TickerItem {
  symbol: string;
  price: number;
  priceChangePercent?: number | string;
  volume?: number | string;
  quoteVolume?: string | number;
  lastPrice?: number | string;
}

export default function TreemapWidget() {
  const [data, setData] = createSignal<TickerItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    try {
      const res = await fetch(`${apiBase()}/api/crypto-ticker`);
      if (!res.ok) return;
      const d = await res.json();
      const items = Array.isArray(d) ? d : d.data || [];
      if (items.length > 0) setData(items);
    } catch {
      // keep previous data
    }
    setLoading(false);
  }

  async function initWasm() {
    try {
      const plychart = await getPlychart();
      const canvas = document.getElementById('treemap-canvas') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        plychart.create_chart('treemap-canvas', Math.round(rect.width), 300);
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

    const entries = d
      .map((item) => {
        const vol = Number(item.volume || item.quoteVolume || 0);
        const price = Number(item.price || item.lastPrice || 0);
        return {
          name: (item.symbol || '').replace('USDT', ''),
          cap: vol * price,
        };
      })
      .filter((e) => e.cap > 0)
      .sort((a, b) => b.cap - a.cap)
      .slice(0, 15);

    if (entries.length === 0) return;

    const treemapData = entries.map((e) => [e.name, e.cap] as [string, number]);
    getPlychart().then((p) => {
      p.update_treemap('treemap-canvas', JSON.stringify(treemapData), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  });

  return (
    <div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading treemap...
        </p>
      </Show>
      <canvas id="treemap-canvas" class="w-full" style={{ height: '300px' }} />
    </div>
  );
}

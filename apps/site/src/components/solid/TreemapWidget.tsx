import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';
import { renderPlychart, usePlychartAuto } from '../../lib/plychart-render';

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

  function renderChart() {
    const d = data();
    if (d.length === 0) return;

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
    renderPlychart('treemap-canvas', 'update_treemap', JSON.stringify(treemapData), '');
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'treemap-canvas', renderChart);

  onMount(() => {
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

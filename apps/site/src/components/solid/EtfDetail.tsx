import { For, createEffect, createSignal, onMount } from 'solid-js';
import { getPlychart } from '../../lib/plychart-loader';
import { getThemeColors } from '../../lib/theme-colors';
import type { EtfEntry } from '../../lib/types';

interface EtfDetailProps {
  etf: EtfEntry;
}

const H = 280;
const BARS_ID = 'etf-detail-bars';
const DONUT_ID = 'etf-detail-donut';

function toBar(v: number) {
  return { time: 0, open: 0, high: 0, low: 0, close: v, volume: 0 };
}

export default function EtfDetail(props: EtfDetailProps) {
  const [price, setPrice] = createSignal((Math.random() * 400 + 50).toFixed(2));
  const [change, setChange] = createSignal(((Math.random() - 0.45) * 6).toFixed(2));
  const [wasmReady, setWasmReady] = createSignal(false);

  // Sorted descending by weight (same ordering the manual draws used)
  const sectors = () => Object.entries(props.etf.sector_allocation).sort((a, b) => b[1] - a[1]);
  const regions = () => Object.entries(props.etf.region_allocation).sort((a, b) => b[1] - a[1]);

  async function initWasm() {
    try {
      await getPlychart();
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const entries = sectors();
    const ready = wasmReady();
    if (!ready || entries.length === 0) return;
    const canvas = document.getElementById(BARS_ID) as HTMLCanvasElement | null;
    if (!canvas) return;
    getPlychart().then((p) => {
      const w = canvas.clientWidth || 600;
      p.create_chart(BARS_ID, w, H);
      p.update_bar(BARS_ID, JSON.stringify(entries.map(([, v]) => toBar(v))), '');
    });
  });

  createEffect(() => {
    const entries = regions();
    const ready = wasmReady();
    if (!ready || entries.length === 0) return;
    const canvas = document.getElementById(DONUT_ID) as HTMLCanvasElement | null;
    if (!canvas) return;
    getPlychart().then((p) => {
      const w = canvas.clientWidth || 600;
      p.create_chart(DONUT_ID, w, H);
      p.update_pie(DONUT_ID, JSON.stringify(entries), '');
    });
  });

  createEffect(() => {
    props.etf;
    setPrice((Math.random() * 400 + 50).toFixed(2));
    setChange(((Math.random() - 0.45) * 6).toFixed(2));
  });

  onMount(() => {
    initWasm();
  });

  const accentColor = () => {
    const v = getThemeColors().accent;
    return v || '#00e5ff';
  };

  return (
    <div
      class="border p-6"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      {/* Header */}
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-2xl font-bold font-mono" style={{ color: accentColor() }}>
              {props.etf.ticker}
            </h2>
            <span
              class="font-mono text-xs px-2 py-0.5"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {props.etf.category}
            </span>
          </div>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {props.etf.name}
          </p>
        </div>
        <div class="mt-3 md:mt-0 flex items-baseline gap-3">
          <span class="text-3xl font-mono font-bold">${price()}</span>
          <span
            class="font-mono text-sm font-bold"
            style={{
              color: Number.parseFloat(change()) >= 0 ? '#69f0ae' : '#f44336',
            }}
          >
            {Number.parseFloat(change()) >= 0 ? '+' : ''}
            {change()}%
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sector Allocation */}
        <div>
          <p class="label mb-3" style={{ color: accentColor() }}>
            SECTOR ALLOCATION
          </p>
          <div
            class="border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <canvas
              id={BARS_ID}
              class="w-full"
              style={{ height: `${H}px` }}
              role="img"
              aria-label={`${props.etf.ticker} sector allocation chart`}
            />
          </div>
        </div>

        {/* Region Allocation */}
        <div>
          <p class="label mb-3" style={{ color: accentColor() }}>
            REGION ALLOCATION
          </p>
          <div
            class="border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <canvas
              id={DONUT_ID}
              class="w-full"
              style={{ height: `${H}px` }}
              role="img"
              aria-label={`${props.etf.ticker} region allocation donut chart`}
            />
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      <div>
        <p class="label mb-3" style={{ color: accentColor() }}>
          TOP 10 HOLDINGS
        </p>
        <div
          class="border overflow-x-auto"
          style={{
            'border-color': 'var(--border)',
          }}
        >
          <table class="w-full text-sm font-mono">
            <thead>
              <tr
                class="border-b text-left"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <th class="px-4 py-2 text-xs tracking-wider">TICKER</th>
                <th class="px-4 py-2 text-xs tracking-wider">NAME</th>
                <th class="px-4 py-2 text-xs tracking-wider text-right">WEIGHT</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.etf.top_holdings}>
                {(h, i) => (
                  <tr
                    class="border-b transition-colors"
                    style={{
                      'border-color': 'var(--border)',
                      background: i() % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <td class="px-4 py-2 font-bold" style={{ color: accentColor() }}>
                      {h.ticker}
                    </td>
                    <td class="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {h.name}
                    </td>
                    <td class="px-4 py-2 text-right font-bold">{h.weight.toFixed(1)}%</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

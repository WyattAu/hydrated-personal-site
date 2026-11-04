import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { activeTicker } from '../../../lib/etf-store';
import { getPlychart } from '../../../lib/plychart-loader';

const GICS_SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
] as const;

const SECTOR_LABELS = [
  'Tech',
  'Health',
  'Financials',
  'Cons Disc',
  'Comm Svcs',
  'Industrials',
  'Cons Staples',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
];

interface EtfEntry {
  ticker: string;
  name: string;
  sector_allocation: Record<string, number>;
}

export default function EtfSectorRadar() {
  const [allocations, setAllocations] = createSignal<Record<string, number>>({});
  const [loading, setLoading] = createSignal(true);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/data/etf-database.json');
      if (!res.ok) throw new Error('failed');
      const data: EtfEntry[] = await res.json();
      const etf = data.find((e) => e.ticker === activeTicker());
      if (etf?.sector_allocation) {
        setAllocations(etf.sector_allocation);
        setChartMetaState('sector-radar', { freshAt: Date.now(), error: null });
      } else {
        throw new Error('no sector data');
      }
    } catch (e) {
      setChartMetaState('sector-radar', { error: e instanceof Error ? e.message : 'load failed' });
      // keep previous data
    }
    setLoading(false);
  }

  function values(): number[] {
    const alloc = allocations();
    return GICS_SECTORS.map((s) => Number(alloc[s]) || 0);
  }

  async function initWasm() {
    try {
      const plychart = await getPlychart();
      const canvas = document.getElementById('sector-radar') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        plychart.create_chart('sector-radar', Math.round(rect.width), 340);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const vals = values();
    const ready = wasmReady();
    if (vals.every((v) => v === 0) || !ready) return;

    const labels = [...SECTOR_LABELS];
    getPlychart().then((p) => {
      p.update_radar('sector-radar', JSON.stringify(vals), JSON.stringify(labels), '#00e5ff', '');
    });
  });

  onMount(() => {
    attachChartMeta('sector-radar', {
      source: 'etf-database.json',
      detail: 'GICS sector allocation %',
    });
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
        SECTOR ALLOCATION: {activeTicker()}
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading {activeTicker()}...
        </p>
      </Show>
      <canvas id="sector-radar" class="w-full" style={{ height: '340px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        {activeTicker()} 11 GICS sector allocation radar chart
      </p>
    </div>
  );
}

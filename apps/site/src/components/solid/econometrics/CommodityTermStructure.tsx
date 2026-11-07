import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';

async function fetchLastClose(symbol: string): Promise<number | null> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=5d&interval=1d`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  return closes.length > 0 ? closes[closes.length - 1] : null;
}

export default function CommodityTermStructure() {
  const [prices, setPrices] = createSignal<number[]>([]);
  const [symbol, setSymbol] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const active = activeAsset();
      const isCommodity = active.endsWith('=F');
      const base = isCommodity ? active.replace(/=F$/, '') : 'CL';
      const front = `${base}=F`;
      setSymbol(front);

      const [m1, m2, m3] = await Promise.all([
        fetchLastClose(`${base}=F`),
        fetchLastClose(`${base}_2=F`),
        fetchLastClose(`${base}_3=F`),
      ]);
      const out = [m1, m2, m3].map((v) => (v == null ? 0 : v));
      if (out.every((v) => v === 0)) throw new Error('No futures data');
      setPrices(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('commodity-bars') as HTMLCanvasElement | null;
      if (canvas) {
        const w = canvas.clientWidth;
        const h = 280;
        p.create_chart('commodity-bars', w, h);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const vals = prices();
    const ready = wasmReady();
    if (vals.length === 0 || !ready) return;
    const canvas = document.getElementById('commodity-bars') as HTMLCanvasElement | null;
    if (!canvas) return;
    getPlychart().then((p) => {
      const w = canvas.clientWidth;
      const h = 280;
      p.create_chart('commodity-bars', w, h);
      const data = vals.map((v) => ({ time: 0, open: 0, high: 0, low: 0, close: v, volume: 0 }));
      p.update_bar('commodity-bars', JSON.stringify(data), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  onAssetChanged(() => loadData());

  const isCommodity = () => activeAsset().endsWith('=F');

  const contango = () => {
    const p = prices();
    if (p.length < 2) return false;
    return p[0] < p[1];
  };

  const spread = () => {
    const p = prices();
    if (p.length < 2 || p[0] === 0 || p[1] === 0) return null;
    return p[1] - p[0];
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          COMMODITY TERM STRUCTURE
        </p>
        <Show when={!loading() && prices().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {symbol()} | front 3 months
          </span>
        </Show>
      </div>

      <Show when={!isCommodity()}>
        <p
          class="font-mono text-[10px] p-2 border mb-2"
          style={{
            color: 'var(--accent-warm)',
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          Select a commodity futures contract (e.g. CL=F, GC=F, NG=F). Showing default CL=F.
        </p>
      </Show>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading term structure...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && prices().length > 0}>
        <canvas id="commodity-bars" class="w-full" style={{ height: '280px' }} />
        <div class="flex items-center justify-between mt-2 font-mono text-[10px]">
          <span
            style={{
              color: contango() ? 'var(--negative, #ff5252)' : 'var(--positive, #4caf50)',
              'font-weight': 'bold',
            }}
          >
            {contango() ? 'CONTANGO (normal carry)' : 'BACKWARDATION (supply stress)'}
          </span>
          <Show when={spread() !== null}>
            <span style={{ color: 'var(--text-secondary)' }}>
              M2−M1: {(spread() ?? 0) >= 0 ? '+' : ''}
              {(spread() ?? 0).toFixed(3)}
            </span>
          </Show>
        </div>
        <p class="font-mono text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          M1 / M2 / M3 bars via plychart |{' '}
          {prices()
            .map((v) => v.toFixed(2))
            .join(' / ')}
        </p>
      </Show>
    </div>
  );
}

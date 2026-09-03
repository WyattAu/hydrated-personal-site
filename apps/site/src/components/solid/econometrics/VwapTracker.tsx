import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';

interface VwapState {
  closes: number[];
  vwap: number[];
  spread: number;
}

async function fetchOhlcv(
  symbol: string,
  range: string,
): Promise<{ high: number[]; low: number[]; close: number[]; volume: number[] }> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return { high: [], low: [], close: [], volume: [] };
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const rawH: (number | null)[] = quote?.high ?? [];
  const rawL: (number | null)[] = quote?.low ?? [];
  const rawC: (number | null)[] = quote?.close ?? [];
  const rawV: (number | null)[] = quote?.volume ?? [];
  const n = Math.min(rawH.length, rawL.length, rawC.length, rawV.length);
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const volume: number[] = [];
  for (let i = 0; i < n; i++) {
    const hi = rawH[i];
    const lo = rawL[i];
    const c = rawC[i];
    const v = rawV[i];
    if (hi != null && lo != null && c != null && v != null && c > 0 && v > 0) {
      high.push(hi);
      low.push(lo);
      close.push(c);
      volume.push(v);
    }
  }
  return { high, low, close, volume };
}

function computeVwap(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
): VwapState | null {
  const n = close.length;
  if (n < 5) return null;
  const vwap: number[] = new Array(n);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < n; i++) {
    const typical = (high[i] + low[i] + close[i]) / 3;
    cumPV += typical * volume[i];
    cumV += volume[i];
    vwap[i] = cumV > 0 ? cumPV / cumV : close[i];
  }
  const lastClose = close[n - 1];
  const lastVwap = vwap[n - 1];
  return { closes: close, vwap, spread: lastClose - lastVwap };
}

export default function VwapTracker() {
  const [state, setState] = createSignal<VwapState | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { high, low, close, volume } = await fetchOhlcv(activeAsset(), '1mo');
      const s = computeVwap(high, low, close, volume);
      if (!s) throw new Error('Insufficient data');
      setState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('vwap-tracker') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('vwap-tracker', Math.round(rect.width), 250);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const s = state();
    const ready = wasmReady();
    if (!s || !ready) return;
    const canvas = document.getElementById('vwap-tracker') as HTMLCanvasElement | null;
    if (!canvas) return;
    const vwapData = s.vwap.map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    const priceData = s.closes.map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    const series = [
      { color: '#00e5ff', data: vwapData },
      { color: '#ff4081', data: priceData },
    ];
    getPlychart().then((p) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('vwap-tracker', Math.round(rect.width), 250);
      p.update_line('vwap-tracker', JSON.stringify(series), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  onAssetChanged(() => loadData());

  const spreadColor = () => {
    const s = state();
    return s ? (s.spread >= 0 ? '#4caf50' : '#ff5252') : 'var(--text-secondary)';
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          VWAP TRACKER
        </p>
        <Show when={!loading() && state()}>
          {(() => {
            const s = state();
            if (!s) return null;
            return (
              <span class="font-mono text-[10px]" style={{ color: spreadColor() }}>
                spread {s.spread >= 0 ? '+' : ''}
                {s.spread.toFixed(2)}
              </span>
            );
          })()}
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing VWAP...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && state()}>
        <canvas id="vwap-tracker" class="w-full" style={{ height: '250px' }} />
        <div class="mt-2 flex gap-3 font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#ff4081' }} /> PRICE
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#00e5ff' }} /> VWAP
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#4caf50' }} /> ABOVE (bullish)
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#ff5252' }} /> BELOW (bearish)
          </span>
        </div>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Volume-Weighted Average Price | Green = above VWAP (bullish) | Red = below VWAP (bearish)
        </p>
      </Show>
    </div>
  );
}

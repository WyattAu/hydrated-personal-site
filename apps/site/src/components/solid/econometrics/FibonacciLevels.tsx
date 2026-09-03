import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';

const FIB_LEVELS: { ratio: number; label: string; golden?: boolean }[] = [
  { ratio: 0, label: '0%' },
  { ratio: 0.236, label: '23.6%' },
  { ratio: 0.382, label: '38.2%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0.618, label: '61.8%', golden: true },
  { ratio: 0.786, label: '78.6%' },
  { ratio: 1, label: '100%' },
];

interface FibState {
  closes: number[];
  swingHigh: number;
  swingLow: number;
  levels: { ratio: number; label: string; price: number; golden: boolean }[];
  current: number;
}

async function fetchCloses(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
}

export default function FibonacciLevels() {
  const [state, setState] = createSignal<FibState | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const closes = await fetchCloses(activeAsset(), '6mo');
      if (closes.length < 10) throw new Error('Insufficient data');
      const swingHigh = closes.reduce((a, b) => (b > a ? b : a), closes[0]);
      const swingLow = closes.reduce((a, b) => (b < a ? b : a), closes[0]);
      const span = swingHigh - swingLow || 1;
      const levels = FIB_LEVELS.map((f) => ({
        ratio: f.ratio,
        label: f.label,
        price: swingHigh - span * f.ratio,
        golden: !!f.golden,
      }));
      setState({ closes, swingHigh, swingLow, levels, current: closes[closes.length - 1] });
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
      const canvas = document.getElementById('fib-levels') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('fib-levels', Math.round(rect.width), 300);
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
    const canvas = document.getElementById('fib-levels') as HTMLCanvasElement | null;
    if (!canvas) return;
    const data = s.closes.map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    const series = [{ color: '#00e5ff', data }];
    getPlychart().then((p) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('fib-levels', Math.round(rect.width), 300);
      p.update_line('fib-levels', JSON.stringify(series), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  onAssetChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          FIBONACCI RETRACEMENT
        </p>
        <Show when={!loading() && state()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 6M | H {state()?.swingHigh.toFixed(2)} / L{' '}
            {state()?.swingLow.toFixed(2)}
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing Fibonacci levels...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && state()}>
        <canvas id="fib-levels" class="w-full" style={{ height: '300px' }} />
        {/* Fibonacci level overlays as HTML below canvas */}
        <div class="mt-2 flex flex-col gap-1">
          <Show when={state()} keyed>
            {(s) => (
              <>
                <div class="flex flex-wrap gap-1.5">
                  {s.levels.map((lv) => {
                    const isSupport = lv.price < s.current;
                    const color = lv.golden ? '#ffc107' : isSupport ? '#4caf50' : '#ff5252';
                    const borderStyle = lv.golden ? 'solid' : 'dashed';
                    return (
                      <div
                        class="font-mono text-[9px] px-2 py-1 border flex items-center gap-1.5"
                        style={{
                          'border-color': color,
                          'border-style': borderStyle,
                          background: `${color}14`,
                          color: color,
                        }}
                      >
                        <span
                          class="inline-block w-2 h-2 rounded-full"
                          style={{ background: color }}
                        />
                        {lv.label} {lv.price.toFixed(2)}
                        {lv.golden ? ' GOLDEN' : ''}
                      </div>
                    );
                  })}
                </div>
                <div class="flex gap-3 font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                  <span class="flex items-center gap-1">
                    <span class="inline-block w-2 h-2" style={{ background: '#4caf50' }} /> SUPPORT
                  </span>
                  <span class="flex items-center gap-1">
                    <span class="inline-block w-2 h-2" style={{ background: '#ff5252' }} /> RESISTANCE
                  </span>
                  <span class="flex items-center gap-1">
                    <span class="inline-block w-2 h-2" style={{ background: '#ffc107' }} /> GOLDEN 61.8%
                  </span>
                </div>
              </>
            )}
          </Show>
        </div>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Auto-detected swing high/low | 6M lookback | 61.8% = golden ratio
        </p>
      </Show>
    </div>
  );
}

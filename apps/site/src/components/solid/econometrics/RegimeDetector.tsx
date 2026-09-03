import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';
import { getWasmMod } from '../../../lib/wasm-loader';

interface RegimeResult {
  states_tail: number[];
  transition: number[][];
  means: number[];
  variances: number[];
  probs_tail: number[];
  current_regime: number;
  regime_label: string;
}

export default function RegimeDetector() {
  const [data, setData] = createSignal<RegimeResult | null>(null);
  const [returns, setReturns] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=3y&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 50) throw new Error('Insufficient data');

      const rets = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) rets[i - 1] = Math.log(closes[i] / closes[i - 1]);

      const wasmMod = await getWasmMod();
      const json2 = wasmMod.quant_regime(rets);
      setData(JSON.parse(json2));
      setReturns(Array.from(rets));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('regime-detector') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('regime-detector', Math.round(rect.width), 280);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const d = data();
    const rets = returns();
    const ready = wasmReady();
    if (!d || rets.length === 0 || !ready) return;
    const canvas = document.getElementById('regime-detector') as HTMLCanvasElement | null;
    if (!canvas) return;
    const win = 120;
    const start = Math.max(0, rets.length - win);
    const slice = rets.slice(start);
    const chartData = slice.map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    const series = [{ color: '#00e5ff', data: chartData }];
    getPlychart().then((p) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('regime-detector', Math.round(rect.width), 280);
      p.update_line('regime-detector', JSON.stringify(series), '');
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
          REGIME DETECTION (HMM 2-STATE)
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 3Y daily | last 120d
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing regimes...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas id="regime-detector" class="w-full" style={{ height: '280px' }} />

      {/* Regime bands as HTML colored divs below canvas */}
      <Show when={!loading() && data() && returns().length > 0}>
        <div class="mt-2">
          <div class="flex h-3 w-full overflow-hidden border" style={{ 'border-color': 'var(--border)' }}>
            {(() => {
              const d = data()!;
              const rets = returns();
              const win = 120;
              const start = Math.max(0, rets.length - win);
              const n = rets.length - start;
              const states = d.states_tail;
              return Array.from({ length: n }, (_, i) => {
                const st = states[start + i] ?? 0;
                return (
                  <div
                    class="flex-1"
                    style={{ background: st === 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(255, 82, 82, 0.7)' }}
                    title={st === 0 ? 'LOW-VOL' : 'HIGH-VOL'}
                  />
                );
              });
            })()}
          </div>
          <div class="mt-1 flex gap-3 font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            <span class="flex items-center gap-1">
              <span class="inline-block w-2 h-2" style={{ background: '#4caf50' }} /> LOW-VOL
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block w-2 h-2" style={{ background: '#ff5252' }} /> HIGH-VOL
            </span>
          </div>
        </div>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => {
          const trans = d.transition ?? [
            [0, 0],
            [0, 0],
          ];
          const label = d.regime_label ?? (d.current_regime === 0 ? 'LOW-VOL' : 'HIGH-VOL');
          return (
            <div class="flex items-center gap-4 mt-2 flex-wrap">
              <div
                class="border px-4 py-2 font-mono text-lg font-bold"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                  color: d.current_regime === 0 ? '#4caf50' : '#ff5252',
                }}
              >
                {label}
              </div>
              <div
                class="grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-[9px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span />
                <span class="text-center">→ LOW</span>
                <span class="text-center">→ HIGH</span>
                <span>FROM LOW</span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[0]?.[0] ?? 0) * 100).toFixed(1)}%
                </span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[0]?.[1] ?? 0) * 100).toFixed(1)}%
                </span>
                <span>FROM HIGH</span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[1]?.[0] ?? 0) * 100).toFixed(1)}%
                </span>
                <span class="text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                  {((trans[1]?.[1] ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}

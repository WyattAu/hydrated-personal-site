import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';
import { getWasmMod } from '../../../lib/wasm-loader';

interface VolResult {
  realized_var: number;
  bipower_var: number;
  continuous_var: number;
  jump_var: number;
  jump_ratio: number;
  annualized_vol: number;
  jump_days: number[];
  daily_rv_tail: number[];
  daily_bv_tail: number[];
}

export default function RealizedVolDecomposition() {
  const [data, setData] = createSignal<VolResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 30) throw new Error('Insufficient data');

      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      const wasmMod = await getWasmMod();
      const json2 = wasmMod.quant_realized_vol(returns);
      setData(JSON.parse(json2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('realized-vol-decomp') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('realized-vol-decomp', Math.round(rect.width), 280);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const d = data();
    const ready = wasmReady();
    if (!d || !ready) return;
    const canvas = document.getElementById('realized-vol-decomp') as HTMLCanvasElement | null;
    if (!canvas) return;
    const rv = d.daily_rv_tail;
    const bv = d.daily_bv_tail;
    const jumpVar = rv.map((r, i) => Math.max(0, r - (bv[i] ?? 0)));
    const contVar = bv;
    const win = 90;
    const start = Math.max(0, rv.length - win);
    const n = rv.length - start;
    if (n < 2) return;

    const contData = contVar.slice(start, start + n).map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v ?? 0,
      volume: 0,
    }));
    const jumpData = jumpVar.slice(start, start + n).map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v ?? 0,
      volume: 0,
    }));

    const series = [
      { color: '#00e5ff', data: contData },
      { color: '#ff6b35', data: jumpData },
    ];

    getPlychart().then((p) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('realized-vol-decomp', Math.round(rect.width), 280);
      p.update_area('realized-vol-decomp', JSON.stringify(series), '');
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
          REALIZED VOLATILITY DECOMPOSITION
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 1Y daily | last 90d
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing realized vol...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas id="realized-vol-decomp" class="w-full" style={{ height: '280px' }} />

      {/* Jump day markers as HTML overlay */}
      <Show when={!loading() && data()}>
        <div class="mt-1 flex flex-wrap gap-1 font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#00e5ff' }} /> CONTINUOUS
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-2 h-2" style={{ background: '#ff6b35' }} /> JUMP
          </span>
          <Show when={(data()?.jump_days?.filter(Boolean).length ?? 0) > 0}>
            <span style={{ color: '#ff5252' }}>
              {data()?.jump_days?.filter(Boolean).length} jump days detected
            </span>
          </Show>
        </div>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => (
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Realized Vol
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {((d.annualized_vol ?? 0) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Continuous
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {(((d.continuous_var ?? 0) / (d.realized_var || 1)) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Jump
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent-warm)' }}>
                {(((d.jump_var ?? 0) / (d.realized_var || 1)) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Jump Ratio
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent-warm)' }}>
                {((d.jump_ratio ?? 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

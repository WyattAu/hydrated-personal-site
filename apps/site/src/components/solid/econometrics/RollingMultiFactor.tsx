import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';
import { getWasmMod } from '../../../lib/wasm-loader';

interface BetaPoint {
  idx: number;
  mkt: number;
  size: number;
  value: number;
}

async function fetchReturns(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

const LINES: Array<{ key: keyof BetaPoint; color: string; label: string }> = [
  { key: 'mkt', color: '#42a5f5', label: 'MARKET' },
  { key: 'size', color: '#ffa726', label: 'SIZE' },
  { key: 'value', color: '#4caf50', label: 'VALUE' },
];

export default function RollingMultiFactor() {
  const [series, setSeries] = createSignal<BetaPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const asset = activeAsset();
      const [assetRets, mktRets, sizeRets, valueRets] = await Promise.all([
        fetchReturns(asset, '3y'),
        fetchReturns('^GSPC', '3y'),
        fetchReturns('IWM', '3y'),
        fetchReturns('GLD', '3y'),
      ]);
      const len = Math.min(assetRets.length, mktRets.length, sizeRets.length, valueRets.length);
      if (len < 150) throw new Error('Insufficient data');

      const y = new Float64Array(len);
      const xFlat = new Float64Array(3 * len);
      for (let k = 0; k < len; k++) {
        y[k] = assetRets[k];
        xFlat[0 * len + k] = mktRets[k];
        xFlat[1 * len + k] = sizeRets[k];
        xFlat[2 * len + k] = valueRets[k];
      }

      const wasmMod = await getWasmMod();
      const out = wasmMod.quant_rolling_factor(y, xFlat, 3, 120, 30);
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed?.series) || parsed.series.length === 0) {
        throw new Error('Invalid rolling factor output');
      }

      const pts: BetaPoint[] = parsed.series.map((s: { betas?: number[] }, i: number) => ({
        idx: i,
        mkt: s.betas?.[0] ?? 0,
        size: s.betas?.[1] ?? 0,
        value: s.betas?.[2] ?? 0,
      }));
      setSeries(pts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('rolling-multi-factor') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('rolling-multi-factor', Math.round(rect.width), 280);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const pts = series();
    const ready = wasmReady();
    if (pts.length < 2 || !ready) return;

    const toCandle = (v: number, t: number) => ({
      time: t,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    });

    const lineSeries = LINES.map((line) => ({
      color: line.color,
      data: pts.map((p, i) => toCandle(p[line.key], i)),
    }));

    getPlychart().then((p) => {
      const canvas = document.getElementById('rolling-multi-factor') as HTMLCanvasElement | null;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('rolling-multi-factor', Math.round(rect.width), 280);
      p.update_line('rolling-multi-factor', JSON.stringify(lineSeries), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  createEffect(() => {
    activeAsset();
    loadData();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          ROLLING 3-FACTOR EXPOSURE
        </p>
        <Show when={!loading() && series().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | {series().length} windows | 120d / 30d step
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing rolling 3-factor regression...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas id="rolling-multi-factor" class="w-full" style={{ height: '280px' }} />

      <Show when={!loading() && series().length > 0}>
        <div class="flex items-center gap-4 mt-1 flex-wrap">
          <For each={LINES}>
            {(line) => (
              <span class="font-mono text-[9px]" style={{ color: line.color }}>
                ■ {line.label}
              </span>
            )}
          </For>
        </div>
      </Show>

      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Market (S&amp;P 500) + Size (IWM) + Value (GLD) | 120-day window, 30-day step
      </p>
    </div>
  );
}

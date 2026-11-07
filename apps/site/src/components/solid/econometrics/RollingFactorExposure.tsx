import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { getWasmMod } from '../../../lib/wasm-loader';

interface RegressionResult {
  alpha: number;
  betas: number[];
  r_squared: number;
  adj_r_squared: number;
  f_statistic: number;
  t_stats: number[];
}

interface WindowPoint {
  idx: number;
  beta: number;
  alpha: number;
  r_squared: number;
  t_stat: number;
}

async function fetchReturns(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
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

export default function RollingFactorExposure() {
  const [data, setData] = createSignal<WindowPoint[]>([]);
  const [latest, setLatest] = createSignal<WindowPoint | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const asset = activeAsset();
      const [assetRets, marketRets] = await Promise.all([
        fetchReturns(asset, '3y'),
        fetchReturns('^GSPC', '3y'),
      ]);
      const len = Math.min(assetRets.length, marketRets.length);
      if (len < 80) throw new Error('Insufficient data');

      const wasmMod = await getWasmMod();

      const windowLen = 60;
      const step = 20;
      const points: WindowPoint[] = [];
      for (let s = 0; s + windowLen <= len; s += step) {
        const y = new Float64Array(windowLen);
        const x = new Float64Array(windowLen);
        for (let k = 0; k < windowLen; k++) {
          y[k] = assetRets[s + k];
          x[k] = marketRets[s + k];
        }
        const json = wasmMod.quant_factor_regression(y, x, 1, windowLen);
        const raw = JSON.parse(json) as RegressionResult;
        points.push({
          idx: s,
          beta: raw.betas?.[0] ?? 0,
          alpha: raw.alpha ?? 0,
          r_squared: raw.r_squared ?? 0,
          t_stat: raw.t_stats?.[0] ?? 0,
        });
      }
      if (points.length === 0) throw new Error('Insufficient windows');
      setData(points);
      setLatest(points[points.length - 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const pts = data();
    if (pts.length < 2) return;

    const toCandle = (v: number, t: number) => ({
      time: t,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    });

    const bandH = 0.15;
    const betaData = pts.map((p, i) => toCandle(p.beta, i));
    const upperData: ReturnType<typeof toCandle>[] = [];
    const lowerData: ReturnType<typeof toCandle>[] = [];
    pts.forEach((p, i) => {
      if (p.r_squared > 0.3) {
        upperData.push(toCandle(p.beta + bandH, i));
        lowerData.push(toCandle(p.beta - bandH, i));
      }
    });

    const series = [
      { color: 'var(--accent, #00e5ff)', data: betaData },
      { color: 'var(--accent, #00e5ff)', data: upperData },
      { color: 'var(--accent, #00e5ff)', data: lowerData },
    ];
    tipData = betaData;

    renderPlychart('rolling-factor-exposure', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'rolling-factor-exposure', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('rolling-factor-exposure', () =>
      JSON.stringify(tipData),
    );
    onCleanup(disposeTip);
  });

  onAssetChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          ROLLING FACTOR EXPOSURE (β vs ^GSPC)
        </p>
        <Show when={!loading() && data().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 3Y | 60d window / 20d step
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing rolling beta...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas id="rolling-factor-exposure" class="w-full" style={{ height: '280px' }} />

      <Show when={!loading() && data().length > 0}>
        <div class="flex items-center gap-4 mt-1 flex-wrap">
          <span class="font-mono text-[9px]" style={{ color: 'var(--accent, #00e5ff)' }}>
            ■ ROLLING β (60d)
          </span>
          <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            - - β=1.0 reference | ±0.15 band where R² &gt; 0.3
          </span>
        </div>
      </Show>

      <Show when={!loading() && latest()} keyed>
        {(l) => (
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Alpha (daily)
              </p>
              <p
                class="font-mono text-base font-bold"
                style={{
                  color: l.alpha >= 0 ? 'var(--positive, #4caf50)' : 'var(--negative, #ff5252)',
                }}
              >
                {`${(l.alpha * 10000).toFixed(2)}bps`}
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                Market Beta
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {l.beta.toFixed(3)}
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                R²
              </p>
              <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                {l.r_squared.toFixed(3)}
              </p>
            </div>
            <div
              class="border p-2"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
                t-stat (β)
              </p>
              <p
                class="font-mono text-base font-bold"
                style={{ color: Math.abs(l.t_stat) > 2 ? '#4caf50' : 'var(--accent-warm)' }}
              >
                {l.t_stat.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

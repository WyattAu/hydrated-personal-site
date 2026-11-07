import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { WASM_VERSION } from '../../../lib/wasm-version';

interface GarchResult {
  omega: number;
  alpha: number;
  beta: number;
  long_run_var: number;
  conditional_vars: number[];
  forecast: number[];
  ewma_vol: number[];
  realized_vol: number[];
}

export default function VolatilityForecast(props: { symbol?: string }) {
  const symbol = () => activeAsset();
  const [data, setData] = createSignal<GarchResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [forecastHorizon, setForecastHorizon] = createSignal(30);
  let wasmMod: any = null;

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol())}&range=1y&interval=1d`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      const returns = new Float64Array(closes.length - 1);
      for (let i = 1; i < closes.length; i++) returns[i - 1] = Math.log(closes[i] / closes[i - 1]);

      if (!wasmMod) {
        const _w = `/wasm/hydrated_widgets.js?${WASM_VERSION}`;
        wasmMod = await import(_w);
        await wasmMod.default();
      }
      const garchJson = wasmMod.quant_garch(returns, forecastHorizon());
      setData(JSON.parse(garchJson));
    } catch {
      /* skip */
    } finally {
      setLoading(false);
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const d = data();
    if (!d) return;

    const histVol = d.conditional_vars.map((v) => Math.sqrt(Math.max(0, v)) * Math.sqrt(252) * 100);
    const ewmaVol = d.ewma_vol.map((v) => v * Math.sqrt(252) * 100);
    const fcVol = d.forecast.map((v) => Math.sqrt(Math.max(0, v)) * Math.sqrt(252) * 100);

    const toCandle = (v: number, t: number) => ({
      time: t,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    });

    const garchData = histVol.map((v, i) => toCandle(v, i));
    const ewmaData = ewmaVol.map((v, i) => toCandle(v, i));
    const fcData = fcVol.map((v, i) => toCandle(v, histVol.length + i));

    const series = [
      { color: 'var(--accent, #00e5ff)', data: garchData },
      { color: '#7c4dff', data: ewmaData },
      { color: '#f0883e', data: fcData },
    ];
    tipData = garchData;

    renderPlychart('vol-forecast', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'vol-forecast', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('vol-forecast', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  onAssetChanged(() => loadData());

  const d = data();

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          GARCH(1,1) VOLATILITY FORECAST
        </p>
        <div class="flex gap-1">
          {[7, 30, 90].map((h) => (
            <button
              type="button"
              class="font-mono text-[10px] px-2 py-1.5 border transition-colors"
              style={{
                'border-color': forecastHorizon() === h ? 'var(--accent)' : 'var(--border)',
                color: forecastHorizon() === h ? 'var(--accent)' : 'var(--text-secondary)',
                background: forecastHorizon() === h ? 'var(--bg-secondary)' : 'transparent',
              }}
              onClick={() => {
                setForecastHorizon(h);
                loadData();
              }}
            >
              {h}D
            </button>
          ))}
        </div>
      </div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing...
        </p>
      </Show>
      <canvas id="vol-forecast" class="w-full" style={{ height: '280px' }} />
      <Show when={d}>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          {symbol()} | alpha={d?.alpha.toFixed(3)} beta={d?.beta.toFixed(3)} | long-run vol=
          {(Math.sqrt(d?.long_run_var ?? 0) * Math.sqrt(252) * 100).toFixed(1)}%
        </p>
      </Show>
    </div>
  );
}

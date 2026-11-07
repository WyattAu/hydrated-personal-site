import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { getWasmMod } from '../../../lib/wasm-loader';

interface ForwardResult {
  maturities: number[];
  spot_rates: number[];
  forward_rates: number[];
  params: Record<string, number>;
}

export default function ForwardRateCurve() {
  const [result, setResult] = createSignal<ForwardResult | null>(null);
  const [source, setSource] = createSignal<string>('FRED');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/treasury-yields`);
      if (!res.ok) throw new Error('Treasury API unavailable');
      const json = await res.json();

      let maturities: number[];
      let yields: number[];
      if (json && Array.isArray(json.maturities) && Array.isArray(json.yields)) {
        maturities = json.maturities;
        yields = json.yields;
        setSource(typeof json.source === 'string' ? json.source : 'FRED');
      } else if (Array.isArray(json)) {
        maturities = json.map((y: { maturity: number }) => y.maturity);
        yields = json.map((y: { yield: number }) => y.yield);
      } else {
        throw new Error('Invalid treasury data');
      }
      if (maturities.length < 2 || yields.length < 2) throw new Error('Insufficient maturities');

      const wasmMod = await getWasmMod();
      const out = wasmMod.quant_forward_rates(
        new Float64Array(maturities),
        new Float64Array(yields),
      );
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed?.spot_rates) || !Array.isArray(parsed?.forward_rates)) {
        throw new Error('Invalid forward-rate output');
      }

      const spotArr: number[] = parsed.spot_rates.map((v: number | null) => v ?? 0);
      const fwdArr: number[] = parsed.forward_rates.map((v: number | null) => v ?? 0);
      const matArr: number[] = (
        Array.isArray(parsed.maturities) && parsed.maturities.length === spotArr.length
          ? parsed.maturities
          : maturities
      ).map((v: number | null) => v ?? 0);

      setResult({
        maturities: matArr,
        spot_rates: spotArr,
        forward_rates: fwdArr,
        params: parsed.params ?? {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const r = result();
    if (!r) return;
    const n = Math.min(r.maturities.length, r.spot_rates.length, r.forward_rates.length);
    if (n < 2) return;

    const toCandle = (v: number, t: number) => ({
      time: t,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    });

    const spotData = r.spot_rates.slice(0, n).map((v, i) => toCandle(v, i));
    const fwdData = r.forward_rates.slice(0, n).map((v, i) => toCandle(v, i));

    const series = [
      { color: '#42a5f5', data: spotData },
      { color: '#ffa726', data: fwdData },
    ];
    tipData = spotData;

    renderPlychart('forward-curve', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    result();
    renderChart();
  });

  usePlychartAuto(() => 'forward-curve', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('forward-curve', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          FORWARD RATE CURVE
        </p>
        <Show when={!loading() && result()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {source()} | {result()?.maturities.length ?? 0} maturities
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing forward rates...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <canvas id="forward-curve" class="w-full" style={{ height: '280px' }} />

      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Spot vs forward rates | <span style={{ color: 'var(--positive, #4caf50)' }}>Green</span> =
        market expects rate hikes | <span style={{ color: 'var(--negative, #ff5252)' }}>Red</span> =
        expects cuts
      </p>
    </div>
  );
}

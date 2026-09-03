import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface PairsResult {
  hedge_ratio: number;
  z_score: number;
  signal: string;
  is_cointegrated: boolean;
  half_life: number;
  spread_tail: number[];
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

function buildPairs() {
  const t = activeTickers();
  const out: {
    yi: number;
    xi: number;
    yLabel: string;
    xLabel: string;
    ySym: string;
    xSym: string;
  }[] = [];
  for (let i = 0; i < t.length; i++) {
    for (let j = i + 1; j < t.length; j++) {
      out.push({
        yi: i,
        xi: j,
        yLabel: t[i].label,
        xLabel: t[j].label,
        ySym: t[i].symbol,
        xSym: t[j].symbol,
      });
    }
  }
  return out;
}

export default function PairsTradingSignal() {
  const [data, setData] = createSignal<PairsResult | null>(null);
  const [pairIdx, setPairIdx] = createSignal(0);
  const [pairs, setPairs] = createSignal<ReturnType<typeof buildPairs>>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const all = buildPairs();
      setPairs(all);
      if (all.length === 0) throw new Error('Need at least 2 tickers');
      const idx = Math.min(pairIdx(), all.length - 1);
      if (idx !== pairIdx()) setPairIdx(idx);
      const pair = all[idx];

      const [yC, xC] = await Promise.all([
        fetchCloses(pair.ySym, '1y'),
        fetchCloses(pair.xSym, '1y'),
      ]);
      const len = Math.min(yC.length, xC.length);
      if (len < 30) throw new Error('Insufficient data');

      const y = new Float64Array(len);
      const x = new Float64Array(len);
      for (let k = 0; k < len; k++) {
        y[k] = yC[k];
        x[k] = xC[k];
      }

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_pairs_signal(y, x);
      const parsed = JSON.parse(json);
      if (!parsed || parsed.signal === undefined) {
        throw new Error('Pairs signal computation failed');
      }
      setData({
        hedge_ratio: parsed.hedge_ratio ?? 0,
        z_score: parsed.z_score ?? 0,
        signal: parsed.signal ?? 'NO_DATA',
        is_cointegrated: !!parsed.is_cointegrated,
        half_life: parsed.half_life ?? 9999,
        spread_tail: Array.isArray(parsed.spread_tail)
          ? parsed.spread_tail.map((v: number | null) => v ?? 0)
          : [],
      });
    } catch (e) {
      console.error('[PairsTradingSignal]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function signalStyle(signal: string): { color: string; label: string } {
    const s = signal.toUpperCase();
    if (s === 'LONG_SPREAD' || s === 'SHORT_SPREAD')
      return { color: '#4caf50', label: s.replace('_', ' ') };
    if (s === 'HOLD' || s === 'EXIT_OR_FLAT')
      return { color: '#ffc107', label: s.replace('_', ' ') };
    return { color: '#ff5252', label: s.replace('_', ' ') };
  }

  let tipData: object[] = [];

  function renderChart() {
    const d = data();
    if (!d) return;
    const tail = d.spread_tail ?? [];
    if (tail.length < 2) return;
    const seriesData = tail.map((v, i) => ({
      time: i,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    const series = [{ color: '#00e5ff', data: seriesData }];
    tipData = seriesData;
    renderPlychart('pairs-signal', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'pairs-signal', renderChart);

  onMount(() => {
    loadData();
    const disposeTip = attachPlychartTooltip('pairs-signal', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  onTickersChanged(() => {
    setPairIdx(0);
    loadData();
  });

  const cur = () => pairs()[Math.min(pairIdx(), Math.max(0, pairs().length - 1))];

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          PAIRS TRADING SIGNAL
        </p>
        <Show when={!loading() && pairs().length > 0}>
          <select
            class="font-mono text-[10px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            value={pairIdx()}
            onChange={(e) => {
              setPairIdx(Number.parseInt(e.currentTarget.value, 10));
              loadData();
            }}
          >
            <For each={pairs()}>
              {(p, i) => (
                <option value={i()}>
                  {p.yLabel} / {p.xLabel}
                </option>
              )}
            </For>
          </select>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing pairs signal...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && !data()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => {
          const st = signalStyle(d.signal);
          return (
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {cur()?.yLabel} / {cur()?.xLabel} | 1Y daily
                </span>
                <span
                  class="font-mono text-xl font-bold tracking-wider"
                  style={{ color: st.color, 'text-shadow': `0 0 12px ${st.color}55` }}
                >
                  {st.label}
                </span>
              </div>
              <canvas id="pairs-signal" class="w-full" style={{ height: '280px' }} />
              {/* Threshold bands as HTML overlay below canvas */}
              <div class="mt-2 flex flex-wrap gap-1.5 font-mono text-[9px]">
                <div
                  class="px-2 py-1 border border-dashed flex items-center gap-1.5"
                  style={{ 'border-color': '#ff5252', background: '#ff525214', color: '#ff5252' }}
                >
                  <span class="inline-block w-2 h-0.5" style={{ background: '#ff5252' }} /> ±2 ENTRY
                </div>
                <div
                  class="px-2 py-1 border border-dashed flex items-center gap-1.5"
                  style={{ 'border-color': '#4caf50', background: '#4caf5014', color: '#4caf50' }}
                >
                  <span class="inline-block w-2 h-0.5" style={{ background: '#4caf50' }} /> ±0.5
                  EXIT
                </div>
                <div
                  class="px-2 py-1 border border-dashed flex items-center gap-1.5"
                  style={{ 'border-color': '#ff9800', background: '#ff980014', color: '#ff9800' }}
                >
                  <span class="inline-block w-2 h-0.5" style={{ background: '#ff9800' }} /> ±3.5
                  STOP
                </div>
                <div
                  class="px-2 py-1 border flex items-center gap-1.5"
                  style={{
                    'border-color': 'rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  0σ MID
                </div>
              </div>
              <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
                Hedge ratio: {d.hedge_ratio.toFixed(3)} | Half-life:{' '}
                {d.half_life > 9000 ? 'inf' : `${d.half_life.toFixed(1)} days`} | Entry ±2σ | Exit
                ±0.5σ | Stop ±3.5σ
              </p>
            </div>
          );
        }}
      </Show>
    </div>
  );
}

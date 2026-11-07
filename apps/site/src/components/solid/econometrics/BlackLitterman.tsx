import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

const EQ_ID = 'bl-equilibrium';
const POST_ID = 'bl-posterior';
const WGT_ID = 'bl-weights';
const EQ_H = 220;
const POST_H = 220;
const WGT_H = 180;

function toBar(v: number) {
  return { time: 0, open: 0, high: 0, low: 0, close: v, volume: 0 };
}

interface ReturnsData {
  flat: Float64Array;
  nAssets: number;
  nPeriods: number;
  labels: string[];
}

interface BLResult {
  posterior_returns: number[];
  equilibrium_returns: number[];
  weights: number[];
  portfolio_return: number;
  portfolio_risk: number;
  sharpe: number;
}

function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

async function fetchRets(symbol: string): Promise<number[]> {
  const res = await fetch(
    `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes: number[] = (quote?.close ?? []).filter(
    (c: number | null): c is number => c != null,
  );
  return logReturns(closes);
}

export default function BlackLitterman() {
  const [returnsData, setReturnsData] = createSignal<ReturnsData | null>(null);
  const [result, setResult] = createSignal<BLResult | null>(null);
  const [viewAIdx, setViewAIdx] = createSignal(0);
  const [viewBIdx, setViewBIdx] = createSignal(1);
  const [viewX, setViewX] = createSignal(5);
  const [loading, setLoading] = createSignal(true);
  const [computing, setComputing] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [viewMsg, setViewMsg] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 2) throw new Error('Need at least 2 tickers');

      const fetched = await Promise.all(tickers.map((t) => fetchRets(t.symbol)));
      const validIdx: number[] = [];
      const validRets: number[][] = [];
      tickers.forEach((_t, i) => {
        if (fetched[i].length >= 30) {
          validIdx.push(i);
          validRets.push(fetched[i]);
        }
      });
      if (validRets.length < 2) throw new Error('Insufficient data');

      const nAssets = validRets.length;
      const nPeriods = Math.min(...validRets.map((r) => r.length));
      const flat = new Float64Array(nAssets * nPeriods);
      for (let i = 0; i < nAssets; i++) {
        for (let j = 0; j < nPeriods; j++) flat[i * nPeriods + j] = validRets[i][j];
      }

      const labels = validIdx.map((i) => tickers[i].label);
      setReturnsData({ flat, nAssets, nPeriods, labels });
      setViewAIdx(0);
      setViewBIdx(Math.min(1, nAssets - 1));
      await applyView();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setReturnsData(null);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function applyView() {
    const rd = returnsData();
    if (!rd) return;
    const a = viewAIdx();
    const b = viewBIdx();
    setViewMsg(null);
    if (a === b) {
      setResult(null);
      setViewMsg('Select two different assets for the view');
      return;
    }
    setComputing(true);
    try {
      const P = new Float64Array(rd.nAssets);
      P[a] = -1;
      P[b] = 1;
      const Q = new Float64Array([viewX() / 100]);

      const wasmMod = await getWasmMod();
      const out = wasmMod.quant_black_litterman(
        rd.flat,
        rd.nAssets,
        rd.nPeriods,
        Q,
        P,
        1,
        0.04,
        0.05,
      );
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed?.posterior_returns)) throw new Error('Invalid BL output');

      setResult({
        posterior_returns: (parsed.posterior_returns ?? []).map((v: number | null) => v ?? 0),
        equilibrium_returns: (parsed.equilibrium_returns ?? []).map((v: number | null) => v ?? 0),
        weights: (parsed.weights ?? []).map((v: number | null) => v ?? 0),
        portfolio_return: parsed.portfolio_return ?? 0,
        portfolio_risk: parsed.portfolio_risk ?? 0,
        sharpe: parsed.sharpe ?? 0,
      });
    } catch (e) {
      setResult(null);
      setViewMsg(e instanceof Error ? e.message : 'Black-Litterman failed');
    } finally {
      setComputing(false);
    }
  }

  function renderEq() {
    const r = result();
    const rd = returnsData();
    if (!r || !rd) return;
    const n = Math.min(rd.labels.length, r.equilibrium_returns.length, r.posterior_returns.length);
    if (n < 1) return;
    const eqBars = r.equilibrium_returns.slice(0, n).map(toBar);
    renderPlychart(EQ_ID, 'update_bar', JSON.stringify(eqBars), '');
  }

  function renderPost() {
    const r = result();
    const rd = returnsData();
    if (!r || !rd) return;
    const n = Math.min(rd.labels.length, r.equilibrium_returns.length, r.posterior_returns.length);
    if (n < 1) return;
    const postBars = r.posterior_returns.slice(0, n).map(toBar);
    renderPlychart(POST_ID, 'update_bar', JSON.stringify(postBars), '');
  }

  function renderWgt() {
    const r = result();
    const rd = returnsData();
    if (!r || !rd) return;
    const nw = Math.min(rd.labels.length, r.weights.length);
    const wgtBars = r.weights.slice(0, nw).map(toBar);
    renderPlychart(WGT_ID, 'update_bar', JSON.stringify(wgtBars), '');
  }

  createEffect(() => {
    result();
    returnsData();
    renderEq();
  });

  createEffect(() => {
    result();
    returnsData();
    renderPost();
  });

  createEffect(() => {
    result();
    returnsData();
    renderWgt();
  });

  usePlychartAuto(() => EQ_ID, renderEq);
  usePlychartAuto(() => POST_ID, renderPost);
  usePlychartAuto(() => WGT_ID, renderWgt);

  onMount(() => {
    loadData();
  });

  onTickersChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          BLACK-LITTERMAN OPTIMIZATION
        </p>
        <Show when={!loading() && returnsData()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {returnsData()?.nAssets ?? 0} assets | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading returns...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && returnsData()}>
        <div
          class="p-3 border mb-3 flex flex-wrap items-end gap-3"
          style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <p class="font-mono text-[10px] w-full" style={{ color: 'var(--text-secondary)' }}>
            INVESTOR VIEW
          </p>
          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
              Asset A
            </span>
            <select
              class="font-mono text-[10px] px-2 py-1 border"
              style={{
                'border-color': 'var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--accent)',
              }}
              value={viewAIdx()}
              onChange={(e) => setViewAIdx(Number(e.currentTarget.value))}
            >
              <For each={returnsData()?.labels}>
                {(lbl, i) => <option value={i()}>{lbl}</option>}
              </For>
            </select>
          </label>
          <span class="font-mono text-[10px] pb-1" style={{ color: 'var(--text-secondary)' }}>
            will outperform
          </span>
          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
              Asset B
            </span>
            <select
              class="font-mono text-[10px] px-2 py-1 border"
              style={{
                'border-color': 'var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--accent)',
              }}
              value={viewBIdx()}
              onChange={(e) => setViewBIdx(Number(e.currentTarget.value))}
            >
              <For each={returnsData()?.labels}>
                {(lbl, i) => <option value={i()}>{lbl}</option>}
              </For>
            </select>
          </label>
          <span class="font-mono text-[10px] pb-1" style={{ color: 'var(--text-secondary)' }}>
            by
          </span>
          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
              X %
            </span>
            <input
              type="number"
              step="0.5"
              class="font-mono text-[10px] px-2 py-1 border w-20"
              style={{
                'border-color': 'var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--accent)',
              }}
              value={viewX()}
              onInput={(e) => setViewX(Number(e.currentTarget.value))}
            />
          </label>
          <button
            type="button"
            class="font-mono text-[10px] px-3 py-1 border"
            style={{
              'border-color': 'var(--accent)',
              color: 'var(--accent)',
              background: 'transparent',
            }}
            onClick={() => applyView()}
          >
            {computing() ? '...' : 'APPLY'}
          </button>
        </div>

        <Show when={viewMsg()}>
          <p class="font-mono text-xs pb-2" style={{ color: 'var(--accent-warm)' }}>
            {viewMsg()}
          </p>
        </Show>

        <Show when={result()} keyed>
          {(r) => (
            <>
              <div class="grid grid-cols-3 gap-2 mb-3">
                <div
                  class="border p-2"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <p
                    class="font-mono text-[9px] uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Portfolio Return
                  </p>
                  <p
                    class="font-mono text-base font-bold"
                    style={{
                      color:
                        r.portfolio_return >= 0
                          ? 'var(--positive, #4caf50)'
                          : 'var(--negative, #ff5252)',
                    }}
                  >
                    {(r.portfolio_return * 100).toFixed(2)}%
                  </p>
                </div>
                <div
                  class="border p-2"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <p
                    class="font-mono text-[9px] uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Risk
                  </p>
                  <p class="font-mono text-base font-bold" style={{ color: 'var(--accent-warm)' }}>
                    {(r.portfolio_risk * 100).toFixed(2)}%
                  </p>
                </div>
                <div
                  class="border p-2"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <p
                    class="font-mono text-[9px] uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Sharpe
                  </p>
                  <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                    {r.sharpe.toFixed(3)}
                  </p>
                </div>
              </div>

              <p
                class="font-mono text-[9px] uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Equilibrium vs Posterior Returns
              </p>
              <div
                class="flex items-center gap-4 mb-1 font-mono text-[9px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span class="flex items-center gap-1">
                  <span class="inline-block w-2 h-2" style={{ background: '#00e5ff' }} />
                  EQUILIBRIUM
                </span>
                <span class="flex items-center gap-1">
                  <span class="inline-block w-2 h-2" style={{ background: '#ff6b35' }} />
                  POSTERIOR
                </span>
              </div>
              <canvas id={EQ_ID} class="w-full" style={{ height: `${EQ_H}px` }} />
              <canvas id={POST_ID} class="w-full mt-2" style={{ height: `${POST_H}px` }} />

              <p
                class="font-mono text-[9px] uppercase tracking-wider mb-1 mt-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Optimal Weights
              </p>
              <canvas id={WGT_ID} class="w-full" style={{ height: `${WGT_H}px` }} />
            </>
          )}
        </Show>
      </Show>

      <p class="font-mono text-[10px] mt-3" style={{ color: 'var(--text-secondary)' }}>
        Bayesian posterior combining market equilibrium with investor views
      </p>
    </div>
  );
}

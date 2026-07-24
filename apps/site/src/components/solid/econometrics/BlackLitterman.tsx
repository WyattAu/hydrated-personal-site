import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

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
  let returnsCanvasRef: HTMLCanvasElement | undefined;
  let weightsCanvasRef: HTMLCanvasElement | undefined;

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

  function drawBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    bw: number,
    v: number,
    toY: (v: number) => number,
    baseY: number,
    color: string,
  ) {
    ctx.fillStyle = color;
    const y1 = toY(v);
    const top = Math.min(baseY, y1);
    const bh = Math.max(1, Math.abs(y1 - baseY));
    ctx.fillRect(x, top, bw, bh);
  }

  function drawReturns() {
    const canvas = returnsCanvasRef;
    const r = result();
    const rd = returnsData();
    if (!canvas || !r || !rd) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 220;
    const colors = getThemeColors();
    const pad = { l: 50, r: 12, t: 16, b: 40 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const eq = r.equilibrium_returns;
    const post = r.posterior_returns;
    const labs = rd.labels;
    const n = Math.min(labs.length, eq.length, post.length);
    if (n < 1) return;

    const allVals = [...eq.slice(0, n), ...post.slice(0, n)];
    let minY = Math.min(0, ...allVals);
    let maxY = Math.max(0, ...allVals);
    if (minY === maxY) {
      minY -= 0.001;
      maxY += 0.001;
    }
    const span = maxY - minY;
    minY -= span * 0.1;
    maxY += span * 0.1;
    const range = maxY - minY || 1;
    const toY = (v: number) => pad.t + (1 - (v - minY) / range) * cH;
    const baseY = toY(0);

    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${((maxY - (range * i) / 4) * 100).toFixed(2)}%`, pad.l - 5, y + 3);
    }

    const groupW = cW / n;
    const barW = Math.min(12, groupW * 0.32);
    for (let i = 0; i < n; i++) {
      const gx = pad.l + i * groupW + groupW / 2;
      drawBar(ctx, gx - barW - 1, barW, eq[i], toY, baseY, colors.accent || '#00e5ff');
      drawBar(ctx, gx + 1, barW, post[i], toY, baseY, colors.accentWarm || '#ff6b35');
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      const lbl = labs[i].length > 6 ? labs[i].slice(0, 6) : labs[i];
      ctx.fillText(lbl, gx, h - pad.b + 12);
    }

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.fillRect(pad.l, pad.t + 2, 8, 8);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.7)';
    ctx.fillText('EQUILIBRIUM', pad.l + 12, pad.t + 9);
    ctx.fillStyle = colors.accentWarm || '#ff6b35';
    ctx.fillRect(pad.l + 92, pad.t + 2, 8, 8);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.7)';
    ctx.fillText('POSTERIOR', pad.l + 104, pad.t + 9);
  }

  function drawWeights() {
    const canvas = weightsCanvasRef;
    const r = result();
    const rd = returnsData();
    if (!canvas || !r || !rd) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 180;
    const colors = getThemeColors();
    const pad = { l: 50, r: 12, t: 16, b: 40 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const wgt = r.weights;
    const labs = rd.labels;
    const n = Math.min(labs.length, wgt.length);
    if (n < 1) return;

    const maxW = Math.max(0.0001, ...wgt.slice(0, n));
    const toY = (v: number) => pad.t + (1 - v / maxW) * cH;

    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(((maxW * i) / 4) * 100).toFixed(0)}%`, pad.l - 5, y + 3);
    }

    const groupW = cW / n;
    const barW = Math.min(20, groupW * 0.5);
    for (let i = 0; i < n; i++) {
      const gx = pad.l + i * groupW + groupW / 2;
      drawBar(ctx, gx - barW / 2, barW, wgt[i], toY, pad.t + cH, '#4caf50');
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      const lbl = labs[i].length > 6 ? labs[i].slice(0, 6) : labs[i];
      ctx.fillText(lbl, gx, h - pad.b + 12);
    }
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  createEffect(() => {
    result();
    if (!loading() && !computing())
      requestAnimationFrame(() => {
        drawReturns();
        drawWeights();
      });
  });

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
                    style={{ color: r.portfolio_return >= 0 ? '#4caf50' : '#ff5252' }}
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
              <canvas ref={returnsCanvasRef} class="w-full" style={{ height: '220px' }} />

              <p
                class="font-mono text-[9px] uppercase tracking-wider mb-1 mt-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Optimal Weights
              </p>
              <canvas ref={weightsCanvasRef} class="w-full" style={{ height: '180px' }} />
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

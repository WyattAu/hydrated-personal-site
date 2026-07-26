import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getWasmMod } from '../../../lib/wasm-loader';

// Standard normal CDF (Abramowitz & Stegun approximation).
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Black-Scholes option price (used to reprice at the solved IV).
function blackScholes(
  spot: number,
  strike: number,
  t: number,
  r: number,
  vol: number,
  isCall: boolean,
): number {
  if (t <= 0 || vol <= 0) return Math.max(0, isCall ? spot - strike : strike - spot);
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + (vol * vol) / 2) * t) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;
  const disc = Math.exp(-r * t);
  return isCall
    ? spot * normCdf(d1) - strike * disc * normCdf(d2)
    : strike * disc * normCdf(-d2) - spot * normCdf(-d1);
}

export default function IvSolver() {
  const [spot, setSpot] = createSignal<number>(0);
  const [strike, setStrike] = createSignal<number>(0);
  const [days, setDays] = createSignal<number>(30);
  const [rate, setRate] = createSignal<number>(4.5);
  const [market, setMarket] = createSignal<number>(0);
  const [isCall, setIsCall] = createSignal<boolean>(true);
  const [iv, setIv] = createSignal<number | null>(null);
  const [theo, setTheo] = createSignal<number | null>(null);
  const [computing, setComputing] = createSignal<boolean>(false);
  const [loading, setLoading] = createSignal<boolean>(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadSpot() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=1d&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      const px = meta?.regularMarketPrice ?? (closes.length > 0 ? closes[closes.length - 1] : 0);
      if (!px || px <= 0) throw new Error('No spot price');
      const rounded = Math.round(px);
      setSpot(px);
      setStrike(rounded);
      setMarket(Number((px * 0.03).toFixed(2)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function solve() {
    setComputing(true);
    setError(null);
    try {
      const s = spot();
      const k = strike();
      const t = days() / 365;
      const r = rate() / 100;
      const m = market();
      if (s <= 0 || k <= 0 || m <= 0 || days() <= 0) throw new Error('Invalid inputs');
      const wasmMod = await getWasmMod();
      const solved = wasmMod.quant_implied_vol(m, s, k, t, r, isCall());
      if (!Number.isFinite(solved) || solved <= 0) {
        setIv(null);
        setTheo(null);
        throw new Error('Solver did not converge');
      }
      setIv(solved);
      setTheo(blackScholes(s, k, t, r, solved, isCall()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setIv(null);
      setTheo(null);
    } finally {
      setComputing(false);
    }
  }

  onMount(() => loadSpot());

  onAssetChanged(() => loadSpot());

  const inputCls = 'font-mono text-xs px-2 py-1 border w-full';
  const inputStyle = {
    'border-color': 'var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
  };
  const labelCls = 'font-mono text-[9px] uppercase tracking-wider block mb-1';

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          IMPLIED VOLATILITY SOLVER
        </p>
        <Show when={!loading()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | {isCall() ? 'CALL' : 'PUT'}
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading spot price...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-2 mb-2" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading()}>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label class={labelCls} style={{ color: 'var(--text-secondary)' }}>
              Spot Price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={spot() || ''}
              onInput={(e) => setSpot(Number(e.currentTarget.value) || 0)}
              class={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label class={labelCls} style={{ color: 'var(--text-secondary)' }}>
              Strike Price
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={strike() || ''}
              onInput={(e) => setStrike(Number(e.currentTarget.value) || 0)}
              class={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label class={labelCls} style={{ color: 'var(--text-secondary)' }}>
              Days to Expiry
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={days()}
              onInput={(e) => setDays(Math.max(1, Number(e.currentTarget.value) || 1))}
              class={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label class={labelCls} style={{ color: 'var(--text-secondary)' }}>
              Risk-free Rate %
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={rate()}
              onInput={(e) => setRate(Number(e.currentTarget.value) || 0)}
              class={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label class={labelCls} style={{ color: 'var(--text-secondary)' }}>
              Market Price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={market() || ''}
              onInput={(e) => setMarket(Number(e.currentTarget.value) || 0)}
              class={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label class={labelCls} style={{ color: 'var(--text-secondary)' }}>
              Option Type
            </label>
            <div class="flex gap-1">
              <button
                type="button"
                class="font-mono text-xs px-2 py-1 border flex-1"
                style={{
                  'border-color': 'var(--border)',
                  background: isCall() ? 'var(--accent)' : 'var(--bg-card)',
                  color: isCall() ? 'var(--bg-card)' : 'var(--text-primary)',
                }}
                onClick={() => setIsCall(true)}
              >
                CALL
              </button>
              <button
                type="button"
                class="font-mono text-xs px-2 py-1 border flex-1"
                style={{
                  'border-color': 'var(--border)',
                  background: !isCall() ? 'var(--accent)' : 'var(--bg-card)',
                  color: !isCall() ? 'var(--bg-card)' : 'var(--text-primary)',
                }}
                onClick={() => setIsCall(false)}
              >
                PUT
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="font-mono text-xs px-4 py-2 border mb-4"
          style={{
            'border-color': 'var(--accent)',
            background: 'var(--accent)',
            color: 'var(--bg-card)',
            opacity: computing() ? 0.6 : 1,
          }}
          disabled={computing()}
          onClick={() => solve()}
        >
          {computing() ? 'SOLVING...' : 'COMPUTE IV'}
        </button>

        <Show when={iv() != null}>
          <div class="grid grid-cols-2 gap-2">
            <div
              class="border p-3 flex flex-col gap-1"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p
                class="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Implied Volatility
              </p>
              <p class="font-mono text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                {((iv() ?? 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div
              class="border p-3 flex flex-col gap-1"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <p
                class="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                BS Price @ IV
              </p>
              <p class="font-mono text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {(theo() ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Show>

        <p class="font-mono text-[9px] mt-3" style={{ color: 'var(--text-secondary)' }}>
          Newton-Raphson solver on Black-Scholes | Convergence: 100 iterations max
        </p>
      </Show>
    </div>
  );
}

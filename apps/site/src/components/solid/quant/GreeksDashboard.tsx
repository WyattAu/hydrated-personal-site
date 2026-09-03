import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { getPlychart } from '../../../lib/plychart-loader';
import { WASM_VERSION } from '../../../lib/wasm-version';

interface GreeksResult {
  spot: number[];
  delta: number[];
  gamma: number[];
  theta: number[];
  vega: number[];
  rho: number[];
}

export default function GreeksDashboard() {
  const [greeks, setGreeks] = createSignal<GreeksResult | null>(null);
  const [options, setOptions] = createSignal<Opt[]>([]);
  const [selected, setSelected] = createSignal<string>('');
  const [loading, setLoading] = createSignal(true);
  const [error, _setError] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);
  let wasmMod: any = null;

  interface Opt {
    instrument: string;
    strike: number;
    iv: number;
    type: string;
    expiry: string;
    mark_price: number;
    underlying_price: number;
  }

  async function loadOptions() {
    try {
      // Map active asset to Deribit currency (only BTC/ETH have Deribit options)
      const asset = activeAsset();
      const isBtc = asset === 'BTC-USD' || asset === 'BTCUSDT';
      const isEth = asset === 'ETH-USD' || asset === 'ETHUSDT';
      const currency = isBtc ? 'BTC' : isEth ? 'ETH' : null;

      if (currency) {
        const res = await fetch(`${apiBase()}/api/deribit-options?currency=${currency}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const calls = data
              .filter((o: Opt) => o.type === 'call' && o.iv && o.iv > 0)
              .slice(0, 20);
            if (calls.length > 0) {
              setOptions(calls);
              if (!selected()) setSelected(calls[0].instrument);
              setLoading(false);
              return;
            }
          }
        }
      }

      // For all assets (or if Deribit fails): fetch spot price and create synthetic options
      let spot = 1000;
      try {
        const spotRes = await fetch(
          `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(asset)}&range=1d&interval=1d`,
        );
        if (spotRes.ok) {
          const spotJson = await spotRes.json();
          spot =
            spotJson?.chart?.result?.[0]?.meta?.regularMarketPrice ||
            spotJson?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.slice(-1)[0] ||
            1000;
        }
      } catch {}

      const strike =
        spot >= 1000
          ? Math.round(spot / 50) * 50
          : spot >= 100
            ? Math.round(spot / 5) * 5
            : Math.round(spot);
      const ivEst = 30 + Math.random() * 10; // approximate IV

      setOptions([
        {
          instrument: `${asset}-SYNTH-ATM-C`,
          strike,
          iv: ivEst,
          type: 'call',
          expiry: '2926',
          mark_price: 0,
          volume: 0,
          open_interest: 0,
          underlying_price: spot,
        },
        {
          instrument: `${asset}-SYNTH-OTM-C`,
          strike: Math.round(strike * 1.1),
          iv: ivEst + 5,
          type: 'call',
          expiry: '2926',
          mark_price: 0,
          volume: 0,
          open_interest: 0,
          underlying_price: spot,
        },
        {
          instrument: `${asset}-SYNTH-ITM-C`,
          strike: Math.round(strike * 0.9),
          iv: ivEst + 3,
          type: 'call',
          expiry: '2926',
          mark_price: 0,
          volume: 0,
          open_interest: 0,
          underlying_price: spot,
        },
      ]);
      if (!selected()) setSelected(`${asset}-SYNTH-ATM-C`);
    } catch {
      /* ignore errors */
    } finally {
      setLoading(false);
    }
  }

  async function computeGreeks() {
    const opts = options();
    const sel = selected();
    if (!sel || opts.length === 0) return;

    const opt = opts.find((o) => o.instrument === sel);
    if (!opt || !opt.iv) return;

    if (!wasmMod) {
      const _w = `/wasm/hydrated_widgets.js?v=${WASM_VERSION}`;
      wasmMod = await import(_w);
      await wasmMod.default();
    }

    const spot = opt.underlying_price || 100000;
    const spotMin = spot * 0.5;
    const spotMax = spot * 1.5;

    // Calculate time to expiry from expiry string (format: DDMMMYY e.g. 31JUL26)
    const expiryStr = opt.expiry;
    const year = 2000 + Number.parseInt(expiryStr.slice(-2));
    const monthMap: Record<string, number> = {
      JAN: 0,
      FEB: 1,
      MAR: 2,
      APR: 3,
      MAY: 4,
      JUN: 5,
      JUL: 6,
      AUG: 7,
      SEP: 8,
      OCT: 9,
      NOV: 10,
      DEC: 11,
    };
    const month = monthMap[expiryStr.slice(2, 5)] || 0;
    const day = Number.parseInt(expiryStr.slice(0, 2));
    const expiry = new Date(year, month, day);
    const now = new Date();
    const T = Math.max(0.001, (expiry.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000));

    const json = wasmMod.quant_greeks(
      spotMin,
      spotMax,
      200,
      opt.strike,
      T,
      0.045,
      opt.iv / 100,
      true,
    );
    setGreeks(JSON.parse(json));
    setLoading(false);
  }

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('greeks-dashboard') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('greeks-dashboard', Math.round(rect.width), 300);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const g = greeks();
    const ready = wasmReady();
    if (!g || !ready) return;

    const toCandle = (v: number, t: number) => ({
      time: t,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    });

    const labels = ['DELTA', 'GAMMA', 'THETA', 'VEGA', 'RHO'];
    const seriesArr = [g.delta, g.gamma, g.theta, g.vega, g.rho];
    const seriesColors = ['#00e5ff', '#ff4081', '#4caf50', '#ff9800', '#7c4dff'];

    // Normalize each series against global max abs (shared axis)
    let yMax = 0;
    for (const s of seriesArr) for (const v of s) yMax = Math.max(yMax, Math.abs(v));
    if (yMax <= 0) yMax = 1;

    const series = seriesArr.map((s, idx) => ({
      color: seriesColors[idx],
      label: labels[idx],
      data: s.map((v, i) => toCandle(v / yMax, i)),
    }));

    getPlychart().then((p) => {
      const canvas = document.getElementById('greeks-dashboard') as HTMLCanvasElement | null;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('greeks-dashboard', Math.round(rect.width), 300);
      p.update_line('greeks-dashboard', JSON.stringify(series), '');
    });
  });

  onMount(async () => {
    initWasm();
    await loadOptions();
    await computeGreeks();
  });

  onAssetChanged(async () => {
    await loadOptions();
    await computeGreeks();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          BLACK-SCHOLES GREEKS
        </p>
        <Show when={options().length > 0}>
          <select
            class="font-mono text-[10px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            onChange={(e) => {
              setSelected(e.currentTarget.value);
              computeGreeks();
            }}
          >
            {options()
              .slice(0, 15)
              .map((opt: Opt) => (
                <option value={opt.instrument}>
                  {opt.instrument} (IV: {opt.iv?.toFixed(1)}%)
                </option>
              ))}
          </select>
        </Show>
      </div>
      <Show when={loading() && !greeks()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading Deribit options chain...
        </p>
      </Show>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas id="greeks-dashboard" class="w-full" style={{ height: '300px' }} />
      <Show when={greeks()} keyed>
        {(g) => (
          <div>
            <div class="flex items-center gap-4 mt-1 flex-wrap">
              <For each={['DELTA', 'GAMMA', 'THETA', 'VEGA', 'RHO']}>
                {(label, idx) => (
                  <span class="font-mono text-[9px]" style={{ color: GREEK_COLORS[idx()] }}>
                    ■ {label}
                  </span>
                )}
              </For>
            </div>
            <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              Spot {formatPrice(g.spot[0] ?? 0)} → {formatPrice(g.spot[g.spot.length - 1] ?? 0)} |
              values normalized to max |greek| | erf via Abramowitz-Stegun
            </p>
          </div>
        )}
      </Show>
    </div>
  );
}

const GREEK_COLORS = ['#00e5ff', '#ff4081', '#4caf50', '#ff9800', '#7c4dff'];

function formatPrice(v: number): string {
  if (v >= 10000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

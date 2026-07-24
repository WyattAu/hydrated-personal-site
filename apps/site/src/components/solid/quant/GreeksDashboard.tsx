import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';

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
  let canvasRef: HTMLCanvasElement | undefined;
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
  function useStateSignal() {
    const [v, set] = createSignal<Opt[]>([]);
    return { get: v, set };
  }

  async function loadOptions() {
    try {
      const res = await fetch(`${apiBase()}/api/deribit-options?currency=BTC`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      if (Array.isArray(data)) {
        const calls = data.filter((o: Opt) => o.type === 'call' && o.iv && o.iv > 0).slice(0, 20);
        if (calls.length > 0) {
          setOptions(calls);
          if (!selected()) setSelected(calls[0].instrument);
          return;
        }
      }
    } catch {
      /* Deribit rate-limited or unavailable */
    }
    // Fallback: synthetic ATM option for demo
    setOptions([
      {
        instrument: 'BTC-SYNTHETIC-ATM-C',
        strike: 60000,
        iv: 55,
        type: 'call',
        expiry: '2926',
        mark_price: 0,
        volume: 0,
        open_interest: 0,
        underlying_price: 60000,
      },
      {
        instrument: 'BTC-SYNTHETIC-OTM-C',
        strike: 70000,
        iv: 65,
        type: 'call',
        expiry: '2926',
        mark_price: 0,
        volume: 0,
        open_interest: 0,
        underlying_price: 60000,
      },
    ]);
    if (!selected()) setSelected('BTC-SYNTHETIC-ATM-C');
  }

  async function computeGreeks() {
    const opts = options();
    const sel = selected();
    if (!sel || opts.length === 0) return;

    const opt = opts.find((o) => o.instrument === sel);
    if (!opt || !opt.iv) return;

    if (!wasmMod) {
      const _w = '/wasm/hydrated_widgets.js?v=j30';
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

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !greeks()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 300;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const g = greeks()!;
    const labels = ['DELTA', 'GAMMA', 'THETA', 'VEGA', 'RHO'];
    const series = [g.delta, g.gamma, g.theta, g.vega, g.rho];
    const colors5 = [colors.accent || '#00e5ff', '#7c4dff', '#ff4081', '#4caf50', '#ffa726'];

    const pad = { l: 50, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    // Y range (normalize each to [-1, 1] relative to its max abs)
    let yMax = 0;
    for (const s of series) for (const v of s) yMax = Math.max(yMax, Math.abs(v));

    const toX = (i: number) => pad.l + (i / (g.spot.length - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v / yMax + 1) / 2) * cH;

    // Zero line
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, toY(0));
    ctx.lineTo(w - pad.r, toY(0));
    ctx.stroke();

    // Curves
    series.forEach((s, idx) => {
      ctx.strokeStyle = colors5[idx];
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.forEach((v, i) => {
        i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
      });
      ctx.stroke();
    });

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    labels.forEach((label, idx) => {
      const x = pad.l + idx * 80;
      ctx.fillStyle = colors5[idx];
      ctx.fillRect(x, 4, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, 11);
    });

    // X axis labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(((g.spot.length - 1) * i) / 4);
      ctx.fillText(formatPrice(g.spot[idx]), toX(idx), h - 10);
    }
  }

  onMount(async () => {
    await loadOptions();
    await computeGreeks();
    setTimeout(draw, 10);
  });

  const g = greeks();

  createEffect(() => {
    const v = greeks();
    if (v) draw();
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
      <canvas ref={canvasRef} class="w-full" style={{ height: '300px' }} />
      <Show when={greeks()}>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Deribit BTC options | Greeks computed in WASM | erf via Abramowitz-Stegun
        </p>
      </Show>
    </div>
  );
}

function formatPrice(v: number): string {
  if (v >= 10000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

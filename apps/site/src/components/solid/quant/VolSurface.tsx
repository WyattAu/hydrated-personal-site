import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import { getWasmMod } from '../../../lib/wasm-loader';

const H = 300;

interface OptionEntry {
  expiry: string;
  strike: number;
  iv: number;
  underlying_price: number;
  error?: unknown;
}

interface SviParams {
  a: number;
  b: number;
  rho: number;
  m: number;
  sigma: number;
}

interface SviSlice {
  t: number;
  params: SviParams;
  atm_iv: number;
  rmse: number;
  curve: Array<[number, number]>;
}

interface SviSurface {
  slices: SviSlice[];
  k_grid: number[];
  surface_iv: number[][];
  error?: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/// Parse Deribit expiry tag (e.g. "28MAR26") to a Date.
function parseExpiry(tag: string): Date | null {
  const m = tag.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return new Date(2000 + Number(m[3]), month, Number(m[1]));
}

export default function VolSurface() {
  const [surface, setSurface] = createSignal<SviSurface | null>(null);
  const [smile, setSmile] = createSignal<{ k: number[]; fitted: number[] } | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/deribit-options?currency=BTC`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const options: OptionEntry[] = await res.json();
      if (!Array.isArray(options) || options.length === 0) throw new Error('No options data');
      if (options[0].error) throw new Error(String(options[0].error));

      // Group quotes by expiry, keeping only entries with IV + price.
      const now = new Date();
      const byExpiry = new Map<number, { t: number; k: number[]; w: number[] }>();
      for (const opt of options) {
        if (!opt.iv || !opt.underlying_price || !opt.strike) continue;
        const exp = parseExpiry(opt.expiry);
        if (!exp) continue;
        const days = (exp.getTime() - now.getTime()) / 86_400_000;
        if (days < 1 || days > 365) continue;
        const t = days / 365;
        const k = Math.log(opt.strike / opt.underlying_price);
        if (k < -0.5 || k > 0.5) continue; // moneyness band
        const w = (opt.iv / 100) ** 2 * t;
        if (!Number.isFinite(w) || w <= 0) continue;
        const slot = byExpiry.get(t) ?? { t, k: [], w: [] };
        slot.k.push(k);
        slot.w.push(w);
        byExpiry.set(t, slot);
      }

      // Keep at most 6 nearest expiries with >= 5 strikes.
      const slices = [...byExpiry.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v)
        .filter((s) => s.k.length >= 5)
        .slice(0, 6);
      if (slices.length === 0) throw new Error('No eligible expiries');

      const wasm = await getWasmMod();
      const out: SviSurface = JSON.parse(wasm.quant_svi_surface(JSON.stringify(slices), 20));
      if (out.error) throw new Error(out.error);
      if (!out.slices || out.slices.length === 0) throw new Error('SVI fit failed');
      setSurface(out);
      setChartMetaState(canvasId(), { fallback: false, error: null, freshAt: Date.now() });

      // Nearest-expiry fitted smile.
      setSmile({
        k: out.slices[0].curve.map((c) => c[0]),
        fitted: out.slices[0].curve.map((c) => Math.round(c[1] * 10000) / 100),
      });
    } catch (e) {
      console.error('[VolSurface]', e);
      // Fall back to sample data so the landing page always renders —
      // but DISCLOSE it inline instead of passing it off as live.
      setChartMetaState(canvasId(), {
        fallback: true,
        error: e instanceof Error ? e.message : 'live feed unavailable',
      });
      loadSample();
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const s = surface();
    if (!s || s.surface_iv.length === 0) return;
    renderPlychart('vol-surface', 'update_heatmap', JSON.stringify(s.surface_iv), '');
  }

  function renderSmile() {
    const sm = smile();
    if (!sm) return;
    // Fitted smile across its k grid (x = moneyness, uniform spacing).
    const series = [
      {
        color: '#00e5ff',
        data: sm.fitted.map((v) => ({ time: 0, open: 0, high: 0, low: 0, close: v, volume: 0 })),
      },
    ];
    renderPlychart('svi-smile', 'update_line', JSON.stringify(series), '');
  }

  createEffect(() => {
    surface();
    renderChart();
  });
  createEffect(() => {
    smile();
    renderSmile();
  });

  usePlychartAuto(() => 'vol-surface', renderChart);
  usePlychartAuto(() => 'svi-smile', renderSmile);

  const SAMPLE_SURFACE: SviSurface = {
    slices: [
      {
        t: 0.08,
        params: { a: 0.02, b: 0.15, rho: -0.4, m: 0, sigma: 0.3 },
        atm_iv: 0.55,
        rmse: 0.001,
        curve: [],
      },
      {
        t: 0.17,
        params: { a: 0.03, b: 0.12, rho: -0.3, m: 0.01, sigma: 0.35 },
        atm_iv: 0.52,
        rmse: 0.001,
        curve: [],
      },
      {
        t: 0.33,
        params: { a: 0.04, b: 0.1, rho: -0.2, m: 0, sigma: 0.4 },
        atm_iv: 0.5,
        rmse: 0.001,
        curve: [],
      },
      {
        t: 0.67,
        params: { a: 0.05, b: 0.08, rho: -0.1, m: 0, sigma: 0.45 },
        atm_iv: 0.48,
        rmse: 0.001,
        curve: [],
      },
    ],
    k_grid: Array.from({ length: 20 }, (_, i) => -0.45 + (i / 19) * 0.9),
    surface_iv: Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 20 }, (_, col) => {
        const k = -0.45 + (col / 19) * 0.9;
        const base = [0.55, 0.52, 0.5, 0.48][row];
        return Math.round((base + 0.08 * k * k - 0.03 * k) * 100) / 100;
      }),
    ),
  };

  function loadSample() {
    const s = SAMPLE_SURFACE;
    // Generate curves for the smile chart
    for (const sl of s.slices) {
      sl.curve = s.k_grid.map((k) => {
        const w =
          sl.params.a +
          sl.params.b *
            (sl.params.rho * (k - sl.params.m) +
              Math.sqrt((k - sl.params.m) ** 2 + sl.params.sigma ** 2));
        return [k, Math.sqrt(w / sl.t)];
      });
    }
    setSurface(s);
    setSmile({
      k: s.k_grid,
      fitted: s.surface_iv[0].map((v) => v),
    });
    setLoading(false);
  }

  const canvasId = () => 'vol-surface';

  onMount(() => {
    attachChartMeta('vol-surface', {
      source: 'Deribit',
      detail: 'BTC options · SVI fit',
      fallbackLabel: 'sample data — live feed unavailable',
    });
    loadData();
  });

  const s = () => surface();
  const kLabel = (k: number) => `${(k * 100).toFixed(0)}%`;

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          BTC VOLATILITY SURFACE (SVI)
        </p>
        <Show when={!loading() && s()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {s()!.slices.length} expiries | Deribit mark IV | Quasi-explicit fit
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Fitting SVI slices...
        </p>
      </Show>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <Show when={!loading() && s()}>
        <canvas id="vol-surface" class="w-full" style={{ height: `${H}px` }} />
        <div
          class="flex flex-wrap gap-2 mt-2 font-mono text-[9px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <For each={s()!.slices}>
            {(sl, i) => (
              <span class="px-1.5 py-0.5 border" style={{ 'border-color': 'var(--border)' }}>
                T={sl.t < 1 ? `${(sl.t * 365).toFixed(0)}d` : `${sl.t.toFixed(2)}y`} | ATM{' '}
                {(sl.atm_iv * 100).toFixed(1)}% | RMSE {sl.rmse.toExponential(1)} | slice {i() + 1}
              </span>
            )}
          </For>
        </div>

        <p class="label mt-4 mb-2" style={{ color: 'var(--accent)' }}>
          NEAREST-EXPIRY SMILE (fitted IV %, moneyness −50%..+50%)
        </p>
        <canvas id="svi-smile" class="w-full" style={{ height: '200px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          w(k) = a + b·(ρ(k−m) + √((k−m)² + σ²)) | IV = √(w/T) | heatmap rows = expiries (near→far),
          cols = moneyness (−50%..+50%)
        </p>
      </Show>
    </div>
  );
}

import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeTicker } from '../../../lib/etf-store';
import { getWasmMod } from '../../../lib/wasm-loader';

const ETF_OPTIONS = ['SPY', 'QQQ', 'VTI', 'IWM', 'GLD', 'TLT', 'XLK', 'XLV'] as const;

interface Holding {
  ticker: string;
  weight: number;
}

const SYNTHETIC_HOLDINGS: Record<string, Holding[]> = {
  SPY: [
    { ticker: 'AAPL', weight: 0.065 },
    { ticker: 'MSFT', weight: 0.06 },
    { ticker: 'NVDA', weight: 0.055 },
    { ticker: 'AMZN', weight: 0.035 },
    { ticker: 'GOOGL', weight: 0.022 },
    { ticker: 'META', weight: 0.02 },
    { ticker: 'TSLA', weight: 0.018 },
    { ticker: 'BRK.B', weight: 0.017 },
    { ticker: 'AVGO', weight: 0.015 },
    { ticker: 'UNH', weight: 0.012 },
    { ticker: 'XOM', weight: 0.012 },
    { ticker: 'JNJ', weight: 0.011 },
    { ticker: 'JPM', weight: 0.011 },
    { ticker: 'V', weight: 0.01 },
    { ticker: 'PG', weight: 0.01 },
    { ticker: 'MA', weight: 0.009 },
    { ticker: 'HD', weight: 0.009 },
    { ticker: 'CVX', weight: 0.008 },
    { ticker: 'MRK', weight: 0.008 },
    { ticker: 'ABBV', weight: 0.008 },
  ],
  QQQ: [
    { ticker: 'AAPL', weight: 0.09 },
    { ticker: 'MSFT', weight: 0.082 },
    { ticker: 'NVDA', weight: 0.078 },
    { ticker: 'AMZN', weight: 0.045 },
    { ticker: 'GOOGL', weight: 0.04 },
    { ticker: 'META', weight: 0.038 },
    { ticker: 'AVGO', weight: 0.034 },
    { ticker: 'TSLA', weight: 0.03 },
    { ticker: 'COST', weight: 0.022 },
    { ticker: 'PEP', weight: 0.018 },
    { ticker: 'ADBE', weight: 0.017 },
    { ticker: 'NFLX', weight: 0.016 },
    { ticker: 'AMD', weight: 0.015 },
    { ticker: 'INTC', weight: 0.014 },
    { ticker: 'QCOM', weight: 0.013 },
    { ticker: 'TXN', weight: 0.012 },
    { ticker: 'AMGN', weight: 0.011 },
    { ticker: 'ISRG', weight: 0.01 },
    { ticker: 'CSCO', weight: 0.01 },
    { ticker: 'AMAT', weight: 0.009 },
  ],
  VTI: [
    { ticker: 'AAPL', weight: 0.06 },
    { ticker: 'MSFT', weight: 0.056 },
    { ticker: 'NVDA', weight: 0.051 },
    { ticker: 'AMZN', weight: 0.032 },
    { ticker: 'GOOGL', weight: 0.02 },
    { ticker: 'META', weight: 0.018 },
    { ticker: 'TSLA', weight: 0.016 },
    { ticker: 'BRK.B', weight: 0.015 },
    { ticker: 'UNH', weight: 0.011 },
    { ticker: 'XOM', weight: 0.011 },
    { ticker: 'JNJ', weight: 0.01 },
    { ticker: 'JPM', weight: 0.01 },
    { ticker: 'V', weight: 0.009 },
    { ticker: 'PG', weight: 0.009 },
    { ticker: 'MA', weight: 0.008 },
    { ticker: 'HD', weight: 0.008 },
    { ticker: 'CVX', weight: 0.007 },
    { ticker: 'MRK', weight: 0.007 },
    { ticker: 'ABBV', weight: 0.007 },
    { ticker: 'AVGO', weight: 0.011 },
  ],
  IWM: [
    { ticker: 'GME', weight: 0.02 },
    { ticker: 'AMC', weight: 0.018 },
    { ticker: 'BBBY', weight: 0.016 },
    { ticker: 'NOK', weight: 0.015 },
    { ticker: 'BB', weight: 0.014 },
    { ticker: 'SIRI', weight: 0.013 },
    { ticker: 'PLUG', weight: 0.012 },
    { ticker: 'CHWY', weight: 0.012 },
    { ticker: 'PTON', weight: 0.011 },
    { ticker: 'RKT', weight: 0.011 },
    { ticker: 'CVNA', weight: 0.01 },
    { ticker: 'RBLX', weight: 0.01 },
    { ticker: 'SOFI', weight: 0.009 },
    { ticker: 'UPST', weight: 0.009 },
    { ticker: 'LCID', weight: 0.009 },
    { ticker: 'SNAP', weight: 0.008 },
    { ticker: 'PINS', weight: 0.008 },
    { ticker: 'ROKU', weight: 0.008 },
    { ticker: 'ZM', weight: 0.007 },
    { ticker: 'ETSY', weight: 0.007 },
  ],
  GLD: [
    { ticker: 'NEM', weight: 0.09 },
    { ticker: 'GOLD', weight: 0.08 },
    { ticker: 'AEM', weight: 0.07 },
    { ticker: 'KGC', weight: 0.06 },
    { ticker: 'FNV', weight: 0.055 },
    { ticker: 'RGLD', weight: 0.05 },
    { ticker: 'PAAS', weight: 0.045 },
    { ticker: 'HL', weight: 0.04 },
    { ticker: 'CDE', weight: 0.035 },
    { ticker: 'ABX', weight: 0.035 },
    { ticker: 'WPM', weight: 0.03 },
    { ticker: 'SAND', weight: 0.025 },
    { ticker: 'BTG', weight: 0.02 },
    { ticker: 'NGD', weight: 0.02 },
    { ticker: 'AU', weight: 0.018 },
    { ticker: 'AUY', weight: 0.018 },
    { ticker: 'EGO', weight: 0.015 },
    { ticker: 'SSRM', weight: 0.015 },
    { ticker: 'GFI', weight: 0.012 },
    { ticker: 'EXK', weight: 0.012 },
  ],
  TLT: [
    { ticker: 'US10Y', weight: 0.15 },
    { ticker: 'US20Y', weight: 0.13 },
    { ticker: 'US30Y', weight: 0.12 },
    { ticker: 'US7Y', weight: 0.09 },
    { ticker: 'US5Y', weight: 0.06 },
    { ticker: 'US3Y', weight: 0.03 },
    { ticker: 'US2Y', weight: 0.02 },
    { ticker: 'BND', weight: 0.04 },
    { ticker: 'AGG', weight: 0.04 },
    { ticker: 'IEF', weight: 0.05 },
    { ticker: 'SHY', weight: 0.02 },
    { ticker: 'TLH', weight: 0.045 },
    { ticker: 'EDV', weight: 0.055 },
    { ticker: 'VGLT', weight: 0.045 },
    { ticker: 'SCHQ', weight: 0.03 },
    { ticker: 'GOVT', weight: 0.025 },
    { ticker: 'VGIT', weight: 0.02 },
    { ticker: 'SCHR', weight: 0.015 },
    { ticker: 'DFLT', weight: 0.01 },
    { ticker: 'PLW', weight: 0.01 },
  ],
  XLK: [
    { ticker: 'MSFT', weight: 0.18 },
    { ticker: 'AAPL', weight: 0.165 },
    { ticker: 'NVDA', weight: 0.14 },
    { ticker: 'AVGO', weight: 0.055 },
    { ticker: 'ADBE', weight: 0.04 },
    { ticker: 'CRM', weight: 0.035 },
    { ticker: 'ORCL', weight: 0.03 },
    { ticker: 'CSCO', weight: 0.028 },
    { ticker: 'AMD', weight: 0.025 },
    { ticker: 'ACN', weight: 0.024 },
    { ticker: 'TXN', weight: 0.022 },
    { ticker: 'INTC', weight: 0.02 },
    { ticker: 'QCOM', weight: 0.018 },
    { ticker: 'IBM', weight: 0.016 },
    { ticker: 'INTU', weight: 0.015 },
    { ticker: 'AMAT', weight: 0.014 },
    { ticker: 'MU', weight: 0.012 },
    { ticker: 'ADI', weight: 0.012 },
    { ticker: 'NOW', weight: 0.011 },
    { ticker: 'PYPL', weight: 0.01 },
  ],
  XLV: [
    { ticker: 'UNH', weight: 0.105 },
    { ticker: 'LLY', weight: 0.085 },
    { ticker: 'JNJ', weight: 0.075 },
    { ticker: 'MRK', weight: 0.06 },
    { ticker: 'ABBV', weight: 0.055 },
    { ticker: 'TMO', weight: 0.045 },
    { ticker: 'ABT', weight: 0.035 },
    { ticker: 'PFE', weight: 0.03 },
    { ticker: 'DHR', weight: 0.028 },
    { ticker: 'BMY', weight: 0.025 },
    { ticker: 'AMGN', weight: 0.024 },
    { ticker: 'GILD', weight: 0.022 },
    { ticker: 'ISRG', weight: 0.02 },
    { ticker: 'VEEV', weight: 0.018 },
    { ticker: 'CI', weight: 0.018 },
    { ticker: 'MDT', weight: 0.016 },
    { ticker: 'CVS', weight: 0.016 },
    { ticker: 'ELV', weight: 0.015 },
    { ticker: 'ZTS', weight: 0.014 },
    { ticker: 'REGN', weight: 0.013 },
  ],
};

interface CommonHolding {
  ticker: string;
  weight_a: number;
  weight_b: number;
}

interface OverlapResult {
  jaccard: number;
  weighted_overlap: number;
  common_count: number;
  a_count: number;
  b_count: number;
  union_count: number;
  common_holdings: CommonHolding[];
}

export default function FullOverlapMatrix() {
  const [secondTicker, setSecondTicker] = createSignal<string>('QQQ');
  const [_holdingsA, setHoldingsA] = createSignal<Holding[]>([]);
  const [_holdingsB, setHoldingsB] = createSignal<Holding[]>([]);
  const [result, setResult] = createSignal<OverlapResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function fetchHoldings(ticker: string): Promise<Holding[]> {
    try {
      const res = await fetch(`${apiBase()}/api/etf-holdings?ticker=${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const json = await res.json();
        const list: unknown = json?.holdings ?? json?.tickers ?? json;
        if (Array.isArray(list) && list.length > 0) {
          const parsed: Holding[] = list
            .map((h) => {
              if (typeof h === 'string') return { ticker: h, weight: 0 };
              const obj = h as {
                ticker?: string;
                symbol?: string;
                weight?: number;
                weight_pct?: number;
              };
              const t = obj.ticker ?? obj.symbol ?? '';
              const wgt =
                typeof obj.weight === 'number'
                  ? obj.weight
                  : typeof obj.weight_pct === 'number'
                    ? obj.weight_pct / 100
                    : 0;
              return { ticker: t, weight: wgt };
            })
            .filter((h) => !!h.ticker);
          if (parsed.length > 0) {
            const hasWeights = parsed.some((p) => p.weight > 0);
            if (!hasWeights) parsed.forEach((p) => (p.weight = 1 / parsed.length));
            return parsed;
          }
        }
      }
    } catch {
      // fall through to synthetic
    }
    return SYNTHETIC_HOLDINGS[ticker] ?? SYNTHETIC_HOLDINGS.SPY;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const a = activeTicker();
      const b = secondTicker();
      const [hA, hB] = await Promise.all([fetchHoldings(a), fetchHoldings(b)]);
      setHoldingsA(hA);
      setHoldingsB(hB);

      const wasmMod = await getWasmMod();
      const tickersA = hA.map((h) => h.ticker);
      const weightsA = new Float64Array(hA.map((h) => h.weight));
      const tickersB = hB.map((h) => h.ticker);
      const weightsB = new Float64Array(hB.map((h) => h.weight));
      const out = wasmMod.quant_full_overlap(
        tickersA.join(','),
        weightsA,
        tickersB.join(','),
        weightsB,
      );
      const parsed = JSON.parse(out);
      if (typeof parsed?.weighted_overlap !== 'number') throw new Error('Invalid overlap output');

      const common: CommonHolding[] = (
        Array.isArray(parsed.common_holdings) ? parsed.common_holdings : []
      ).map((h: { ticker?: string; weight_a?: number; weight_b?: number }) => ({
        ticker: h.ticker ?? '',
        weight_a: h.weight_a ?? 0,
        weight_b: h.weight_b ?? 0,
      }));

      setResult({
        jaccard: parsed.jaccard ?? 0,
        weighted_overlap: parsed.weighted_overlap ?? 0,
        common_count: parsed.common_count ?? 0,
        a_count: parsed.a_count ?? hA.length,
        b_count: parsed.b_count ?? hB.length,
        union_count: parsed.union_count ?? 0,
        common_holdings: common,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute overlap');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function overlapColor(w: number): string {
    if (w >= 0.6) return '#ff4081';
    if (w >= 0.3) return '#ffa726';
    return '#4caf50';
  }

  function overlapLabel(w: number): string {
    if (w >= 0.6) return 'REDUNDANT';
    if (w >= 0.3) return 'MODERATE';
    return 'DIVERSIFYING';
  }

  onMount(() => load());

  createEffect(() => {
    activeTicker();
    secondTicker();
    load();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          WEIGHTED HOLDINGS OVERLAP
        </p>
        <label class="flex items-center gap-2">
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            vs
          </span>
          <select
            class="font-mono text-[10px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={secondTicker()}
            onChange={(e) => setSecondTicker(e.currentTarget.value)}
          >
            <For each={[...ETF_OPTIONS]}>{(t) => <option value={t}>{t}</option>}</For>
          </select>
        </label>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing weighted overlap...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && result()} keyed>
        {(r) => (
          <>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div
                class="p-2 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {activeTicker()}
                </p>
                <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                  {r.a_count}
                </p>
              </div>
              <div
                class="p-2 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {secondTicker()}
                </p>
                <p class="font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
                  {r.b_count}
                </p>
              </div>
              <div
                class="p-2 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  COMMON
                </p>
                <p class="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {r.common_count}
                </p>
              </div>
              <div
                class="p-2 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  UNION
                </p>
                <p class="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {r.union_count}
                </p>
              </div>
            </div>

            <div
              class="p-3 border flex items-center justify-between gap-3 mb-3"
              style={{
                'border-color': overlapColor(r.weighted_overlap),
                background: `${overlapColor(r.weighted_overlap)}14`,
              }}
            >
              <div>
                <p
                  class="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  WEIGHTED OVERLAP
                </p>
                <p
                  class="font-mono text-2xl font-bold"
                  style={{ color: overlapColor(r.weighted_overlap) }}
                >
                  {(r.weighted_overlap * 100).toFixed(1)}%
                </p>
                <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                  Jaccard {(r.jaccard * 100).toFixed(1)}%
                </p>
              </div>
              <p
                class="font-mono text-xs font-bold"
                style={{ color: overlapColor(r.weighted_overlap) }}
              >
                {overlapLabel(r.weighted_overlap)}
              </p>
            </div>

            <Show when={r.common_holdings.length > 0}>
              <div class="overflow-x-auto border" style={{ 'border-color': 'var(--border)' }}>
                <table class="border-collapse w-full">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th
                        class="font-mono text-[9px] uppercase tracking-wider px-2 py-1 text-left"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Ticker
                      </th>
                      <th
                        class="font-mono text-[9px] uppercase tracking-wider px-2 py-1 text-right"
                        style={{ color: 'var(--accent)' }}
                      >
                        {activeTicker()}
                      </th>
                      <th
                        class="font-mono text-[9px] uppercase tracking-wider px-2 py-1 text-right"
                        style={{ color: 'var(--accent)' }}
                      >
                        {secondTicker()}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={r.common_holdings}>
                      {(h) => (
                        <tr style={{ 'border-top': '1px solid var(--border)' }}>
                          <td
                            class="font-mono text-[10px] px-2 py-1 font-bold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {h.ticker}
                          </td>
                          <td
                            class="font-mono text-[10px] px-2 py-1 text-right"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {(h.weight_a * 100).toFixed(2)}%
                          </td>
                          <td
                            class="font-mono text-[10px] px-2 py-1 text-right"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {(h.weight_b * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </>
        )}
      </Show>

      <p class="font-mono text-[10px] mt-3" style={{ color: 'var(--text-secondary)' }}>
        Jaccard = binary overlap | Weighted = position-size-adjusted | Red = redundant
      </p>
    </div>
  );
}

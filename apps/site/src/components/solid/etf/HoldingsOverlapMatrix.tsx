import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeTicker } from '../../../lib/etf-store';
import { getWasmMod } from '../../../lib/wasm-loader';

const ETF_OPTIONS = ['SPY', 'QQQ', 'VTI', 'IWM', 'GLD'] as const;

const SYNTHETIC_HOLDINGS: Record<string, string[]> = {
  SPY: [
    'AAPL',
    'MSFT',
    'NVDA',
    'GOOGL',
    'AMZN',
    'META',
    'TSLA',
    'BRK.B',
    'UNH',
    'XOM',
    'JNJ',
    'JPM',
    'V',
    'PG',
    'MA',
    'HD',
    'CVX',
    'MRK',
    'ABBV',
    'KO',
    'PEP',
    'COST',
    'AVGO',
    'BAC',
    'AMD',
    'ADBE',
    'CRM',
    'NFLX',
    'INTC',
    'TMO',
    'WMT',
    'PFE',
    'DIS',
    'LLY',
    'CSCO',
    'ACN',
    'ABT',
    'DHR',
    'ORCL',
    'MCD',
    'VZ',
    'NKE',
    'LIN',
    'WFC',
    'TXN',
    'IBM',
    'PM',
    'COP',
    'LOW',
    'GE',
  ],
  QQQ: [
    'AAPL',
    'MSFT',
    'NVDA',
    'GOOGL',
    'AMZN',
    'META',
    'TSLA',
    'AVGO',
    'COST',
    'PEP',
    'ADBE',
    'NFLX',
    'TMUS',
    'CMCSA',
    'INTC',
    'AMD',
    'QCOM',
    'TXN',
    'AMGN',
    'ISRG',
    'CSCO',
    'AMAT',
    'INTU',
    'PYPL',
    'ADP',
    'GILD',
    'SBUX',
    'BKNG',
    'MU',
    'CHTR',
    'MDLZ',
    'MAR',
    'LRCX',
    'NXPI',
    'ADI',
    'ORLY',
    'MCHP',
    'CSX',
    'SNPS',
    'CDW',
    'ANSS',
    'NTAP',
    'FISV',
    'CTAS',
    'PAYX',
    'KDP',
    'MRVL',
    'PCAR',
    'FTNT',
    'BIIB',
  ],
  VTI: [
    'AAPL',
    'MSFT',
    'NVDA',
    'GOOGL',
    'AMZN',
    'META',
    'TSLA',
    'BRK.B',
    'UNH',
    'XOM',
    'JNJ',
    'JPM',
    'V',
    'PG',
    'MA',
    'HD',
    'CVX',
    'MRK',
    'ABBV',
    'KO',
    'PEP',
    'COST',
    'AVGO',
    'BAC',
    'AMD',
    'ADBE',
    'CRM',
    'NFLX',
    'INTC',
    'TMO',
    'WMT',
    'PFE',
    'DIS',
    'LLY',
    'CSCO',
    'ACN',
    'ABT',
    'DHR',
    'ORCL',
    'MCD',
    'VZ',
    'NKE',
    'LIN',
    'WFC',
    'TXN',
    'IBM',
    'PM',
    'COP',
    'LOW',
    'GE',
  ],
  IWM: [
    'GME',
    'AMC',
    'BBBY',
    'KOSS',
    'NOK',
    'BB',
    'SIRI',
    'UA',
    'UAA',
    'FUBO',
    'PLUG',
    'CHWY',
    'PTON',
    'RKT',
    'CVNA',
    'RBLX',
    'NKLA',
    'SOFI',
    'UPST',
    'LCID',
    'PSTH',
    'DWAC',
    'SPCE',
    'APE',
    'CODA',
    'KODK',
    'GLUU',
    'ZNGA',
    'TWTR',
    'SNAP',
    'PINS',
    'ROKU',
    'ZM',
    'DOCU',
    'ETSY',
    'W',
    'WAY',
    'SQ',
    'CGC',
    'TLRY',
    'ACB',
    'SNDL',
    'PLNT',
    'OUT',
    'MGM',
    'WYNN',
    'CZR',
    'PENN',
    'DKNG',
    'DASH',
  ],
  GLD: [
    'NEM',
    'GOLD',
    'AEM',
    'KGC',
    'FNV',
    'RGLD',
    'PAAS',
    'HL',
    'CDE',
    'ABX',
    'GDX',
    'GDXJ',
    'SIL',
    'SILJ',
    'SGDM',
    'GLDM',
    'IAU',
    'AGQ',
    'UGL',
    'DGL',
    'DZZ',
    'BTG',
    'NGD',
    'AU',
    'AUY',
    'EGO',
    'WPM',
    'SAND',
    'SSRM',
    'FRES',
    'SBSW',
    'HMY',
    'SBGL',
    'HAR',
    'GFI',
    'TKRR',
    'RING',
    'JNUG',
    'JDST',
    'PLG',
    'EXK',
    'FSM',
    'WDO',
    'TGD',
    'NSRY',
    'MNGD',
    'GORO',
    'MVKA',
    'RDS',
    'AQG',
  ],
};

interface OverlapResult {
  jaccard: number;
  a_count: number;
  b_count: number;
  intersection: number;
  union: number;
}

export default function HoldingsOverlapMatrix() {
  const [secondTicker, setSecondTicker] = createSignal<string>('QQQ');
  const [holdingsA, setHoldingsA] = createSignal<string[]>([]);
  const [holdingsB, setHoldingsB] = createSignal<string[]>([]);
  const [result, setResult] = createSignal<OverlapResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function fetchHoldings(ticker: string): Promise<string[]> {
    try {
      const res = await fetch(`${apiBase()}/api/etf-holdings?ticker=${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const json = await res.json();
        const list: unknown = json?.holdings ?? json?.tickers ?? json;
        if (Array.isArray(list) && list.length > 0) {
          return list
            .map((h) =>
              typeof h === 'string'
                ? h
                : ((h as { ticker?: string; symbol?: string })?.ticker ??
                  (h as { symbol?: string })?.symbol ??
                  ''),
            )
            .filter((s): s is string => !!s);
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
      const out = wasmMod.quant_holdings_overlap(hA.join(','), hB.join(','));
      const parsed = JSON.parse(out) as OverlapResult;
      if (typeof parsed.jaccard !== 'number') throw new Error('invalid WASM output');
      setResult(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute overlap');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function overlapColor(j: number): string {
    if (j >= 0.6) return '#ff4081';
    if (j >= 0.3) return '#ffa726';
    return '#4caf50';
  }

  function overlapLabel(j: number): string {
    if (j >= 0.6) return 'REDUNDANT';
    if (j >= 0.3) return 'MODERATE';
    return 'DIVERSIFYING';
  }

  onMount(() => load());
  createEffect(() => {
    activeTicker();
    secondTicker();
    load();
  });

  const cardBorder = (active: boolean) => (active ? 'var(--accent)' : 'var(--border)');

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          HOLDINGS OVERLAP MATRIX
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
          Computing holdings overlap...
        </p>
      </Show>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && result()}>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div
            class="p-3 border"
            style={{ 'border-color': cardBorder(true), background: 'var(--bg-card)' }}
          >
            <p
              class="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              PRIMARY ETF
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {activeTicker()}
            </p>
            <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {holdingsA().length} holdings
            </p>
          </div>
          <div
            class="p-3 border"
            style={{
              'border-color': cardBorder(activeTicker() !== secondTicker()),
              background: 'var(--bg-card)',
            }}
          >
            <p
              class="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              COMPARISON ETF
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {secondTicker()}
            </p>
            <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {holdingsB().length} holdings
            </p>
          </div>
          <div
            class="p-3 border"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
          >
            <p
              class="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              INTERSECTION
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {result()?.intersection}
            </p>
            <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              shared names
            </p>
          </div>
          <div
            class="p-3 border"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
          >
            <p
              class="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              UNION
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {result()?.union}
            </p>
            <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              unique names
            </p>
          </div>
        </div>

        <div
          class="p-3 border flex items-center justify-between gap-3"
          style={{
            'border-color': overlapColor(result()?.jaccard),
            background: `${overlapColor(result()?.jaccard)}14`,
          }}
        >
          <div>
            <p
              class="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              JACCARD INDEX
            </p>
            <p
              class="font-mono text-2xl font-bold"
              style={{ color: overlapColor(result()?.jaccard) }}
            >
              {(result()?.jaccard * 100).toFixed(1)}%
            </p>
          </div>
          <p class="font-mono text-xs font-bold" style={{ color: overlapColor(result()?.jaccard) }}>
            {overlapLabel(result()?.jaccard)}
          </p>
        </div>
      </Show>

      <p class="font-mono text-[10px] mt-3" style={{ color: 'var(--text-secondary)' }}>
        Jaccard = intersection / union | red ≥ 60% (redundant) | green &lt; 30% (diversifying) |
        WASM set overlap
      </p>
    </div>
  );
}

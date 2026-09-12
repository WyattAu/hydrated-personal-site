import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const H = 300;

const ALTS = [
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'BNBUSDT', label: 'BNB' },
  { symbol: 'XRPUSDT', label: 'XRP' },
  { symbol: 'ADAUSDT', label: 'ADA' },
  { symbol: 'DOGEUSDT', label: 'DOGE' },
  { symbol: 'AVAXUSDT', label: 'AVAX' },
  { symbol: 'LINKUSDT', label: 'LINK' },
  { symbol: 'LTCUSDT', label: 'LTC' },
  { symbol: 'DOTUSDT', label: 'DOT' },
  { symbol: 'TRXUSDT', label: 'TRX' },
];

const COLS = ['BTC-30D', 'BTC-90D', 'ETH-30D', 'ETH-90D'];

async function fetchCloses(symbol: string): Promise<number[]> {
  const isCrypto = symbol.endsWith('USDT');
  try {
    if (isCrypto) {
      const res = await fetch(`/api/binance-klines?symbol=${symbol}&interval=1d&limit=120`);
      if (!res.ok) return [];
      const raw = await res.json();
      const k: (string | number)[][] = raw.data || raw;
      return k.map((r) => Number(r[4])).filter((n) => Number.isFinite(n));
    }
    const res = await fetch(
      `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=6mo&interval=1d`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
    return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
  } catch {
    return [];
  }
}

function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

function beta(a: number[], b: number[], window: number): number {
  const n = Math.min(a.length, b.length);
  const win = Math.min(window, n);
  if (win < 5) return 0;
  const aa = a.slice(a.length - win);
  const bb = b.slice(b.length - win);
  const ma = aa.reduce((x, y) => x + y, 0) / aa.length;
  const mb = bb.reduce((x, y) => x + y, 0) / bb.length;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < aa.length; i++) {
    const da = aa[i] - ma;
    const db = bb[i] - mb;
    cov += da * db;
    varB += db * db;
  }
  return varB === 0 ? 0 : cov / varB;
}

export default function BetaMatrix() {
  const [grid, setGrid] = createSignal<{ label: string; cells: number[] }[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const all = [
        ...ALTS,
        { symbol: 'BTCUSDT', label: 'BTC' },
        { symbol: 'ETHUSDT', label: 'ETH' },
        { symbol: 'SPY', label: 'SPY' },
      ];
      const settled = await Promise.allSettled(
        all.map(async (a) => ({ label: a.label, rets: logReturns(await fetchCloses(a.symbol)) })),
      );
      const map = new Map<string, number[]>();
      for (const r of settled)
        if (r.status === 'fulfilled' && r.value.rets.length >= 30)
          map.set(r.value.label, r.value.rets);
      const btc = map.get('BTC');
      const eth = map.get('ETH');
      if (!btc || !eth) throw new Error('No benchmark');

      const rows: { label: string; cells: number[] }[] = [];
      for (const alt of ALTS) {
        const a = map.get(alt.label);
        if (!a) continue;
        rows.push({
          label: alt.label,
          cells: [beta(a, btc, 30), beta(a, btc, 90), beta(a, eth, 30), beta(a, eth, 90)],
        });
      }
      if (rows.length === 0) throw new Error('No data');
      setGrid(rows);
      setChartMetaState('beta-matrix', { freshAt: Date.now(), error: null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
      setChartMetaState('beta-matrix', {
        error: e instanceof Error ? e.message : 'Failed',
      });
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const rows = grid();
    if (!rows) return;
    const matrix: number[][] = rows.map((r) => r.cells);
    renderPlychart('beta-matrix', 'update_heatmap_div', JSON.stringify(matrix), '0', '');
  }

  createEffect(() => {
    grid();
    renderChart();
  });

  usePlychartAuto(() => 'beta-matrix', renderChart);

  onMount(() => {
    attachChartMeta('beta-matrix', {
      source: 'OKX/Kraken + Yahoo Finance',
      detail: '30d/90d rolling beta',
    });
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        BETA MATRIX
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing betas...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <div class="grid" style={{ 'grid-template-columns': '3rem 1fr', 'column-gap': '6px' }}>
        {/* corner spacer */}
        <span />
        {/* column labels above the canvas */}
        <div class="grid grid-cols-4 pb-1" style={{ 'align-items': 'end' }}>
          {COLS.map((c) => (
            <span
              class="font-mono text-[9px] text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              {c}
            </span>
          ))}
        </div>
        {/* row labels to the left of the canvas, split evenly like the heatmap rows */}
        <div
          class="grid"
          style={{
            'grid-template-rows': `repeat(${grid()?.length ?? 1}, 1fr)`,
            'align-items': 'center',
            height: `${H}px`,
          }}
        >
          <For each={grid()}>
            {(row) => (
              <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                {row.label}
              </span>
            )}
          </For>
        </div>
        <canvas id="beta-matrix" class="w-full" style={{ height: `${H}px` }} />
      </div>
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        10 alts vs BTC + ETH | 30d / 90d rolling beta | log returns
      </p>
    </div>
  );
}

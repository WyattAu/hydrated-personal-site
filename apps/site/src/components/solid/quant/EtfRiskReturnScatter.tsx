import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import {
  attachPlychartTooltip,
  renderPlychart,
  setChartLabels,
  usePlychartAuto,
} from '../../../lib/plychart-render';

interface EtfEntry {
  ticker: string;
  name?: string;
}

interface ScatterPoint {
  ticker: string;
  ret: number;
  risk: number;
  sharpe: number;
  volume: number;
}

interface ChartResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{ close: Array<number | null>; volume?: Array<number | null> }>;
      };
      meta?: { regularMarketVolume?: number };
    }>;
  };
  error?: unknown;
}

const BATCH = 20;
const MAX_FETCH = 40;
const PLOT_TOP_N = 20;
const RISK_FREE = 0.04;

export default function EtfRiskReturnScatter() {
  const [points, setPoints] = createSignal<ScatterPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const dbRes = await fetch('/data/etf-database.json');
      if (!dbRes.ok) throw new Error('etf database unavailable');
      const db: EtfEntry[] = await dbRes.json();
      const tickers = db.map((e) => e.ticker).filter((t, i, arr) => arr.indexOf(t) === i);
      const toFetch = tickers.slice(0, MAX_FETCH);

      const fetched: ScatterPoint[] = [];
      for (let i = 0; i < toFetch.length; i += BATCH) {
        const slice = toFetch.slice(i, i + BATCH);
        const settled = await Promise.allSettled(slice.map((t) => fetchOne(t)));
        for (const s of settled) {
          if (s.status === 'fulfilled' && s.value) fetched.push(s.value);
        }
      }

      if (fetched.length === 0) throw new Error('no chart data');

      // Rank by volume, take top N for clarity.
      fetched.sort((a, b) => b.volume - a.volume);
      setPoints(fetched.slice(0, PLOT_TOP_N));
      setChartMetaState('risk-return-scatter', { freshAt: Date.now(), error: null });
    } catch (e) {
      setChartMetaState('risk-return-scatter', {
        error: e instanceof Error ? e.message : 'load failed',
      });
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOne(ticker: string): Promise<ScatterPoint | null> {
    try {
      const res = await fetch(`${apiBase()}/api/stock-chart?symbol=${ticker}&range=1y&interval=1d`);
      if (!res.ok) return null;
      const json: ChartResponse = await res.json();
      if (json.error) return null;
      const result = json.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c): c is number => c != null);
      if (closes.length < 30) return null;
      const volume = Number(result?.meta?.regularMarketVolume ?? 0) || 0;

      // Annualised log return + stdev from daily closes.
      const rets: number[] = [];
      for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1);
      const annReturn = mean * 252;
      const annStdev = Math.sqrt(variance) * Math.sqrt(252);
      if (!Number.isFinite(annStdev) || annStdev <= 0) return null;
      const sharpe = (annReturn - RISK_FREE) / annStdev;
      return { ticker, ret: annReturn, risk: annStdev, sharpe, volume };
    } catch {
      return null;
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const pts = points();
    if (pts.length === 0) return;
    const scatterData: [number, number][] = pts.map((p) => [p.risk, p.ret]);
    // color based on avg Sharpe (computed for potential theme use)
    const avgSharpe = pts.reduce((s, p) => s + p.sharpe, 0) / pts.length;
    const _color = avgSharpe > 1 ? '#4ade80' : avgSharpe > 0 ? '#c8a23c' : '#ff4081';
    void _color;
    tipData = scatterData;
    renderPlychart('risk-return-scatter', 'update_scatter', JSON.stringify(scatterData), '');
  }

  createEffect(() => {
    points();
    renderChart();
  });

  usePlychartAuto(() => 'risk-return-scatter', renderChart);

  onMount(() => {
    attachChartMeta('risk-return-scatter', {
      source: 'etf-database + Yahoo 1y',
      detail: 'top-N by volume · Sharpe rf 4%',
    });
    setChartLabels('risk-return-scatter', { xUnit: 'vol %', yUnit: 'return %' });
    loadData();
    const disposeTip = attachPlychartTooltip('risk-return-scatter', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          RISK / RETURN SCATTER
        </p>
        <Show
          when={!loading()}
          fallback={
            <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              COMPUTING...
            </span>
          }
        >
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {points().length} ETFs
          </span>
        </Show>
      </div>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas id="risk-return-scatter" class="w-full" style={{ height: '360px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        1y daily returns | colour = Sharpe (rf 4%) | top {PLOT_TOP_N} by volume
      </p>
    </div>
  );
}

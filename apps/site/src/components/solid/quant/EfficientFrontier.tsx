import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import {
  attachPlychartTooltip,
  renderPlychart,
  setChartLabels,
  usePlychartAuto,
} from '../../../lib/plychart-render';

interface PortfolioPoint {
  ret: number;
  risk: number;
  sharpe: number;
}

export default function EfficientFrontier() {
  const [points, setPoints] = createSignal<PortfolioPoint[]>([]);
  const [frontier, setFrontier] = createSignal<PortfolioPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const assets = [
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'BNBUSDT',
        'XRPUSDT',
        'ADAUSDT',
        'DOGEUSDT',
        'AVAXUSDT',
      ];
      const allReturns: number[] = [];
      let nPeriods = 0;
      for (const sym of assets) {
        const res = await fetch(`/api/binance-klines?symbol=${sym}&interval=1d&limit=90`);
        if (!res.ok) continue;
        const _raw = await res.json();
        const klines = _raw.data || _raw;
        const closes = klines.map((k: (string | number)[]) => Number.parseFloat(k[4] as string));
        if (closes.length < 30) continue;
        nPeriods = closes.length - 1;
        for (let i = 1; i < closes.length; i++) {
          allReturns.push(Math.log(closes[i] / closes[i - 1]));
        }
      }
      const nAssets = assets.length;
      if (nPeriods < 10 || allReturns.length < nAssets * nPeriods) {
        throw new Error('insufficient data');
      }

      // Compute covariance and mean
      const means: number[] = [];
      for (let i = 0; i < nAssets; i++) {
        let sum = 0;
        for (let t = 0; t < nPeriods; t++) sum += allReturns[i * nPeriods + t];
        means.push((sum / nPeriods) * 252);
      }

      // Generate random portfolios (simplified client-side)
      const randPts: PortfolioPoint[] = [];
      for (let p = 0; p < 5000; p++) {
        const weights: number[] = [];
        let sum = 0;
        for (let i = 0; i < nAssets; i++) {
          const w = Math.random();
          weights.push(w);
          sum += w;
        }
        weights.forEach((w, i) => {
          weights[i] = w / sum;
        });

        let ret = 0;
        for (let i = 0; i < nAssets; i++) ret += weights[i] * means[i];

        let variance = 0;
        for (let i = 0; i < nAssets; i++) {
          for (let j = 0; j < nAssets; j++) {
            // Simplified covariance using historical correlation
            const iRets = Array.from({ length: nPeriods }, (_, t) => allReturns[i * nPeriods + t]);
            const jRets = Array.from({ length: nPeriods }, (_, t) => allReturns[j * nPeriods + t]);
            const iMean = iRets.reduce((a, b) => a + b, 0) / nPeriods;
            const jMean = jRets.reduce((a, b) => a + b, 0) / nPeriods;
            let cov = 0;
            for (let t = 0; t < nPeriods; t++) cov += (iRets[t] - iMean) * (jRets[t] - jMean);
            cov /= nPeriods - 1;
            variance += weights[i] * weights[j] * cov * 252;
          }
        }
        const risk = Math.sqrt(Math.max(0, variance));
        const sharpe = risk > 0 ? (ret - 0.04) / risk : 0;
        randPts.push({ ret: ret * 100, risk: risk * 100, sharpe });
      }
      setPoints(randPts);

      // Sort by risk for frontier (upper envelope)
      const sorted = [...randPts].sort((a, b) => a.risk - b.risk);
      const eff: PortfolioPoint[] = [];
      let maxRet = Number.NEGATIVE_INFINITY;
      for (const p of sorted) {
        if (p.ret > maxRet) {
          eff.push(p);
          maxRet = p.ret;
        }
      }
      setFrontier(eff);
      setChartMetaState('efficient-frontier', { freshAt: Date.now(), error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      setChartMetaState('efficient-frontier', { error: msg });
    } finally {
      setLoading(false);
    }
  }

  let tipData: object[] = [];

  function renderChart() {
    const pts = points();
    if (pts.length === 0) return;

    const series = [
      { color: '#666666', points: pts.map((p) => [p.risk, p.ret]) },
      {
        color: '#00e5ff',
        points: frontier().map((p) => [p.risk, p.ret]),
      },
    ];
    tipData = series[0].points;

    renderPlychart('efficient-frontier', 'update_scatter_multi', JSON.stringify(series), '');
  }

  createEffect(() => {
    points();
    renderChart();
  });

  usePlychartAuto(() => 'efficient-frontier', renderChart);

  const tangency = () => {
    const pts = points();
    if (pts.length === 0) return null;
    return pts.reduce((a, b) => (a.sharpe > b.sharpe ? a : b));
  };

  onMount(() => {
    attachChartMeta('efficient-frontier', {
      source: 'Binance',
      detail: '90d daily · 5000 random portfolios',
    });
    setChartLabels('efficient-frontier', { xUnit: 'vol %', yUnit: 'return %' });
    loadData();
    const disposeTip = attachPlychartTooltip('efficient-frontier', () => JSON.stringify(tipData));
    onCleanup(disposeTip);
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          EFFICIENT FRONTIER
        </p>
        <Show
          when={loading()}
          fallback={
            <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {points().length} portfolios
            </span>
          }
        >
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            OPTIMIZING...
          </span>
        </Show>
      </div>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas id="efficient-frontier" class="w-full" style={{ height: '360px' }} />
      <Show when={tangency()} keyed>
        {(tan) => (
          <p class="font-mono text-[10px] mt-1" style={{ color: 'var(--accent-warm)' }}>
            ★ MAX SHARPE: {tan.ret.toFixed(1)}% ret @ {tan.risk.toFixed(1)}% risk (sharpe{' '}
            {tan.sharpe.toFixed(2)})
          </p>
        )}
      </Show>
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: '#666666' }}>■</span> random portfolios{' '}
        <span style={{ color: '#00e5ff' }}>■</span> efficient frontier | 5000 portfolios | 8 assets
        | 90d daily returns | risk-free 4%
      </p>
    </div>
  );
}

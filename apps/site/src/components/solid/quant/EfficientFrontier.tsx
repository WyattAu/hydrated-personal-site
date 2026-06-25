import { Show, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

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
  let canvasRef: HTMLCanvasElement | undefined;

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
        weights.forEach((w, i) => (weights[i] = w / sum));

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || points().length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 360 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 360;
    const colors = getThemeColors();
    const pad = { l: 50, r: 16, t: 16, b: 36 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pts = points();
    const allRisk = pts.map((p) => p.risk);
    const allRet = pts.map((p) => p.ret);
    const minR = Math.min(...allRisk);
    const maxR = Math.max(...allRisk);
    const minRet = Math.min(...allRet);
    const maxRet = Math.max(...allRet);
    const rangeR = maxR - minR || 1;
    const rangeRet = maxRet - minRet || 1;
    const padR = rangeR * 0.05;
    const padRet = rangeRet * 0.05;

    const toX = (v: number) => pad.l + ((v - minR + padR) / (rangeR + 2 * padR)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minRet + padRet) / (rangeRet + 2 * padRet)) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + (cH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${(maxRet + padRet - ((rangeRet + 2 * padRet) * i) / 5).toFixed(0)}%`,
        pad.l - 5,
        y + 3,
      );
      const x = pad.l + (cW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, h - pad.b);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(minR + padR + ((rangeR + 2 * padR) * i) / 5).toFixed(0)}%`,
        x,
        h - pad.b + 14,
      );
    }

    // Scatter points
    for (const p of pts) {
      const intensity = Math.max(0, Math.min(1, (p.sharpe + 1) / 3));
      const r = Math.floor(0 + intensity * 0);
      const g = Math.floor(100 + intensity * 155);
      const b = Math.floor(150 + intensity * 105);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(toX(p.risk), toY(p.ret), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Efficient frontier
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    frontier().forEach((p, i) => {
      i === 0 ? ctx.moveTo(toX(p.risk), toY(p.ret)) : ctx.lineTo(toX(p.risk), toY(p.ret));
    });
    ctx.stroke();

    // Tangency portfolio (max Sharpe)
    const tan = pts.reduce((a, b) => (a.sharpe > b.sharpe ? a : b));
    ctx.fillStyle = colors.accentWarm || '#f0883e';
    ctx.beginPath();
    ctx.arc(toX(tan.risk), toY(tan.ret), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.accent || '#00e5ff';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MAX SHARPE', toX(tan.risk) + 8, toY(tan.ret) - 5);

    // Axis labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RISK (annualized std dev)', w / 2, h - 4);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('RETURN (annualized)', 0, 0);
    ctx.restore();
  }

  onMount(() => {
    loadData();
  });
  const pts = points();
  if (pts.length > 0) setTimeout(draw, 10);

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
      <canvas ref={canvasRef} class="w-full" style={{ height: '360px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        5000 random portfolios | 8 assets | 90d daily returns | risk-free 4%
      </p>
    </div>
  );
}

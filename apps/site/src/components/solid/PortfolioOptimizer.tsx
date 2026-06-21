import { For, Show, createEffect, createSignal } from 'solid-js';
import { getThemeColors } from '../../lib/theme-colors';
import type { EtfEntry } from '../../lib/types';

interface PortfolioOptimizerProps {
  selectedEtfs: EtfEntry[];
}

interface OptimizationResult {
  name: string;
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

function equalWeight(n: number): number[] {
  return Array(n).fill(1 / n);
}

function minimumVariance(
  returns: number[],
  _n: number,
): { weights: number[]; volatility: number; expectedReturn: number } {
  // Simplified: inverse-volatility weighting
  const vols = returns.map((r) => Math.abs(r) + 0.01);
  const invVolSum = vols.reduce((s, v) => s + 1 / v, 0);
  const weights = vols.map((v) => 1 / v / invVolSum);
  const portfolioReturn = weights.reduce((s, w, i) => s + w * returns[i], 0);
  const portfolioVol = Math.sqrt(weights.reduce((s, w, i) => s + w * w * vols[i] * vols[i], 0));
  return { weights, volatility: portfolioVol, expectedReturn: portfolioReturn };
}

function riskParity(
  returns: number[],
  _n: number,
): { weights: number[]; volatility: number; expectedReturn: number } {
  const vols = returns.map((r) => Math.abs(r) + 0.01);
  const totalInvVol = vols.reduce((s, v) => s + 1 / v, 0);
  const weights = vols.map((v) => 1 / v / totalInvVol);
  const portfolioReturn = weights.reduce((s, w, i) => s + w * returns[i], 0);
  const portfolioVol = Math.sqrt(weights.reduce((s, w, i) => s + w * w * vols[i] * vols[i], 0));
  return { weights, volatility: portfolioVol, expectedReturn: portfolioReturn };
}

function estimateReturns(etf: EtfEntry): number {
  // Simulated annualized return based on category
  const categoryReturns: Record<string, number> = {
    'US Equity': 0.1,
    'International Equity': 0.07,
    'Fixed Income': 0.03,
    'Real Estate': 0.08,
    Commodities: 0.05,
    Crypto: 0.3,
    Thematic: 0.12,
    Factor: 0.09,
    ESG: 0.08,
    Sector: 0.11,
  };
  return categoryReturns[etf.category] || 0.08;
}

function estimateVolatility(etf: EtfEntry): number {
  const categoryVols: Record<string, number> = {
    'US Equity': 0.16,
    'International Equity': 0.18,
    'Fixed Income': 0.05,
    'Real Estate': 0.2,
    Commodities: 0.22,
    Crypto: 0.65,
    Thematic: 0.25,
    Factor: 0.17,
    ESG: 0.16,
    Sector: 0.2,
  };
  return categoryVols[etf.category] || 0.18;
}

const COLORS = [
  '#00e5ff',
  '#69f0ae',
  '#ff9800',
  '#b388ff',
  '#f44336',
  '#ffff00',
  '#e91e63',
  '#4caf50',
  '#2196f3',
  '#ff5722',
];

function drawPieChart(canvas: HTMLCanvasElement, weights: number[], _tickers: string[]) {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.clientWidth, 300);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  let start = -Math.PI / 2;

  weights.forEach((w, i) => {
    const angle = w * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    // Label
    if (w > 0.03) {
      const mid = start + angle / 2;
      const lx = cx + Math.cos(mid) * (radius * 0.65);
      const ly = cy + Math.sin(mid) * (radius * 0.65);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(w * 100).toFixed(0)}%`, lx, ly);
    }

    start += angle;
  });
}

function ResultCard(props: { result: OptimizationResult; tickers: string[] }) {
  let canvasRef: HTMLCanvasElement | undefined;

  createEffect(() => {
    if (canvasRef) {
      drawPieChart(canvasRef, props.result.weights, props.tickers);
    }
  });

  return (
    <div
      class="p-4 border"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <p
        class="font-mono text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: 'var(--accent)' }}
      >
        {props.result.name}
      </p>

      <div class="flex justify-center mb-3">
        <canvas ref={canvasRef} role="img" aria-label={`Pie chart for ${props.result.name}`} />
      </div>

      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="text-center">
          <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            RETURN
          </p>
          <p class="font-mono text-sm font-bold" style={{ color: '#69f0ae' }}>
            {(props.result.expectedReturn * 100).toFixed(1)}%
          </p>
        </div>
        <div class="text-center">
          <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            VOLATILITY
          </p>
          <p class="font-mono text-sm font-bold" style={{ color: '#ff9800' }}>
            {(props.result.volatility * 100).toFixed(1)}%
          </p>
        </div>
        <div class="text-center">
          <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            SHARPE
          </p>
          <p class="font-mono text-sm font-bold" style={{ color: '#b388ff' }}>
            {props.result.volatility > 0
              ? (props.result.expectedReturn / props.result.volatility).toFixed(2)
              : '---'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div class="grid grid-cols-2 gap-1">
        <For each={props.tickers}>
          {(ticker, i) => (
            <div
              class="flex items-center gap-1 font-mono text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                class="inline-block w-2 h-2"
                style={{ background: COLORS[i() % COLORS.length] }}
              />
              <span>{ticker}</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {(props.result.weights[i()] * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default function PortfolioOptimizer(props: PortfolioOptimizerProps) {
  const [results, setResults] = createSignal<OptimizationResult[]>([]);

  const accentColor = () => {
    if (typeof document === 'undefined') return '#00e5ff';
    return getThemeColors().accent || '#00e5ff';
  };

  createEffect(() => {
    const etfs = props.selectedEtfs;
    if (etfs.length < 2) {
      setResults([]);
      return;
    }

    const n = etfs.length;
    const returns = etfs.map((e) => estimateReturns(e));
    const avgReturn = returns.reduce((s, r) => s + r, 0) / n;
    const avgVol = Math.sqrt(
      returns.reduce((s, r) => s + estimateVolatility(etfs[returns.indexOf(r)]) ** 2, 0) / n,
    );

    // Equal weight
    const eqWeights = equalWeight(n);
    const eqReturn = avgReturn;
    const eqVol = avgVol;

    // Min variance
    const mv = minimumVariance(
      etfs.map((e) => estimateVolatility(e)),
      n,
    );

    // Risk parity
    const rp = riskParity(
      etfs.map((e) => estimateVolatility(e)),
      n,
    );

    setResults([
      {
        name: 'Equal Weight',
        weights: eqWeights,
        expectedReturn: eqReturn,
        volatility: eqVol,
        sharpeRatio: eqVol > 0 ? eqReturn / eqVol : 0,
      },
      {
        name: 'Minimum Variance',
        weights: mv.weights,
        expectedReturn: mv.expectedReturn,
        volatility: mv.volatility,
        sharpeRatio: mv.volatility > 0 ? mv.expectedReturn / mv.volatility : 0,
      },
      {
        name: 'Risk Parity',
        weights: rp.weights,
        expectedReturn: rp.expectedReturn,
        volatility: rp.volatility,
        sharpeRatio: rp.volatility > 0 ? rp.expectedReturn / rp.volatility : 0,
      },
    ]);
  });

  return (
    <div
      class="border p-6"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <p class="label mb-2" style={{ color: accentColor() }}>
        PORTFOLIO OPTIMIZER
      </p>
      <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Mean-variance optimization with {props.selectedEtfs.length} selected ETFs.
      </p>

      <Show when={props.selectedEtfs.length >= 2}>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <For each={results()}>
            {(result) => (
              <ResultCard result={result} tickers={props.selectedEtfs.map((e) => e.ticker)} />
            )}
          </For>
        </div>
      </Show>

      <Show when={props.selectedEtfs.length < 2}>
        <div class="text-center py-8 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Select at least 2 ETFs to run optimization
        </div>
      </Show>
    </div>
  );
}

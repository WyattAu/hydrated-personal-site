import { Show, createEffect, createSignal } from 'solid-js';
import type { EtfEntry, EtfPerformance } from '../../lib/types';

interface PerformanceMetricsProps {
  etf: EtfEntry;
}

function generatePerformance(ticker: string): EtfPerformance {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ((hash << 5) - hash + ticker.charCodeAt(i)) | 0;
  }
  const rand = () => {
    hash = (hash * 16807 + 0) % 2147483647;
    return (hash - 1) / 2147483646;
  };
  return {
    total_return: rand() * 60 - 10,
    annualized_return: rand() * 25 - 5,
    volatility: rand() * 30 + 5,
    sharpe_ratio: rand() * 3 - 0.5,
    max_drawdown: -(rand() * 40 + 2),
  };
}

function MetricCard(props: {
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
  negative?: boolean;
}) {
  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  return (
    <div
      class="p-4 border transition-colors"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
      role="status"
      aria-label={`${props.label}: ${props.value}`}
    >
      <p
        class="font-mono font-bold tracking-wider mb-1"
        style={{
          color: 'var(--text-secondary)',
          fontSize: '9px',
          letterSpacing: '0.3em',
        }}
      >
        {props.label.toUpperCase()}
      </p>
      <p
        class="font-mono text-xl font-bold"
        style={{
          color:
            props.color || props.negative
              ? props.negative
                ? '#f44336'
                : props.color || accentColor()
              : 'var(--text-primary)',
        }}
      >
        {props.value}
      </p>
      <Show when={props.sublabel}>
        <p class="font-mono text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {props.sublabel}
        </p>
      </Show>
    </div>
  );
}

export default function PerformanceMetrics(props: PerformanceMetricsProps) {
  const [perf, setPerf] = createSignal<EtfPerformance | null>(null);

  createEffect(() => {
    setPerf(generatePerformance(props.etf.ticker));
  });

  const formatPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const formatRatio = (v: number) => v.toFixed(2);
  const formatDrawdown = (v: number) => `${v.toFixed(2)}%`;

  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  return (
    <div
      class="border p-6"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <div class="flex items-center justify-between mb-4">
        <p class="label" style={{ color: accentColor() }}>
          PERFORMANCE METRICS
        </p>
        <span class="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          {props.etf.ticker} — Simulated
        </span>
      </div>

      <Show when={perf()}>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Total Return"
            value={formatPct(perf()?.total_return)}
            color={perf()?.total_return >= 0 ? '#69f0ae' : '#f44336'}
          />
          <MetricCard
            label="Annualized Return"
            value={formatPct(perf()?.annualized_return)}
            color={perf()?.annualized_return >= 0 ? '#69f0ae' : '#f44336'}
          />
          <MetricCard
            label="Volatility"
            value={`${perf()?.volatility.toFixed(2)}%`}
            sublabel="Annualized std dev"
          />
          <MetricCard
            label="Sharpe Ratio"
            value={formatRatio(perf()?.sharpe_ratio)}
            color={
              perf()?.sharpe_ratio >= 1
                ? '#69f0ae'
                : perf()?.sharpe_ratio >= 0
                  ? accentColor()
                  : '#f44336'
            }
            sublabel="Risk-adjusted return"
          />
          <MetricCard
            label="Max Drawdown"
            value={formatDrawdown(perf()?.max_drawdown)}
            negative
            sublabel="Peak to trough"
          />
        </div>
      </Show>
    </div>
  );
}

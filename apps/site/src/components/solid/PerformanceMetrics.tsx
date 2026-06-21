import { Show, createEffect, createSignal } from 'solid-js';
import { getThemeColors } from '../../lib/theme-colors';
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
    const v = getThemeColors().accent;
    return v || '#00e5ff';
  };

  return (
    <output
      class="p-4 border block transition-colors"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
      aria-label={`${props.label}: ${props.value}`}
    >
      <p
        class="font-mono font-bold tracking-wider mb-1"
        style={{
          color: 'var(--text-secondary)',
          'font-size': '9px',
          'letter-spacing': '0.3em',
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
    </output>
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
    const v = getThemeColors().accent;
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
            value={formatPct(perf()?.total_return ?? 0)}
            color={(perf()?.total_return ?? 0) >= 0 ? '#69f0ae' : '#f44336'}
          />
          <MetricCard
            label="Annualized Return"
            value={formatPct(perf()?.annualized_return ?? 0)}
            color={(perf()?.annualized_return ?? 0) >= 0 ? '#69f0ae' : '#f44336'}
          />
          <MetricCard
            label="Volatility"
            value={`${(perf()?.volatility ?? 0).toFixed(2)}%`}
            sublabel="Annualized std dev"
          />
          <MetricCard
            label="Sharpe Ratio"
            value={formatRatio(perf()?.sharpe_ratio ?? 0)}
            color={
              (perf()?.sharpe_ratio ?? 0) >= 1
                ? '#69f0ae'
                : (perf()?.sharpe_ratio ?? 0) >= 0
                  ? accentColor()
                  : '#f44336'
            }
            sublabel="Risk-adjusted return"
          />
          <MetricCard
            label="Max Drawdown"
            value={formatDrawdown(perf()?.max_drawdown ?? 0)}
            negative
            sublabel="Peak to trough"
          />
        </div>
      </Show>

      <div
        class="mt-4 p-3 border"
        style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <p
          class="font-mono text-[10px] font-bold tracking-wider"
          style={{ color: 'var(--accent-warm)' }}
        >
          SIMULATED DATA — Not financial advice
        </p>
        <p class="font-mono text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Performance metrics are randomly generated for demonstration purposes only.
        </p>
      </div>
    </div>
  );
}

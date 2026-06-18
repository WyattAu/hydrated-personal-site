import { For, Show, createSignal, createEffect, onMount } from 'solid-js';
import { exportToCsv } from '../../lib/csv-export';
import type { EtfEntry } from '../../lib/types';
import CorrelationMatrix from './CorrelationMatrix';
import EtfDetail from './EtfDetail';
import PerformanceMetrics from './PerformanceMetrics';
import PortfolioComparison from './PortfolioComparison';
import PortfolioOptimizer from './PortfolioOptimizer';
import SearchBar from './SearchBar';

export default function EtfApp() {
  const [database, setDatabase] = createSignal<EtfEntry[]>([]);
  const [selectedEtf, setSelectedEtf] = createSignal<EtfEntry | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [selectedForOpt, setSelectedForOpt] = createSignal<EtfEntry[]>([]);

  onMount(async () => {
    try {
      const res = await fetch('/data/etf-database.json');
      const data: EtfEntry[] = await res.json();
      setDatabase(data);
    } catch {
      setDatabase([]);
    }
    setLoading(false);
  });

  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  function handleExportCsv() {
    const data = database().map((etf) => ({
      ticker: etf.ticker,
      name: etf.name,
      category: etf.category,
      topSectors: Object.entries(etf.sector_allocation)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}%`)
        .join('; '),
      topHoldings: etf.top_holdings
        .slice(0, 3)
        .map((h) => `${h.ticker} (${h.weight}%)`)
        .join('; '),
    }));
    exportToCsv(data, 'etf-database');
  }

  function toggleOptSelected(etf: EtfEntry) {
    const current = selectedForOpt();
    const exists = current.find((e) => e.ticker === etf.ticker);
    if (exists) {
      setSelectedForOpt(current.filter((e) => e.ticker !== etf.ticker));
    } else if (current.length < 6) {
      setSelectedForOpt([...current, etf]);
    }
  }

  return (
    <div>
      {/* Search Bar */}
      <div class="mb-6">
        <Show when={!loading()}>
          <SearchBar database={database()} onSelect={setSelectedEtf} />
        </Show>
        <Show when={loading()}>
          <div
            class="w-full border px-4 py-3 font-mono text-sm"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              'max-width': '600px',
            }}
          >
            Loading ETF database...
          </div>
        </Show>
      </div>

      {/* Export + Optimize controls */}
      <Show when={!loading()}>
        <div class="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            class="border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            onClick={handleExportCsv}
          >
            Export CSV
          </button>
          <Show when={selectedForOpt().length > 0}>
            <span
              class="border px-4 py-2 font-mono text-xs"
              style={{
                'border-color': 'var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
              }}
            >
              {selectedForOpt().length}/6 ETFs selected for optimization
            </span>
            <button
              type="button"
              class="border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors"
              style={{
                'border-color': accentColor(),
                background: 'var(--bg-card)',
                color: accentColor(),
              }}
              onClick={() => setSelectedForOpt([])}
            >
              Clear
            </button>
          </Show>
        </div>
      </Show>

      {/* Selected ETF Detail */}
      <Show when={selectedEtf()}>
        <div class="mb-8">
          <EtfDetail etf={selectedEtf()!} />
        </div>

        {/* Performance Metrics */}
        <div class="mb-8">
          <PerformanceMetrics etf={selectedEtf()!} />
        </div>

        {/* Add to optimization button */}
        <div class="mb-8">
          <button
            type="button"
            class="border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors"
            style={{
              'border-color': accentColor(),
              background: 'var(--bg-card)',
              color: accentColor(),
            }}
            onClick={() => toggleOptSelected(selectedEtf()!)}
          >
            {selectedForOpt().find((e) => e.ticker === selectedEtf()?.ticker)
              ? 'Remove from Optimization'
              : 'Add to Optimization'}
          </button>
        </div>
      </Show>

      {/* Quick Picks */}
      <Show when={!selectedEtf() && !loading()}>
        <div class="mb-8">
          <p class="label mb-3" style={{ color: accentColor() }}>
            QUICK PICKS
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <For each={database().slice(0, 12)}>
              {(etf) => (
                <button
                  type="button"
                  class="border px-3 py-3 text-left transition-colors"
                  style={{
                    'border-color': 'var(--border)',
                    background: 'var(--bg-card)',
                  }}
                  onClick={() => setSelectedEtf(etf)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = accentColor();
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <div class="font-mono text-sm font-bold" style={{ color: accentColor() }}>
                    {etf.ticker}
                  </div>
                  <div class="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {etf.name}
                  </div>
                  <div class="font-mono text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {etf.category}
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Portfolio Optimizer */}
      <div class="mb-8">
        <PortfolioOptimizer selectedEtfs={selectedForOpt()} />
      </div>

      {/* Portfolio Comparison */}
      <div class="mb-8">
        <Show when={!loading()}>
          <PortfolioComparison database={database()} />
        </Show>
      </div>

      {/* Correlation Matrix */}
      <div class="mb-8">
        <Show when={!loading()}>
          <CorrelationMatrix database={database()} />
        </Show>
      </div>
    </div>
  );
}

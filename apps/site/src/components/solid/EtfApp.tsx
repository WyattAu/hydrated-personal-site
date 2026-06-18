import { For, Show, createSignal, onMount } from 'solid-js';
import type { EtfEntry } from '../../lib/types';
import CorrelationMatrix from './CorrelationMatrix';
import EtfDetail from './EtfDetail';
import PerformanceMetrics from './PerformanceMetrics';
import PortfolioComparison from './PortfolioComparison';
import SearchBar from './SearchBar';

export default function EtfApp() {
  const [database, setDatabase] = createSignal<EtfEntry[]>([]);
  const [selectedEtf, setSelectedEtf] = createSignal<EtfEntry | null>(null);
  const [loading, setLoading] = createSignal(true);

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

      {/* Selected ETF Detail */}
      <Show when={selectedEtf()}>
        <div class="mb-8">
          <EtfDetail etf={selectedEtf()!} />
        </div>

        {/* Performance Metrics */}
        <div class="mb-8">
          <PerformanceMetrics etf={selectedEtf()!} />
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

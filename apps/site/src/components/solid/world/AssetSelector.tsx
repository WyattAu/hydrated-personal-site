import { For, Show, createMemo, createResource, createSignal } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { ASSET_UNIVERSE, activeAsset, setActiveAsset } from '../../../lib/asset-store';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];
  try {
    const res = await fetch(`${apiBase()}/api/stock-search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  index: 'INDICES',
  stock: 'STOCKS',
  etf: 'ETFs',
  forex: 'FOREX',
  commodity: 'COMMODITIES',
  crypto: 'CRYPTO',
};

const CATEGORY_ORDER = ['index', 'stock', 'etf', 'forex', 'commodity', 'crypto'];

export default function AssetSelector() {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');

  const [results] = createResource(query, searchSymbols);

  const currentLabel = createMemo(() => {
    const match = ASSET_UNIVERSE.find((a) => a.symbol === activeAsset());
    return match ? match.label : activeAsset();
  });

  const grouped = createMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: ASSET_UNIVERSE.filter((a) => a.category === cat),
    })).filter((g) => g.items.length > 0);
  });

  function selectAsset(symbol: string) {
    setActiveAsset(symbol);
    setOpen(false);
    setQuery('');
  }

  return (
    <div class="relative">
      <button
        type="button"
        class="font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border transition-all amoebic-morph flex items-center gap-2"
        style={{
          'border-color': 'var(--accent)',
          background: 'var(--bg-secondary)',
          color: 'var(--accent)',
        }}
        onClick={() => setOpen(!open())}
      >
        <span>{currentLabel()}</span>
        <span style={{ 'font-size': '8px', opacity: '0.6' }}>{open() ? 'CLOSE' : 'CHANGE'}</span>
      </button>

      {open() && (
        <div
          class="absolute top-full right-0 mt-1 p-3 border z-50 min-w-[280px] max-h-[400px] overflow-y-auto"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-card)',
            'backdrop-filter': 'blur(12px)',
          }}
        >
          <input
            type="text"
            placeholder="Search: AAPL, Bitcoin, TSLA, GLD..."
            class="w-full mb-2 px-2 py-1 font-mono text-xs border"
            style={{
              'border-color': 'var(--accent)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />

          <Show
            when={query().length === 0}
            fallback={
              <div>
                <Show when={results.loading}>
                  <p class="font-mono text-[10px] p-2" style={{ color: 'var(--text-secondary)' }}>
                    Searching...
                  </p>
                </Show>
                <For each={results() || []}>
                  {(r) => (
                    <button
                      type="button"
                      class="block w-full text-left px-2 py-1 font-mono text-xs transition-colors"
                      style={{
                        color: activeAsset() === r.symbol ? 'var(--accent)' : 'var(--text-primary)',
                        background:
                          activeAsset() === r.symbol ? 'var(--bg-secondary)' : 'transparent',
                      }}
                      onClick={() => selectAsset(r.symbol)}
                    >
                      <span class="font-bold">{r.symbol}</span>
                      <span style={{ 'font-size': '9px', opacity: '0.5', 'margin-left': '4px' }}>
                        {r.name}
                      </span>
                    </button>
                  )}
                </For>
                <Show when={!results.loading && (results() || []).length === 0}>
                  <p class="font-mono text-[10px] p-2" style={{ color: 'var(--text-secondary)' }}>
                    No results. Try a different search term.
                  </p>
                </Show>
              </div>
            }
          >
            {/* Default: category-grouped presets */}
            <For each={grouped()}>
              {(group) => (
                <div class="mb-2">
                  <p
                    class="font-mono text-[8px] font-bold tracking-widest mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {CATEGORY_LABELS[group.category]}
                  </p>
                  <For each={group.items}>
                    {(asset) => (
                      <button
                        type="button"
                        class="block w-full text-left px-2 py-1 font-mono text-xs transition-colors"
                        style={{
                          color:
                            activeAsset() === asset.symbol
                              ? 'var(--accent)'
                              : 'var(--text-primary)',
                          background:
                            activeAsset() === asset.symbol ? 'var(--bg-secondary)' : 'transparent',
                        }}
                        onClick={() => selectAsset(asset.symbol)}
                      >
                        {asset.label}
                        <span style={{ 'font-size': '9px', opacity: '0.5', 'margin-left': '4px' }}>
                          {asset.symbol}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              )}
            </For>
          </Show>
        </div>
      )}
    </div>
  );
}

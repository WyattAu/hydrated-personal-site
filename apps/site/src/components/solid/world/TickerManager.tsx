import { For, Show, createResource, createSignal } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import {
  PRESETS,
  activeTickers,
  addTicker,
  loadPreset,
  removeTicker,
} from '../../../lib/ticker-universe';

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

const TYPE_LABELS: Record<string, string> = {
  EQUITY: 'STOCK',
  ETF: 'ETF',
  INDEX: 'INDEX',
  CURRENCY: 'FX',
  CRYPTOCURRENCY: 'CRYPTO',
  FUTURE: 'FUTURES',
  MUTUALFUND: 'FUND',
};

export default function TickerManager() {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [showPresets, setShowPresets] = createSignal(false);

  const [results] = createResource(query, searchSymbols);

  function handleAdd(symbol: string, name: string) {
    const label = name.length > 10 ? name.slice(0, 10) : name;
    addTicker({ symbol, label });
    setQuery('');
    setOpen(false);
  }

  return (
    <div>
      {/* Active ticker chips */}
      <div class="flex flex-wrap items-center gap-1.5 mb-2">
        <For each={activeTickers()}>
          {(t) => (
            <span
              class="font-mono text-[10px] px-2 py-0.5 border flex items-center gap-1"
              style={{
                'border-color': 'var(--border)',
                color: 'var(--text-primary)',
                background: 'var(--bg-card)',
              }}
            >
              {t.label}
              <button
                type="button"
                class="opacity-40 hover:opacity-100"
                style={{ color: '#ff5252' }}
                onClick={() => removeTicker(t.symbol)}
              >
                x
              </button>
            </span>
          )}
        </For>
        <button
          type="button"
          class="font-mono text-[10px] px-2 py-0.5 border"
          style={{ 'border-color': 'var(--accent)', color: 'var(--accent)' }}
          onClick={() => setOpen(!open())}
        >
          + ADD
        </button>
        <button
          type="button"
          class="font-mono text-[10px] px-2 py-0.5 border"
          style={{ 'border-color': 'var(--border)', color: 'var(--text-secondary)' }}
          onClick={() => setShowPresets(!showPresets())}
        >
          PRESETS
        </button>
      </div>

      {/* Preset selector */}
      <Show when={showPresets()}>
        <div class="flex flex-wrap gap-1.5 mb-2">
          <For each={PRESETS}>
            {(preset) => (
              <button
                type="button"
                class="font-mono text-[9px] px-2 py-1 border"
                style={{ 'border-color': 'var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => {
                  loadPreset(preset.name);
                  setShowPresets(false);
                }}
              >
                {preset.name.toUpperCase()} ({preset.tickers.length})
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Search dropdown */}
      <Show when={open()}>
        <div class="relative">
          <input
            type="text"
            placeholder="Search: AAPL, Bitcoin, TSLA, GLD..."
            class="w-full px-3 py-2 font-mono text-xs border"
            style={{
              'border-color': 'var(--accent)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            autofocus
          />
          <Show when={query().length > 0}>
            <div
              class="absolute top-full left-0 right-0 mt-1 border z-50 max-h-[300px] overflow-y-auto"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
            >
              <Show when={results.loading}>
                <p class="font-mono text-[10px] p-2" style={{ color: 'var(--text-secondary)' }}>
                  Searching...
                </p>
              </Show>
              <For each={results() || []}>
                {(r) => (
                  <button
                    type="button"
                    class="block w-full text-left px-3 py-2 hover:bg-opacity-50 transition-colors"
                    style={{ 'border-bottom': '1px solid var(--border)' }}
                    onClick={() => handleAdd(r.symbol, r.name)}
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span
                          class="font-mono text-xs font-bold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {r.symbol}
                        </span>
                        <span
                          class="font-mono text-[10px] ml-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {r.name}
                        </span>
                      </div>
                      <span
                        class="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5"
                        style={{ color: 'var(--accent)' }}
                      >
                        {TYPE_LABELS[r.type] || r.type}
                      </span>
                    </div>
                  </button>
                )}
              </For>
              <Show when={!results.loading && (results() || []).length === 0}>
                <p class="font-mono text-[10px] p-2" style={{ color: 'var(--text-secondary)' }}>
                  No results. Try a different search term.
                </p>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      <p class="font-mono text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
        {activeTickers().length} assets | min 3 / max 20 | all cross-asset widgets update when you
        change this list
      </p>
    </div>
  );
}

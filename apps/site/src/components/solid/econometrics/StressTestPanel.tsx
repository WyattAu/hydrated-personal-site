import { For, Show, createSignal, onMount } from 'solid-js';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface AssetShock {
  symbol: string;
  category: string;
  shock_pct: number;
  contribution: number;
}

interface Scenario {
  scenario: string;
  description: string;
  year: number;
  portfolio_pnl: number;
  assets: AssetShock[];
}

export default function StressTestPanel() {
  const [scenarios, setScenarios] = createSignal<Scenario[]>([]);
  const [expanded, setExpanded] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const tickers = activeTickers();
      if (tickers.length < 1) throw new Error('Need at least 1 ticker');
      const symbols = tickers.map((t) => t.symbol);
      const w = new Float64Array(symbols.length);
      const eq = 1 / symbols.length;
      for (let i = 0; i < w.length; i++) w[i] = eq;

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_stress_test(symbols.join(','), w);
      const parsed = JSON.parse(json) as Scenario[];
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No scenarios');
      setScenarios(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }

  onMount(() => loadData());

  onTickersChanged(() => loadData());

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          STRESS TEST SCENARIOS
        </p>
        <Show when={!loading() && scenarios().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeTickers().length} assets | equal-weight
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Running stress tests...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && scenarios().length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <For each={scenarios()}>
            {(sc, i) => {
              const pnl = sc.portfolio_pnl ?? 0;
              const isOpen = () => expanded() === i();
              return (
                <div
                  class="border p-2 cursor-pointer"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                  onClick={() => setExpanded(isOpen() ? null : i())}
                >
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="font-mono text-[11px] font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {sc.scenario}
                    </span>
                    <span
                      class="font-mono text-sm font-bold"
                      style={{ color: pnl >= 0 ? '#4caf50' : '#ff5252' }}
                    >
                      {pnl >= 0 ? '+' : ''}
                      {pnl.toFixed(1)}%
                    </span>
                  </div>
                  <div class="flex items-center justify-between mt-1">
                    <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                      {sc.year}
                    </span>
                    <span class="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>
                      {isOpen() ? '− hide' : '+ details'}
                    </span>
                  </div>
                  <p class="font-mono text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {sc.description}
                  </p>

                  <Show when={isOpen()}>
                    <div class="mt-2 pt-2" style={{ 'border-top': '1px solid var(--border)' }}>
                      <For each={sc.assets ?? []}>
                        {(a) => (
                          <div class="flex items-center justify-between font-mono text-[9px] py-[1px]">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {a.symbol}{' '}
                              <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                                ({a.category})
                              </span>
                            </span>
                            <span
                              style={{ color: (a.contribution ?? 0) >= 0 ? '#4caf50' : '#ff5252' }}
                            >
                              {(a.shock_pct ?? 0) >= 0 ? '+' : ''}
                              {(a.shock_pct ?? 0).toFixed(1)}% →{' '}
                              {(a.contribution ?? 0) >= 0 ? '+' : ''}
                              {(a.contribution ?? 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <p class="font-mono text-[9px] mt-3" style={{ color: 'var(--text-secondary)' }}>
          Historical crisis replay | Shocks classified by asset category | Click a card for
          per-asset breakdown
        </p>
      </Show>
    </div>
  );
}

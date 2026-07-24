import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { getWasmMod } from '../../../lib/wasm-loader';

interface RiskRatios {
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  treynor: number | null;
  ann_return: number | null;
  ann_volatility: number | null;
  max_drawdown: number | null;
  current_drawdown: number | null;
}

interface Card {
  label: string;
  value: number;
  fmt: (v: number) => string;
  color: string;
}

export default function RiskRatios() {
  const [data, setData] = createSignal<RiskRatios | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/api/stock-chart?symbol=${activeAsset()}&range=1y&interval=1d`,
      );
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (quote?.close ?? []).filter(
        (c: number | null): c is number => c != null,
      );
      if (closes.length < 30) throw new Error('Insufficient data');

      const wasmMod = await getWasmMod();
      const raw = wasmMod.quant_risk_ratios(Float64Array.from(closes), 0.04, 252);
      const parsed = JSON.parse(raw) as RiskRatios;
      setData(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  onMount(() => loadData());

  createEffect(() => {
    activeAsset();
    loadData();
  });

  function ratioColor(v: number): string {
    if (v > 1) return '#4caf50';
    if (v >= 0) return '#ffab40';
    return '#ff5252';
  }

  function cards(d: RiskRatios): Card[] {
    const pct = (v: number) => `${v.toFixed(2)}%`;
    const x = (v: number) => v.toFixed(3);
    return [
      { label: 'SHARPE RATIO', value: d.sharpe ?? 0, fmt: x, color: ratioColor(d.sharpe ?? 0) },
      { label: 'SORTINO RATIO', value: d.sortino ?? 0, fmt: x, color: ratioColor(d.sortino ?? 0) },
      { label: 'CALMAR RATIO', value: d.calmar ?? 0, fmt: x, color: ratioColor(d.calmar ?? 0) },
      { label: 'TREYNOR RATIO', value: d.treynor ?? 0, fmt: x, color: ratioColor(d.treynor ?? 0) },
      {
        label: 'ANNUALIZED RETURN',
        value: d.ann_return ?? 0,
        fmt: pct,
        color: (d.ann_return ?? 0) >= 0 ? '#4caf50' : '#ff5252',
      },
      {
        label: 'ANNUALIZED VOLATILITY',
        value: d.ann_volatility ?? 0,
        fmt: pct,
        color: 'var(--accent)',
      },
      {
        label: 'MAX DRAWDOWN',
        value: d.max_drawdown ?? 0,
        fmt: pct,
        color: '#ff5252',
      },
      {
        label: 'CURRENT DRAWDOWN',
        value: d.current_drawdown ?? 0,
        fmt: pct,
        color: '#ff5252',
      },
    ];
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          RISK-ADJUSTED RETURNS
        </p>
        <Show when={!loading() && data()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 1Y daily
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing risk ratios...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => (
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            {cards(d).map((card) => (
              <div
                class="border p-3 flex flex-col gap-1"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {card.label}
                </p>
                <p class="font-mono text-lg font-bold" style={{ color: card.color }}>
                  {card.fmt(card.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Show>

      <p class="font-mono text-[9px] mt-3" style={{ color: 'var(--text-secondary)' }}>
        1Y daily | rf=4% | Sharpe: excess return / total vol | Sortino: excess return / downside vol
        | Calmar: ann return / max DD
      </p>
    </div>
  );
}

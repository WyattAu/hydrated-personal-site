import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const H = 340;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'];

export default function CurrencyMatrix() {
  const [matrix, setMatrix] = createSignal<{
    grid: number[][];
    rates: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/exchange-rates`);
      if (!res.ok) throw new Error('API');
      const raw = await res.json();
      const body = raw.data || raw;
      const rates: Record<string, number> = body.rates || {};
      rates.USD = 1;

      // USD purchasing value of one unit of each currency = 1 / rate.
      const lnVal = CURRENCIES.map((c) => Math.log(1 / (rates[c] || 1)));
      const mean = lnVal.reduce((a, b) => a + b, 0) / lnVal.length;
      const rel = lnVal.map((v) => v - mean);

      const grid: number[][] = [];
      for (let i = 0; i < CURRENCIES.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < CURRENCIES.length; j++) row.push(rel[i] - rel[j]);
        grid.push(row);
      }
      setMatrix({ grid, rates });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const m = matrix();
    if (!m) return;
    // Diverging red-blue palette with axis labels (values are +/- relative
    // strength differentials, so the correlation renderer fits better than
    // the sequential green heatmap ramp).
    renderPlychart(
      'currency-matrix',
      'update_correlation',
      JSON.stringify(m.grid),
      JSON.stringify(CURRENCIES),
      '',
    );
  }

  createEffect(() => {
    matrix();
    renderChart();
  });

  usePlychartAuto(() => 'currency-matrix', renderChart);

  onMount(() => {
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        CURRENCY STRENGTH MATRIX
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading exchange rates...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas id="currency-matrix" class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        8x8 FX cross-rates | spot snapshot | green = row stronger than column
      </p>
    </div>
  );
}

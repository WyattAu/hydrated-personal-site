import { For, Show, createMemo, createSignal } from 'solid-js';
import { useLlmData } from '../../../lib/llm-data';

interface SortKey {
  key: keyof {
    model: string;
    average_score: number;
    mmlu: number;
    humaneval: number;
    gsm8k: number;
    hellaswag: number;
    arc: number;
    truthfulqa: number;
    price_per_m_token: number;
    tokens_per_sec: number;
  };
  label: string;
  align: 'left' | 'right';
}

const ALL_COLUMNS: SortKey[] = [
  { key: 'model', label: 'Model', align: 'left' },
  { key: 'average_score', label: 'Avg', align: 'right' },
  { key: 'mmlu', label: 'MMLU', align: 'right' },
  { key: 'humaneval', label: 'HumanEval', align: 'right' },
  { key: 'gsm8k', label: 'GSM8K', align: 'right' },
  { key: 'hellaswag', label: 'HellaSwag', align: 'right' },
  { key: 'arc', label: 'ARC', align: 'right' },
  { key: 'truthfulqa', label: 'TruthfulQA', align: 'right' },
  { key: 'price_per_m_token', label: '$/1M tok', align: 'right' },
  { key: 'tokens_per_sec', label: 'tok/s', align: 'right' },
];

export default function LlmBenchmarkTable() {
  const { data, loading } = useLlmData();
  const [sortKey, setSortKey] = createSignal<string>('average_score');
  const [sortDir, setSortDir] = createSignal(-1); // -1 = desc
  const [filter, setFilter] = createSignal('');

  // Dynamically determine which columns have data (>5% of models with non-zero values)
  const visibleColumns = createMemo(() => {
    const d = data();
    if (d.length === 0) return ALL_COLUMNS;
    const threshold = Math.max(1, d.length * 0.05);
    return ALL_COLUMNS.filter((col) => {
      if (col.key === 'model') return true;
      const nonzero = d.filter((m) => {
        const val = m[col.key as keyof typeof m];
        return typeof val === 'number' && val > 0;
      }).length;
      return nonzero >= threshold;
    });
  });

  const sorted = createMemo(() => {
    const d = data();
    if (d.length === 0) return [];
    const f = filter().toLowerCase();
    const filtered = f ? d.filter((m) => m.model.toLowerCase().includes(f)) : d;
    const key = sortKey() as keyof (typeof filtered)[0];
    const dir = sortDir();
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  });

  function toggleSort(key: string) {
    if (sortKey() === key) {
      setSortDir(-sortDir());
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function scoreColor(v: number, max: number): string {
    const ratio = v / max;
    if (ratio > 0.85) return '#4caf50';
    if (ratio > 0.7) return '#80cbc4';
    if (ratio > 0.5) return '#ffab40';
    return '#ff5252';
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          LLM BENCHMARK LEADERBOARD
        </p>
        <input
          type="text"
          placeholder="Filter models..."
          class="font-mono text-[10px] px-2 py-1 border"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
          }}
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
        />
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading benchmarks...
        </p>
      </Show>

      <Show when={!loading() && sorted().length > 0}>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <For each={visibleColumns()}>
                  {(col) => (
                    <th
                      class="cursor-pointer select-none font-mono text-[9px] uppercase tracking-wider px-2 py-1 whitespace-nowrap"
                      style={{
                        color: sortKey() === col.key ? 'var(--accent)' : 'var(--text-secondary)',
                        'text-align': col.align,
                        'min-width': col.key === 'model' ? '120px' : '50px',
                      }}
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      {sortKey() === col.key ? (sortDir() > 0 ? ' <' : ' >') : ''}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={sorted()}>
                {(m) => (
                  <tr style={{ 'border-bottom': '1px solid var(--border)' }}>
                    <td
                      class="font-mono text-[10px] px-2 py-1 font-bold whitespace-nowrap"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {m.model}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right font-bold"
                      style={{ color: scoreColor(m.average_score, 100) }}
                    >
                      {m.average_score.toFixed(1)}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{ color: scoreColor(m.mmlu, 100) }}
                    >
                      {m.mmlu > 0 ? m.mmlu.toFixed(1) : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{ color: scoreColor(m.humaneval, 100) }}
                    >
                      {m.humaneval > 0 ? m.humaneval.toFixed(1) : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{ color: scoreColor(m.gsm8k, 100) }}
                    >
                      {m.gsm8k > 0 ? m.gsm8k.toFixed(1) : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{ color: scoreColor(m.hellaswag, 100) }}
                    >
                      {m.hellaswag > 0 ? m.hellaswag.toFixed(1) : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{ color: scoreColor(m.arc, 100) }}
                    >
                      {m.arc > 0 ? m.arc.toFixed(1) : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{ color: scoreColor(m.truthfulqa, 100) }}
                    >
                      {m.truthfulqa > 0 ? m.truthfulqa.toFixed(1) : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{
                        color:
                          m.price_per_m_token && m.price_per_m_token > 0
                            ? 'var(--text-secondary)'
                            : 'var(--border)',
                      }}
                    >
                      {m.price_per_m_token ? `$${m.price_per_m_token.toFixed(1)}` : '-'}
                    </td>
                    <td
                      class="font-mono text-[10px] px-2 py-1 text-right"
                      style={{
                        color:
                          m.tokens_per_sec && m.tokens_per_sec > 0
                            ? 'var(--accent)'
                            : 'var(--border)',
                      }}
                    >
                      {m.tokens_per_sec ? m.tokens_per_sec.toFixed(0) : '-'}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          {sorted().length} models | click headers to sort | green = high score | red = low score
        </p>
      </Show>
    </div>
  );
}

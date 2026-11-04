import { For, Show, createEffect, createMemo } from 'solid-js';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { useLlmData } from '../../../lib/llm-data';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
import type { LLMBenchmarkModel } from '../../../lib/types';

const ALL_AXES: { key: keyof LLMBenchmarkModel; label: string }[] = [
  { key: 'average_score', label: 'Avg Score' },
  { key: 'mmlu', label: 'MMLU' },
  { key: 'humaneval', label: 'HumanEval' },
  { key: 'gsm8k', label: 'GSM8K' },
  { key: 'hellaswag', label: 'HellaSwag' },
  { key: 'arc', label: 'ARC' },
  { key: 'truthfulqa', label: 'TruthfulQA' },
];

const PALETTE = ['#00e5ff', '#ff4081', '#7c4dff', '#4caf50', '#ffa726'];

export default function ModelRadarChart() {
  const { data, loading } = useLlmData();

  const top5 = createMemo<LLMBenchmarkModel[]>(() => {
    const d = data();
    if (d.length === 0) return [];
    return [...d].sort((a, b) => b.average_score - a.average_score).slice(0, 5);
  });

  const axes = createMemo(() => {
    const models = top5();
    if (models.length === 0) return ALL_AXES;
    return ALL_AXES.filter((axis) => {
      const nonzero = models.filter((m) => {
        const val = Number(m[axis.key]);
        return val > 0;
      }).length;
      return nonzero >= Math.max(1, models.length * 0.4);
    });
  });

  function renderChart() {
    const models = top5();
    const ax = axes();
    if (models.length === 0 || ax.length < 3) return;
    attachChartMeta('model-radar', {
      source: 'LLM benchmark feed',
      detail: 'top-5 by avg score · 0-100',
    });
    setChartMetaState('model-radar', { freshAt: Date.now() });

    const labels = ax.map((a) => a.label);
    const series = models.map((m, mi) => ({
      color: PALETTE[mi % PALETTE.length],
      values: ax.map((a) => {
        const val = Number(m[a.key]);
        return val > 0 ? Math.max(0, Math.min(100, val)) : 0;
      }),
    }));

    renderPlychart(
      'model-radar',
      'update_radar_multi',
      JSON.stringify(series),
      JSON.stringify(labels),
      '',
    );
  }

  createEffect(() => {
    top5();
    axes();
    renderChart();
  });

  usePlychartAuto(() => 'model-radar', renderChart);

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        TOP 5 MODEL RADAR
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading benchmarks...
        </p>
      </Show>
      <Show when={!loading() && top5().length === 0}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No benchmark data available.
        </p>
      </Show>
      <canvas id="model-radar" class="w-full" style={{ height: '320px' }} />
      <Show when={top5().length > 0}>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <For each={top5()}>
            {(m, i) => (
              <div class="flex items-center gap-1.5">
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    background: PALETTE[i() % PALETTE.length],
                  }}
                />
                <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {m.model}
                </span>
              </div>
            )}
          </For>
        </div>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          6-axis benchmark profile | scale 0-100 | top 5 by average score
        </p>
      </Show>
    </div>
  );
}

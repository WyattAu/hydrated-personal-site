import { createSignal, onMount } from 'solid-js';
import type { LLMBenchmarkModel } from './types';

let fetched = false;
const data = createSignal<LLMBenchmarkModel[]>([]);
const loading = createSignal(true);

function parseModels(raw: unknown): LLMBenchmarkModel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: Record<string, unknown>) => m.model || m.name)
    .slice(0, 30)
    .map((m: Record<string, unknown>) => ({
      model: (m.model || m.name || 'Unknown') as string,
      parameter_count: (m.parameter_count || m.params || '?') as string,
      average_score: (m.average_score ?? m.avg ?? 0) as number,
      mmlu: (m.mmlu ?? 0) as number,
      hellaswag: (m.hellaswag ?? 0) as number,
      arc: (m.arc ?? 0) as number,
      truthfulqa: (m.truthfulqa ?? 0) as number,
      gsm8k: (m.gsm8k ?? 0) as number,
      humaneval: (m.humaneval ?? 0) as number,
    }));
}

export function useLlmData() {
  if (!fetched) {
    fetched = true;
    onMount(async () => {
      try {
        const res = await fetch('/api/llm-benchmarks');
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const raw = await res.json();
        const parsed = parseModels(raw);
        if (parsed.length > 0) {
          data[1](parsed);
        }
      } catch (e) {
        console.warn('LLM benchmarks fetch failed:', e);
      }
      loading[1](false);
    });
  }

  return { data: data[0], loading: loading[0] };
}

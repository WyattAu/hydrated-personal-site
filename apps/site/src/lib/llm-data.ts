import { createSignal, onMount } from 'solid-js';
import { recordFetch } from '../components/solid/StaleIndicator';
import { apiBase } from './api-base';
import type { LLMBenchmarkModel } from './types';

let fetched = false;
const data = createSignal<LLMBenchmarkModel[]>([]);
const loading = createSignal(true);

const EMBEDDED_LLM_DATA: LLMBenchmarkModel[] = [
  {
    model: 'GPT-4o',
    parameter_count: '?',
    average_score: 88.7,
    mmlu: 88.7,
    humaneval: 90.2,
    hellaswag: 95.3,
    gsm8k: 95.3,
    arc: 96.3,
    truthfulqa: 89.1,
  },
  {
    model: 'Claude 3.5 Sonnet',
    parameter_count: '?',
    average_score: 88.1,
    mmlu: 88.7,
    humaneval: 92.0,
    hellaswag: 94.8,
    gsm8k: 96.4,
    arc: 96.7,
    truthfulqa: 87.2,
  },
  {
    model: 'Gemini 1.5 Pro',
    parameter_count: '?',
    average_score: 85.9,
    mmlu: 85.9,
    humaneval: 84.1,
    hellaswag: 93.2,
    gsm8k: 91.7,
    arc: 94.4,
    truthfulqa: 86.4,
  },
  {
    model: 'Llama 3.1 405B',
    parameter_count: '405B',
    average_score: 83.6,
    mmlu: 88.6,
    humaneval: 89.0,
    hellaswag: 88.0,
    gsm8k: 96.8,
    arc: 96.9,
    truthfulqa: 82.6,
  },
  {
    model: 'Llama 3.1 70B',
    parameter_count: '70B',
    average_score: 80.4,
    mmlu: 83.6,
    humaneval: 80.5,
    hellaswag: 88.0,
    gsm8k: 95.1,
    arc: 94.1,
    truthfulqa: 79.1,
  },
  {
    model: 'Llama 3.1 8B',
    parameter_count: '8B',
    average_score: 72.9,
    mmlu: 73.0,
    humaneval: 62.2,
    hellaswag: 81.4,
    gsm8k: 84.5,
    arc: 83.4,
    truthfulqa: 69.4,
  },
  {
    model: 'Mistral Large 2',
    parameter_count: '123B',
    average_score: 84.0,
    mmlu: 84.0,
    humaneval: 92.7,
    hellaswag: 89.5,
    gsm8k: 91.2,
    arc: 94.0,
    truthfulqa: 78.4,
  },
  {
    model: 'Qwen2 72B',
    parameter_count: '72B',
    average_score: 82.3,
    mmlu: 84.2,
    humaneval: 86.4,
    hellaswag: 87.5,
    gsm8k: 91.6,
    arc: 93.0,
    truthfulqa: 80.2,
  },
  {
    model: 'Gemma 2 27B',
    parameter_count: '27B',
    average_score: 78.1,
    mmlu: 75.2,
    humaneval: 71.3,
    hellaswag: 85.3,
    gsm8k: 82.8,
    arc: 90.1,
    truthfulqa: 73.5,
  },
  {
    model: 'Phi-3 Medium',
    parameter_count: '14B',
    average_score: 77.6,
    mmlu: 78.0,
    humaneval: 62.4,
    hellaswag: 83.8,
    gsm8k: 89.6,
    arc: 88.0,
    truthfulqa: 75.2,
  },
  {
    model: 'Yi-1.5 34B',
    parameter_count: '34B',
    average_score: 76.4,
    mmlu: 76.8,
    humaneval: 67.8,
    hellaswag: 84.6,
    gsm8k: 87.2,
    arc: 89.6,
    truthfulqa: 72.4,
  },
  {
    model: 'Command R+',
    parameter_count: '104B',
    average_score: 74.8,
    mmlu: 75.7,
    humaneval: 71.2,
    hellaswag: 83.2,
    gsm8k: 79.6,
    arc: 86.2,
    truthfulqa: 68.9,
  },
  {
    model: 'DeepSeek V2',
    parameter_count: '236B',
    average_score: 81.2,
    mmlu: 81.5,
    humaneval: 83.5,
    hellaswag: 86.7,
    gsm8k: 92.2,
    arc: 91.4,
    truthfulqa: 76.3,
  },
  {
    model: 'Dbrx Instruct',
    parameter_count: '132B',
    average_score: 74.2,
    mmlu: 73.2,
    humaneval: 74.4,
    hellaswag: 81.6,
    gsm8k: 82.4,
    arc: 85.0,
    truthfulqa: 67.8,
  },
  {
    model: 'Mixtral 8x22B',
    parameter_count: '141B',
    average_score: 77.8,
    mmlu: 77.8,
    humaneval: 75.6,
    hellaswag: 84.8,
    gsm8k: 78.6,
    arc: 88.4,
    truthfulqa: 72.4,
  },
];

function parseModels(raw: unknown): LLMBenchmarkModel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: Record<string, unknown>) => m.model || m.name)
    .slice(0, 50)
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
      price_per_m_token: (m.price_per_m_token ?? 0) as number,
      tokens_per_sec: (m.tokens_per_sec ?? 0) as number,
    }))
    .filter((m) => m.average_score > 0 || m.humaneval > 0 || m.tokens_per_sec > 0)
    .sort((a, b) => b.average_score - a.average_score);
}

export function useLlmData() {
  if (!fetched) {
    fetched = true;
    onMount(async () => {
      try {
        const res = await fetch(`${apiBase()}/api/llm-benchmarks`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const raw = await res.json();
        if (raw?.error) throw new Error(raw.error);
        const parsed = parseModels(raw);
        if (parsed.length > 0) {
          data[1](parsed);
          recordFetch('llm-benchmarks');
          loading[1](false);
          return;
        }
      } catch {}
      // Fallback: try the Worker directly
      try {
        const res = await fetch('https://hydrated-worker.wyatt-au.workers.dev/api/llm-benchmarks');
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        const raw = await res.json();
        if (raw?.error) throw new Error(raw.error);
        const parsed = parseModels(raw);
        if (parsed.length > 0) {
          data[1](parsed);
          recordFetch('llm-benchmarks');
          loading[1](false);
          return;
        }
      } catch {}
      // Final fallback: use embedded data
      data[1](EMBEDDED_LLM_DATA);
      recordFetch('llm-benchmarks');
      loading[1](false);
    });
  }

  return { data: data[0], loading: loading[0] };
}

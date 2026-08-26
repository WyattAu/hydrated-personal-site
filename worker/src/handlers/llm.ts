import { getCached, setCache } from '../cache';
import sampleData from '../data/llm-benchmarks.json';
import { log } from '../logger';
import { json } from '../security';
import type { Env } from '../types';

export async function handleLlmBenchmarks(env: Env): Promise<Response> {
  const cached = getCached('llm-benchmarks');
  if (cached) return json(cached);

  const apiKey = env.AA_API_KEY;
  if (apiKey) {
    try {
      const resp = await fetch('https://artificialanalysis.ai/api/v2/data/llms/models', {
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) {
        const raw = (await resp.json()) as { data?: Array<Record<string, unknown>> };
        const models = (raw.data || [])
          .map((m) => ({
            model: (m.name as string) || 'Unknown',
            parameter_count: (m.parameter_count as string) || '?',
            average_score:
              ((m.evaluations as Record<string, unknown>)
                ?.artificial_analysis_intelligence_index as number) || 0,
            mmlu: ((m.evaluations as Record<string, unknown>)?.gpqa as number) || 0,
            humaneval:
              ((m.evaluations as Record<string, unknown>)
                ?.artificial_analysis_coding_index as number) || 0,
            hellaswag: 0,
            gsm8k: 0,
            arc: 0,
            truthfulqa: 0,
            price_per_m_token:
              ((m.pricing as Record<string, unknown>)?.price_1m_input_tokens as number) || 0,
            tokens_per_sec: (m.median_output_tokens_per_second as number) || 0,
          }))
          .filter((m) => m.model !== 'Unknown');
        if (models.length > 0) {
          setCache('llm-benchmarks', models, 6 * 60 * 60 * 1000);
          return json(models);
        }
      }
    } catch (e) {
      log('warn', 'artificialanalysis.ai fetch failed', { error: String(e) });
    }
  }

  // Fallback: embedded sample data
  const sample = sampleData as Array<Record<string, unknown>>;
  setCache('llm-benchmarks', sample, 6 * 60 * 60 * 1000);
  return json(sample);
}

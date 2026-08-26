import { getCached } from './cache';
import { isCircuitOpen, recordFailure, recordSuccess } from './circuit-breaker';
import { recordUpstreamLatency } from './metrics';
import { retryWithBackoff } from './retry';

const inflight = new Map<string, Promise<unknown>>();

export async function fetchJson(
  url: string,
  endpoint: string,
  init?: RequestInit,
): Promise<unknown> {
  if (isCircuitOpen(endpoint)) {
    const stale = getCached(endpoint);
    if (stale) return stale;
    throw new Error(`Circuit open for ${endpoint} and no stale data`);
  }

  const dedupKey = `${endpoint}:${url}`;
  const inflightPromise = inflight.get(dedupKey);
  if (inflightPromise) {
    return inflightPromise;
  }

  const promise = (async () => {
    const start = Date.now();
    try {
      const data = await retryWithBackoff(
        async () => {
          const res = await fetch(url, init);
          if (!res.ok) throw new Error(`Upstream error: ${res.status}`);
          return await res.json();
        },
        { maxRetries: 2, baseDelay: 500, maxDelay: 3000 },
      );
      recordSuccess(endpoint);
      recordUpstreamLatency(endpoint, Date.now() - start);
      return data;
    } catch (e) {
      recordFailure(endpoint);
      recordUpstreamLatency(endpoint, Date.now() - start);
      throw e;
    } finally {
      inflight.delete(dedupKey);
    }
  })();

  inflight.set(dedupKey, promise);
  return promise;
}

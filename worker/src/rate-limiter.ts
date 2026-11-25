/**
 * Sliding-window rate limiter.
 *
 * Semantics: an IP may make `limit` requests per trailing `windowMs`.
 * Samples older than the window are pruned lazily on access.
 *
 * Memory: state is per-isolate (approximate across isolates by design —
 * Cloudflare isolates are ephemeral). The tracked-IP set is bounded at
 * MAX_TRACKED_IPS with two-stage eviction: expired entries first, then
 * oldest-inserted (Map preserves insertion order). Without the cap, a
 * spoofed-IP flood grows the map without bound.
 */

const WINDOW_SAMPLES = new Map<string, number[]>();
const MAX_TRACKED_IPS = 10_000;

export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  prune(now, windowMs, ip);

  const samples = WINDOW_SAMPLES.get(ip) ?? [];

  // slide: drop samples that fell out of the window
  while (samples.length > 0 && now - samples[0] >= windowMs) {
    samples.shift();
  }

  if (samples.length >= limit) {
    WINDOW_SAMPLES.set(ip, samples);
    return false;
  }

  samples.push(now);
  WINDOW_SAMPLES.set(ip, samples);
  return true;
}

/** Prune: expired entries always; oldest-inserted when over the cap. */
function prune(now: number, windowMs: number, protect: string): void {
  if (WINDOW_SAMPLES.size < MAX_TRACKED_IPS) return;

  // pass 1: drop expired (any entry whose newest sample is stale)
  for (const [ip, samples] of WINDOW_SAMPLES) {
    if (ip === protect) continue;
    if (samples.length === 0 || now - samples[samples.length - 1] >= windowMs) {
      WINDOW_SAMPLES.delete(ip);
    }
  }

  // pass 2: still over cap -> drop oldest-inserted (protect current IP)
  for (const ip of WINDOW_SAMPLES.keys()) {
    if (WINDOW_SAMPLES.size < MAX_TRACKED_IPS) break;
    if (ip === protect) continue;
    WINDOW_SAMPLES.delete(ip);
  }
}

/** Test hook: clear all state. */
export function clearRateLimits(): void {
  WINDOW_SAMPLES.clear();
}

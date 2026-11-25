import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Dynamic import + resetModules: the limiter keeps module-level state
// (the tracked-IP map), so every test starts from a fresh module graph.
async function loadRateLimiter() {
  vi.resetModules();
  return import('../../worker/src/rate-limiter');
}

let now: number;

describe('Rate Limiter (sliding window)', () => {
  beforeEach(() => {
    now = 1_000_000;
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    expect(checkRateLimit('1.2.3.4', 5, 60_000, now)).toBe(true);
  });

  it('blocks after limit exceeded within window', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('1.2.3.4', 3, 60_000, now)).toBe(true);
    }
    expect(checkRateLimit('1.2.3.4', 3, 60_000, now)).toBe(false);
  });

  it('slides: allows again as old samples fall out of the window', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    // 3 requests, limit 3, window 60s
    checkRateLimit('1.2.3.4', 3, 60_000, now);
    checkRateLimit('1.2.3.4', 3, 60_000, now + 20_000);
    checkRateLimit('1.2.3.4', 3, 60_000, now + 40_000);
    // blocked at t+50s (all three samples still inside the 60s window)
    expect(checkRateLimit('1.2.3.4', 3, 60_000, now + 50_000)).toBe(false);
    // at t+61s the first sample slid out -> allowed
    expect(checkRateLimit('1.2.3.4', 3, 60_000, now + 61_000)).toBe(true);
  });

  it('tracks IPs independently', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    for (let i = 0; i < 3; i++) {
      checkRateLimit('1.2.3.4', 3, 60_000, now);
    }
    expect(checkRateLimit('1.2.3.4', 3, 60_000, now)).toBe(false);
    expect(checkRateLimit('5.6.7.8', 3, 60_000, now)).toBe(true);
  });

  it('evicts expired entries when over the tracked-IP cap', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    // flood 10_000 IPs with 1s windows (cap reached), then move past expiry
    for (let i = 0; i < 10_000; i++) {
      checkRateLimit(`10.${Math.floor(i / 254)}.${i % 254}.1`, 1, 1_000, now);
    }
    const later = now + 60_000;
    // every flooded entry is expired -> pruned; the new IP is admitted
    expect(checkRateLimit('9.9.9.9', 1, 60_000, later)).toBe(true);
  });

  it('caps unbounded growth: drops oldest-inserted when nothing expired', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    // 10_000 live IPs inside a long window (no expiry possible)
    for (let i = 0; i < 10_000; i++) {
      checkRateLimit(`10.${Math.floor(i / 254)}.${i % 254}.1`, 5, 600_000, now);
    }
    // one more: cap forces oldest-inserted eviction; admission succeeds
    expect(checkRateLimit('9.9.9.9', 5, 600_000, now)).toBe(true);
  });
});

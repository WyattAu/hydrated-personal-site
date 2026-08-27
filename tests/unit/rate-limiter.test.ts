import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

async function loadRateLimiter() {
  return import('../../worker/src/rate-limiter');
}

describe('Rate Limiter', () => {
  it('allows first request', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    expect(checkRateLimit('1.2.3.4', 5, 60_000)).toBe(true);
  });

  it('blocks after limit exceeded', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('1.2.3.4', 3, 60_000)).toBe(true);
    }
    expect(checkRateLimit('1.2.3.4', 3, 60_000)).toBe(false);
  });

  it('resets after window expires', async () => {
    vi.useFakeTimers();
    try {
      const { checkRateLimit } = await loadRateLimiter();
      for (let i = 0; i < 3; i++) {
        checkRateLimit('1.2.3.4', 3, 1000);
      }
      expect(checkRateLimit('1.2.3.4', 3, 1000)).toBe(false);

      vi.advanceTimersByTime(1001);

      expect(checkRateLimit('1.2.3.4', 3, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('different IPs have independent limits', async () => {
    const { checkRateLimit } = await loadRateLimiter();
    for (let i = 0; i < 2; i++) {
      checkRateLimit('1.1.1.1', 2, 60_000);
    }
    expect(checkRateLimit('1.1.1.1', 2, 60_000)).toBe(false);
    expect(checkRateLimit('2.2.2.2', 2, 60_000)).toBe(true);
  });
});

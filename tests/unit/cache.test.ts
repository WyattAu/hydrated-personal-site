import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

async function loadCache() {
  return import('../../worker/src/cache');
}

describe('SWR Cache', () => {
  it('getCached returns null for missing keys', async () => {
    const { getCached } = await loadCache();
    expect(getCached('nonexistent')).toBeNull();
  });

  it('setCache stores data and getCached retrieves it', async () => {
    const { getCached, setCache } = await loadCache();
    setCache('key1', { value: 42 }, 60_000);
    expect(getCached('key1')).toEqual({ value: 42 });
  });

  it('getCached returns stale data after expiry', async () => {
    vi.useFakeTimers();
    try {
      const { getCached, setCache } = await loadCache();
      setCache('key2', 'data', 1000);
      expect(getCached('key2')).toBe('data');

      vi.advanceTimersByTime(2000);

      const result = getCached('key2');
      expect(result).toBe('data');
    } finally {
      vi.useRealTimers();
    }
  });

  it('getCacheSize returns correct count', async () => {
    const { setCache, getCacheSize } = await loadCache();
    expect(getCacheSize()).toBe(0);
    setCache('a', 1, 60_000);
    expect(getCacheSize()).toBe(1);
    setCache('b', 2, 60_000);
    expect(getCacheSize()).toBe(2);
  });
});

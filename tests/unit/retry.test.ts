import { describe, expect, it, vi } from 'vitest';
import { retryWithBackoff } from '../../worker/src/retry';

describe('Retry with Backoff', () => {
  it('succeeds on first try (no retry)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { jitter: false });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { baseDelay: 1, jitter: false });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxRetries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelay: 1, jitter: false }),
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects maxDelay cap', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const start = Date.now();
    await retryWithBackoff(fn, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 1000,
      jitter: false,
    }).catch(() => {});
    const elapsed = Date.now() - start;
    expect(fn).toHaveBeenCalledTimes(3);
    expect(elapsed).toBeGreaterThanOrEqual(2000);
    expect(elapsed).toBeLessThan(5000);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

async function loadCircuitBreaker() {
  return import('../../worker/src/circuit-breaker');
}

describe('Circuit Breaker', () => {
  it('isCircuitOpen returns false for unknown endpoints', async () => {
    const { isCircuitOpen } = await loadCircuitBreaker();
    expect(isCircuitOpen('unknown')).toBe(false);
  });

  it('recordFailure increments failures', async () => {
    const { recordFailure, getCircuitStates } = await loadCircuitBreaker();
    recordFailure('ep');
    const states = getCircuitStates();
    expect(states.get('ep')?.failures).toBe(1);
    recordFailure('ep');
    expect(states.get('ep')?.failures).toBe(2);
  });

  it('recordFailure opens circuit after 3 failures', async () => {
    const { recordFailure, getCircuitStates } = await loadCircuitBreaker();
    recordFailure('ep');
    recordFailure('ep');
    recordFailure('ep');
    expect(getCircuitStates().get('ep')?.open).toBe(true);
  });

  it('isCircuitOpen returns true when circuit is open', async () => {
    const { recordFailure, isCircuitOpen } = await loadCircuitBreaker();
    recordFailure('ep');
    recordFailure('ep');
    recordFailure('ep');
    expect(isCircuitOpen('ep')).toBe(true);
  });

  it('recordSuccess resets failures', async () => {
    const { recordFailure, recordSuccess, getCircuitStates } = await loadCircuitBreaker();
    recordFailure('ep');
    recordFailure('ep');
    recordSuccess('ep');
    const state = getCircuitStates().get('ep');
    expect(state?.failures).toBe(0);
    expect(state?.open).toBe(false);
  });

  it('circuit auto-resets after 30 seconds', async () => {
    vi.useFakeTimers();
    try {
      const { recordFailure, isCircuitOpen } = await loadCircuitBreaker();
      recordFailure('ep');
      recordFailure('ep');
      recordFailure('ep');
      expect(isCircuitOpen('ep')).toBe(true);

      vi.advanceTimersByTime(30_001);

      expect(isCircuitOpen('ep')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

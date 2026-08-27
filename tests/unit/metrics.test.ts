import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../worker/src/logger', () => ({
  log: vi.fn(),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.mocked((await import('../../worker/src/logger')).log).mockClear();
});

async function loadMetrics() {
  return import('../../worker/src/metrics');
}

describe('Metrics', () => {
  it('metrics.requests starts at 0', async () => {
    const { metrics } = await loadMetrics();
    expect(metrics.requests).toBe(0);
  });

  it('recordUpstreamLatency stores values', async () => {
    const { recordUpstreamLatency, metrics } = await loadMetrics();
    recordUpstreamLatency('/api/data', 150);
    recordUpstreamLatency('/api/data', 200);
    expect(metrics.upstreamLatency.get('/api/data')).toEqual([150, 200]);
  });

  it('recordResponseTime stores values', async () => {
    const { recordResponseTime, metrics } = await loadMetrics();
    recordResponseTime('/api/data', 300);
    expect(metrics.responseTimes.get('/api/data')).toEqual([300]);
  });

  it('getMetricsSummary returns correct structure', async () => {
    const { metrics, recordUpstreamLatency, recordResponseTime, getMetricsSummary } =
      await loadMetrics();
    metrics.requests = 10;
    metrics.errors = 1;
    recordUpstreamLatency('/api', 100);
    recordUpstreamLatency('/api', 200);
    recordResponseTime('/api', 500);

    const summary = getMetricsSummary();
    expect(summary.requests).toBe(10);
    expect(summary.errors).toBe(1);
    expect(summary.errorRate).toBe(10);
    expect(summary.latency['/api']).toEqual({ avg: 150, p95: 200, count: 2 });
    expect(summary.responseTimes['/api']).toEqual({ avg: 500, count: 1 });
    expect(summary.alerts).toHaveProperty('errorRateHigh');
    expect(summary.alerts).toHaveProperty('slowResponse');
  });

  it('latency window capped at 100 samples', async () => {
    const { recordUpstreamLatency, metrics } = await loadMetrics();
    for (let i = 0; i < 110; i++) {
      recordUpstreamLatency('/api', i);
    }
    const arr = metrics.upstreamLatency.get('/api')!;
    expect(arr.length).toBe(100);
    expect(arr[0]).toBe(10);
    expect(arr[99]).toBe(109);
  });
});

import { log } from './logger';

export interface Metrics {
  requests: number;
  errors: number;
  upstreamLatency: Map<string, number[]>;
  responseTimes: Map<string, number[]>;
  alerts: {
    errorRateHigh: boolean;
    slowResponse: boolean;
  };
}

export const metrics: Metrics = {
  requests: 0,
  errors: 0,
  upstreamLatency: new Map(),
  responseTimes: new Map(),
  alerts: {
    errorRateHigh: false,
    slowResponse: false,
  },
};

export function recordUpstreamLatency(endpoint: string, ms: number): void {
  const arr = metrics.upstreamLatency.get(endpoint) || [];
  arr.push(ms);
  if (arr.length > 100) arr.shift();
  metrics.upstreamLatency.set(endpoint, arr);
}

export function recordResponseTime(endpoint: string, ms: number): void {
  const arr = metrics.responseTimes.get(endpoint) || [];
  arr.push(ms);
  if (arr.length > 100) arr.shift();
  metrics.responseTimes.set(endpoint, arr);
}

export function checkAlerts(): void {
  if (metrics.requests > 10) {
    const errorRate = (metrics.errors / metrics.requests) * 100;
    if (errorRate > 10 && !metrics.alerts.errorRateHigh) {
      metrics.alerts.errorRateHigh = true;
      log('warn', 'ALERT: Error rate exceeds 10%', {
        errorRate: errorRate.toFixed(2),
        requests: metrics.requests,
        errors: metrics.errors,
      });
    } else if (errorRate <= 10 && metrics.alerts.errorRateHigh) {
      metrics.alerts.errorRateHigh = false;
      log('info', 'ALERT RESOLVED: Error rate back to normal', { errorRate: errorRate.toFixed(2) });
    }
  }

  for (const [endpoint, times] of metrics.responseTimes) {
    if (times.length < 5) continue;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    if (avg > 5000 && !metrics.alerts.slowResponse) {
      metrics.alerts.slowResponse = true;
      log('warn', 'ALERT: Slow response times detected', { endpoint, avgMs: Math.round(avg) });
    } else if (avg <= 5000 && metrics.alerts.slowResponse) {
      metrics.alerts.slowResponse = false;
    }
  }
}

export function getMetricsSummary() {
  const latencySummary: Record<string, { avg: number; p95: number; count: number }> = {};
  for (const [key, values] of metrics.upstreamLatency) {
    const sorted = [...values].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    latencySummary[key] = { avg: Math.round(avg), p95: Math.round(p95), count: sorted.length };
  }

  const responseTimeSummary: Record<string, { avg: number; count: number }> = {};
  for (const [key, values] of metrics.responseTimes) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    responseTimeSummary[key] = { avg: Math.round(avg), count: values.length };
  }

  checkAlerts();

  return {
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0,
    latency: latencySummary,
    responseTimes: responseTimeSummary,
    alerts: { ...metrics.alerts },
  };
}

interface MetricEntry {
  value: number;
  timestamp: number;
}

const PREFIX = 'metric_history:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function storeMetric(key: string, value: number): void {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const entries: MetricEntry[] = raw ? JSON.parse(raw) : [];
    entries.push({ value, timestamp: Date.now() });
    const cutoff = Date.now() - MAX_AGE_MS;
    const pruned = entries.filter((e) => e.timestamp > cutoff);
    localStorage.setItem(PREFIX + key, JSON.stringify(pruned));
  } catch {}
}

export function getMetricHistory(key: string, hours = 24): MetricEntry[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const entries: MetricEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return entries.filter((e) => e.timestamp > cutoff);
  } catch {
    return [];
  }
}

export function getMetricTrend(key: string): 'increasing' | 'decreasing' | 'stable' {
  const history = getMetricHistory(key, 24);
  if (history.length < 2) return 'stable';

  const recent = history.slice(-10);
  const older = history.slice(0, -10);

  const recentAvg = recent.reduce((s, e) => s + e.value, 0) / recent.length;
  const olderAvg =
    older.length > 0 ? older.reduce((s, e) => s + e.value, 0) / older.length : recentAvg;

  const diff = recentAvg - olderAvg;
  const threshold = Math.abs(olderAvg) * 0.005 || 1e-10;

  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

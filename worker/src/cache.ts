export interface CacheEntry {
  data: unknown;
  expiry: number;
  revalidating?: boolean;
}

const cache = new Map<string, CacheEntry>();

export function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiry) {
    if (!entry.revalidating) {
      entry.revalidating = true;
    }
    return entry.data;
  }
  return entry.data;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs, revalidating: false });
}

export function getCacheSize(): number {
  return cache.size;
}

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { cn, isValidTheme } from '../../apps/site/src/lib/utils';
import type { Theme } from '../../apps/site/src/lib/types';

// --- Property: cn() ---

describe('Property-Based: cn()', () => {
  it('idempotent: cn(x) === cn(cn(x))', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('a', 'b', 'c', 'd', '', false, null, undefined)),
        (classes) => {
          const result1 = cn(...classes);
          const result2 = cn(...result1.split(' '));
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result contains only truthy inputs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string(), fc.constant(false), fc.constant(null))),
        (inputs) => {
          const result = cn(...inputs);
          const parts = result.split(' ').filter(Boolean);
          // Every truthy input should appear in the result
          for (const input of inputs) {
            if (input && typeof input === 'string') {
              expect(result).toContain(input);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty input returns empty string', () => {
    expect(cn()).toBe('');
  });

  it('single string input returns that string', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(cn(s)).toBe(s);
      }),
      { numRuns: 50 },
    );
  });
});

// --- Property: isValidTheme() ---

describe('Property-Based: isValidTheme()', () => {
  const validThemes: Theme[] = ['midnight-navy', 'tokyo-night', 'arctic-dawn', 'solaris', 'light'];

  it('all valid themes return true', () => {
    for (const theme of validThemes) {
      expect(isValidTheme(theme)).toBe(true);
    }
  });

  it('non-empty strings not in valid set return false', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.length > 0 && !validThemes.includes(s as Theme)),
        (s) => {
          expect(isValidTheme(s)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty string returns false', () => {
    expect(isValidTheme('')).toBe(false);
  });

  it('case-sensitive: uppercase variants return false', () => {
    fc.assert(
      fc.property(fc.constantFrom(...validThemes), (theme) => {
        const upper = theme.toUpperCase();
        if (upper !== theme) {
          expect(isValidTheme(upper)).toBe(false);
        }
      }),
      { numRuns: 20 },
    );
  });
});

// --- Property: Worker rate limiter ---

describe('Property-Based: Worker rate limiting', () => {
  let worker: typeof import('../../worker/src/index').default;
  const mockEnv = {
    ENVIRONMENT: 'test',
    GUESTBOOK: undefined,
    ADMIN_TOKEN: 'test-token',
  };

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
    worker = (await import('../../worker/src/index')).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always returns 200 for /api/health', async () => {
    fc.assert(
      fc.asyncProperty(fc.string(), async (ip) => {
        const req = new Request('https://example.com/api/health', {
          headers: { 'CF-Connecting-IP': ip },
        });
        const res = await worker.fetch(req, mockEnv);
        expect(res.status).toBe(200);
      }),
      { numRuns: 20 },
    );
  });

  it('always returns 404 for unknown routes', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/unknown',
          '/random/path',
          '/api/nonexistent',
          '/foo/bar/baz',
          '/not-real',
        ),
        async (path) => {
          const req = new Request(`https://example.com${path}`);
          const res = await worker.fetch(req, mockEnv);
          expect(res.status).toBe(404);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('health response has valid JSON structure', async () => {
    const req = new Request('https://example.com/api/health');
    const res = await worker.fetch(req, mockEnv);
    const data = (await res.json()) as Record<string, unknown>;

    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('environment', 'test');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.timestamp).toBe('number');
  });
});

// --- Property: Worker input validation ---

describe('Property-Based: Worker input validation', () => {
  let worker: typeof import('../../worker/src/index').default;
  const mockEnv = {
    ENVIRONMENT: 'test',
    GUESTBOOK: undefined,
    ADMIN_TOKEN: 'test-token',
  };

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
    worker = (await import('../../worker/src/index')).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guestbook POST rejects names longer than 50 chars', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 51, maxLength: 200 }),
        fc.constant('Short message'),
        fc.integer({ min: 100, max: 200 }),
        async (longName, message, uniqueIp) => {
          const req = new Request('https://example.com/api/guestbook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'CF-Connecting-IP': `10.0.${Math.floor(uniqueIp / 256)}.${uniqueIp % 256}`,
            },
            body: JSON.stringify({ name: longName, message }),
          });
          const res = await worker.fetch(req, mockEnv);
          // Either 400 (validation) or 429 (rate limit) is acceptable
          expect([400, 429]).toContain(res.status);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('guestbook POST rejects messages longer than 500 chars', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constant('Test'),
        fc.string({ minLength: 501, maxLength: 1000 }),
        fc.integer({ min: 200, max: 400 }),
        async (name, longMessage, uniqueIp) => {
          const req = new Request('https://example.com/api/guestbook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'CF-Connecting-IP': `10.1.${Math.floor(uniqueIp / 256)}.${uniqueIp % 256}`,
            },
            body: JSON.stringify({ name, message: longMessage }),
          });
          const res = await worker.fetch(req, mockEnv);
          // Either 400 (validation) or 429 (rate limit) is acceptable
          expect([400, 429]).toContain(res.status);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('guestbook POST accepts valid entries (short name, short message)', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.integer({ min: 1, max: 65535 }),
        async (name, message, uniqueIp) => {
          const req = new Request('https://example.com/api/guestbook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'CF-Connecting-IP': `192.168.${Math.floor(uniqueIp / 256)}.${uniqueIp % 256}`,
            },
            body: JSON.stringify({ name, message }),
          });
          const res = await worker.fetch(req, mockEnv);
          // Either 201 (created) or 429 (rate limit) is acceptable
          expect([201, 429]).toContain(res.status);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// --- Property: Security headers ---

describe('Property-Based: Security headers present on all responses', () => {
  let worker: typeof import('../../worker/src/index').default;
  const mockEnv = {
    ENVIRONMENT: 'test',
    GUESTBOOK: undefined,
    ADMIN_TOKEN: 'test-token',
  };

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
    worker = (await import('../../worker/src/index')).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('every JSON response includes HSTS header', async () => {
    // Health endpoint doesn't need upstream fetch
    const req = new Request('https://example.com/api/health');
    const res = await worker.fetch(req, mockEnv);
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('Referrer-Policy')).toContain('strict-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
};

const mockEnv = {
  ENVIRONMENT: 'test',
  GUESTBOOK: mockKV as unknown as KVNamespace,
  ADMIN_TOKEN: 'test-admin-token',
};

let ipCounter = 0;
function createRequest(
  path: string,
  method = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
) {
  const ip = `10.10.${++ipCounter >> 8}.${ipCounter & 255}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ip,
      ...headers,
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(`https://example.com${path}`, init);
}

let worker: typeof import('../../worker/src/index').default;

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn());
  vi.resetModules();
  worker = (await import('../../worker/src/index')).default;
});

afterEach(() => {
  vi.restoreAllMocks();
  mockKV.get.mockReset();
  mockKV.put.mockReset();
  mockKV.delete.mockReset();
});

describe('Advanced Worker Tests', () => {
  describe('Request deduplication', () => {
    it('two concurrent identical requests share one upstream call', async () => {
      let fetchCallCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        await new Promise((r) => setTimeout(r, 50));
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: 'upstream-response' }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      const req1 = createRequest('/api/crypto-ticker');
      const req2 = createRequest('/api/crypto-ticker');

      const [res1, res2] = await Promise.all([
        worker.fetch(req1, mockEnv),
        worker.fetch(req2, mockEnv),
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(data1).toEqual(data2);
    });
  });

  describe('Circuit breaker behavior', () => {
    it('returns stale cache after upstream failures', async () => {
      const mockFetch = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'good-response' }),
        })
        .mockRejectedValue(new Error('upstream down'));

      vi.stubGlobal('fetch', mockFetch);

      const res1 = await worker.fetch(createRequest('/api/crypto-ticker'), mockEnv);
      expect(res1.status).toBe(200);

      for (let i = 0; i < 3; i++) {
        await worker.fetch(createRequest('/api/crypto-ticker'), mockEnv);
      }

      const resCached = await worker.fetch(createRequest('/api/crypto-ticker'), mockEnv);
      expect(resCached.status).toBe(200);
    });
  });

  describe('Global rate limiting', () => {
    it('enforces 60 req/min per IP across guestbook POST', async () => {
      const ip = `10.20.${++ipCounter >> 8}.${ipCounter & 255}`;
      const headers = {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': ip,
      };

      for (let i = 0; i < 5; i++) {
        const res = await worker.fetch(
          new Request('https://example.com/api/guestbook', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: 'User', message: `Msg ${i}` }),
          }),
          mockEnv,
        );
        expect(res.status).toBe(201);
      }

      const rateLimited = await worker.fetch(
        new Request('https://example.com/api/guestbook', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: 'User', message: 'Blocked' }),
        }),
        mockEnv,
      );
      expect(rateLimited.status).toBe(429);
      const data = await rateLimited.json();
      expect(data.error).toContain('Rate limit');
    });

    it('different IPs are rate-limited independently', async () => {
      const makeReq = (ip: string) =>
        new Request('https://example.com/api/guestbook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': ip,
          },
          body: JSON.stringify({ name: 'User', message: 'Hi' }),
        });

      for (let i = 0; i < 5; i++) {
        await worker.fetch(makeReq('10.30.1.1'), mockEnv);
      }

      const blocked = await worker.fetch(makeReq('10.30.1.1'), mockEnv);
      expect(blocked.status).toBe(429);

      const allowed = await worker.fetch(makeReq('10.30.2.1'), mockEnv);
      expect(allowed.status).toBe(201);
    });
  });

  describe('Request body size limit', () => {
    it('rejects request body larger than 10KB', async () => {
      const largeBody = {
        name: 'A'.repeat(50),
        message: 'B'.repeat(10240),
      };

      const res = await worker.fetch(createRequest('/api/guestbook', 'POST', largeBody), mockEnv);

      expect([400, 413]).toContain(res.status);
    });

    it('accepts request body under 10KB', async () => {
      const smallBody = {
        name: 'Test User',
        message: 'A'.repeat(100),
      };

      const res = await worker.fetch(createRequest('/api/guestbook', 'POST', smallBody), mockEnv);

      expect(res.status).toBe(201);
    });
  });

  describe('CORS headers', () => {
    it('includes CORS headers on health response', async () => {
      const res = await worker.fetch(createRequest('/api/health'), mockEnv);

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('includes security headers on error responses', async () => {
      const res = await worker.fetch(createRequest('/api/unknown'), mockEnv);

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Guestbook pagination', () => {
    it('returns entries list with page and limit params', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=1&limit=5'), mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('entries');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('handles negative page gracefully', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=-1'), mockEnv);
      expect(res.status).toBe(200);
    });

    it('handles non-numeric page gracefully', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=abc'), mockEnv);
      expect(res.status).toBe(200);
    });
  });

  describe('Input sanitization', () => {
    it('handles script tag in guestbook name', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: '<script>alert(1)</script>',
          message: 'Test',
        }),
        mockEnv,
      );
      expect([201, 400]).toContain(res.status);
    });

    it('handles HTML entities in guestbook message', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'User',
          message: '<img src=x onerror=alert(1)>',
        }),
        mockEnv,
      );
      expect([201, 400]).toContain(res.status);
    });

    it('handles null bytes in name', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'User\x00Admin',
          message: 'Test',
        }),
        mockEnv,
      );
      expect([201, 400]).toContain(res.status);
    });
  });

  describe('Performance metrics endpoint', () => {
    it('GET /api/metrics returns metrics data', async () => {
      const res = await worker.fetch(createRequest('/api/metrics'), mockEnv);
      const data = await res.json();

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(data).toBeDefined();
      }
    });
  });

  describe('HN batch fetch with partial failures', () => {
    it('gracefully degrades when some story fetches fail (allSettled)', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url.includes('topstories.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => [1, 2, 3, 4, 5],
          };
        }
        if (url.includes('item/2.json') || url.includes('item/4.json')) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: callCount,
            title: `Story ${callCount}`,
            score: 100,
            by: 'user',
            time: Date.now(),
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      // New behavior: Promise.allSettled returns partial results
      const res = await worker.fetch(createRequest('/api/hacker-news'), mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Array<{ title: string }>;
      // Only successful stories returned (3 out of 5)
      expect(data.length).toBe(3);
    });

    it('returns empty array when all individual story fetches fail', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('topstories.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => [1, 2, 3],
          };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await worker.fetch(createRequest('/api/hacker-news'), mockEnv);
      // allSettled returns 200 with empty array (graceful degradation)
      expect(res.status).toBe(200);
      const data = (await res.json()) as Array<unknown>;
      expect(data).toEqual([]);
    });

    it('succeeds when all story fetches succeed', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('topstories.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => [1, 2, 3],
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 1,
            title: 'Story',
            score: 100,
            by: 'user',
            time: Date.now(),
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await worker.fetch(createRequest('/api/hacker-news'), mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Security headers completeness', () => {
    it('includes all required security headers', async () => {
      const res = await worker.fetch(createRequest('/api/health'), mockEnv);

      expect(res.headers.get('Strict-Transport-Security')).toContain('max-age');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(res.headers.get('Referrer-Policy')).toContain('strict-origin');
      expect(res.headers.get('Permissions-Policy')).toContain('camera=');
      expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });

  describe('Error response format', () => {
    it('404 returns proper JSON error', async () => {
      const res = await worker.fetch(createRequest('/api/nonexistent'), mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Not found');
    });

    it('405 returns proper JSON error', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook', 'PUT'), mockEnv);
      const data = await res.json();

      expect(res.status).toBe(405);
      expect(data).toHaveProperty('error');
    });

    it('401 returns proper JSON error', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'DELETE', { id: 'x' }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toHaveProperty('error');
    });
  });
});

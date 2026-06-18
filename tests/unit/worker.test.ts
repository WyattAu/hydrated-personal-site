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
  const ip = `127.0.0.${++ipCounter}`;
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

describe('Worker Endpoints', () => {
  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await worker.fetch(createRequest('/api/health'), mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('timestamp');
      expect(data.environment).toBe('test');
    });
  });

  describe('GET /api/guestbook', () => {
    it('returns guestbook entries', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook'), mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('entries');
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.entries.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/guestbook', () => {
    it('creates a new entry', async () => {
      mockKV.put.mockResolvedValue(undefined);

      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', { name: 'Test User', message: 'Hello!' }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.entry).toHaveProperty('id');
      expect(data.entry.name).toBe('Test User');
      expect(data.entry.message).toBe('Hello!');
    });

    it('rejects entry without name', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', { message: 'Hello!' }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('rejects entry without message', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', { name: 'Test' }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('message');
    });

    it('rejects entry with name too long', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'A'.repeat(51),
          message: 'Short',
        }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('too long');
    });

    it('rejects entry with message too long', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'Test',
          message: 'A'.repeat(501),
        }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('too long');
    });

    it('handles honeypot field silently', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'Bot',
          message: 'Spam',
          website: 'https://spam.com',
        }),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('rejects invalid JSON', async () => {
      const res = await new Request('https://example.com/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
        body: 'not json',
      });

      const result = await worker.fetch(res, mockEnv);
      const data = await result.json();

      expect(result.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });
  });

  describe('DELETE /api/guestbook', () => {
    it('deletes entry with valid auth', async () => {
      mockKV.delete.mockResolvedValue(undefined);

      const res = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          { id: 'entry-1' },
          {
            Authorization: 'Bearer test-admin-token',
          },
        ),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('rejects delete without auth', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'DELETE', { id: 'entry-1' }),
        mockEnv,
      );

      expect(res.status).toBe(401);
    });

    it('rejects delete with wrong token', async () => {
      const res = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          { id: 'entry-1' },
          {
            Authorization: 'Bearer wrong-token',
          },
        ),
        mockEnv,
      );

      expect(res.status).toBe(401);
    });

    it('rejects delete without id', async () => {
      const res = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          {},
          {
            Authorization: 'Bearer test-admin-token',
          },
        ),
        mockEnv,
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('id');
    });
  });

  describe('Method not allowed', () => {
    it('returns 405 for unsupported method on guestbook', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook', 'PUT'), mockEnv);

      expect(res.status).toBe(405);
    });
  });

  describe('Unknown routes', () => {
    it('returns 404 for unknown paths', async () => {
      const res = await worker.fetch(createRequest('/api/unknown'), mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Not found');
    });
  });

  describe('Security headers', () => {
    it('includes security headers in response', async () => {
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

  describe('JSON responses', () => {
    it('returns application/json content type', async () => {
      const res = await worker.fetch(createRequest('/api/health'), mockEnv);

      expect(res.headers.get('Content-Type')).toBe('application/json');
    });
  });
});

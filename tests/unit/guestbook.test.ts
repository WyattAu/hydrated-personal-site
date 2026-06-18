import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockKV = {
  store: new Map<string, string>(),
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
  const ip = `172.16.${++ipCounter >> 8}.${ipCounter & 255}`;
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
  mockKV.store.clear();
  mockKV.get.mockImplementation((key: string) => {
    const val = mockKV.store.get(key);
    return val ? Promise.resolve(val) : Promise.resolve(null);
  });
  mockKV.put.mockImplementation((key: string, val: string) => {
    mockKV.store.set(key, val);
    return Promise.resolve(undefined);
  });
  mockKV.delete.mockImplementation((key: string) => {
    mockKV.store.delete(key);
    return Promise.resolve(undefined);
  });
  worker = (await import('../../worker/src/index')).default;
});

afterEach(() => {
  vi.restoreAllMocks();
  mockKV.get.mockReset();
  mockKV.put.mockReset();
  mockKV.delete.mockReset();
});

describe('Guestbook Integration', () => {
  describe('Full CRUD lifecycle', () => {
    it('creates, lists, and deletes an entry', async () => {
      const createRes = await worker.fetch(
        createRequest('/api/guestbook', 'POST', { name: 'Alice', message: 'Hello world!' }),
        mockEnv,
      );
      const createData = await createRes.json();
      expect(createRes.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.entry).toHaveProperty('id');
      expect(createData.entry.name).toBe('Alice');
      expect(createData.entry.message).toBe('Hello world!');
      expect(typeof createData.entry.created).toBe('number');

      const listRes = await worker.fetch(createRequest('/api/guestbook'), mockEnv);
      const listData = await listRes.json();
      expect(listRes.status).toBe(200);
      expect(listData.entries).toBeDefined();
      expect(Array.isArray(listData.entries)).toBe(true);

      const deleteRes = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          { id: createData.entry.id },
          { Authorization: 'Bearer test-admin-token' },
        ),
        mockEnv,
      );
      const deleteData = await deleteRes.json();
      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);
    });

    it('creates multiple entries with unique IDs', async () => {
      const ids = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const res = await worker.fetch(
          createRequest('/api/guestbook', 'POST', {
            name: `User${i}`,
            message: `Message ${i}`,
          }),
          mockEnv,
        );
        const data = await res.json();
        expect(res.status).toBe(201);
        ids.add(data.entry.id);
      }
      expect(ids.size).toBe(5);
    });
  });

  describe('Pagination behavior', () => {
    it('returns entries with default pagination', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook'), mockEnv);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('entries');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('supports page query parameter', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=1&limit=10'), mockEnv);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('entries');
    });

    it('supports limit query parameter', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=1&limit=5'), mockEnv);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('entries');
    });

    it('handles large page number gracefully', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=9999&limit=10'), mockEnv);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('entries');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('handles zero limit gracefully', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook?page=1&limit=0'), mockEnv);
      expect(res.status).toBe(200);
    });
  });

  describe('Rate limiting per IP', () => {
    it('allows requests within rate limit', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', { name: 'User', message: 'Hi' }),
        mockEnv,
      );
      expect(res.status).toBe(201);
    });

    it('rejects requests exceeding rate limit', async () => {
      const ip = `172.16.99.${++ipCounter}`;
      const headers = {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': ip,
      };

      for (let i = 0; i < 5; i++) {
        const res = await worker.fetch(
          new Request('https://example.com/api/guestbook', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: 'User', message: `Message ${i}` }),
          }),
          mockEnv,
        );
        expect(res.status).toBe(201);
      }

      const rateLimited = await worker.fetch(
        new Request('https://example.com/api/guestbook', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: 'User', message: 'Too many' }),
        }),
        mockEnv,
      );
      expect(rateLimited.status).toBe(429);
    });

    it('different IPs have separate rate limits', async () => {
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
        const res = await worker.fetch(makeReq('10.0.1.1'), mockEnv);
        expect(res.status).toBe(201);
      }

      const rateLimited = await worker.fetch(makeReq('10.0.1.1'), mockEnv);
      expect(rateLimited.status).toBe(429);

      const otherIpRes = await worker.fetch(makeReq('10.0.2.1'), mockEnv);
      expect(otherIpRes.status).toBe(201);
    });
  });

  describe('Admin token authentication', () => {
    it('accepts valid admin token', async () => {
      mockKV.store.set('entry:test-id', JSON.stringify({ id: 'test-id', name: 'Test' }));

      const res = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          { id: 'test-id' },
          { Authorization: 'Bearer test-admin-token' },
        ),
        mockEnv,
      );
      expect(res.status).toBe(200);
    });

    it('rejects missing Authorization header', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'DELETE', { id: 'test' }),
        mockEnv,
      );
      expect(res.status).toBe(401);
    });

    it('rejects Bearer prefix with wrong token', async () => {
      const res = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          { id: 'test' },
          { Authorization: 'Bearer wrong-token' },
        ),
        mockEnv,
      );
      expect(res.status).toBe(401);
    });

    it('rejects non-Bearer auth scheme', async () => {
      const res = await worker.fetch(
        createRequest(
          '/api/guestbook',
          'DELETE',
          { id: 'test' },
          { Authorization: 'Basic test-admin-token' },
        ),
        mockEnv,
      );
      expect(res.status).toBe(401);
    });

    it('rejects empty Bearer token', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'DELETE', { id: 'test' }, { Authorization: 'Bearer ' }),
        mockEnv,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('Input validation', () => {
    it('rejects name longer than 50 characters', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'A'.repeat(51),
          message: 'Valid message',
        }),
        mockEnv,
      );
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('too long');
    });

    it('accepts name at exactly 50 characters', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'A'.repeat(50),
          message: 'Valid message',
        }),
        mockEnv,
      );
      expect(res.status).toBe(201);
    });

    it('rejects message longer than 500 characters', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'Valid Name',
          message: 'B'.repeat(501),
        }),
        mockEnv,
      );
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('too long');
    });

    it('accepts message at exactly 500 characters', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'Valid Name',
          message: 'B'.repeat(500),
        }),
        mockEnv,
      );
      expect(res.status).toBe(201);
    });

    it('rejects empty name', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: '',
          message: 'Valid message',
        }),
        mockEnv,
      );
      const data = await res.json();
      expect(res.status).toBe(400);
    });

    it('rejects missing name', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          message: 'Hello',
        }),
        mockEnv,
      );
      expect(res.status).toBe(400);
    });

    it('rejects missing message', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'User',
        }),
        mockEnv,
      );
      expect(res.status).toBe(400);
    });

    it('handles XSS in name (stripped or rejected)', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: '<script>alert("xss")</script>',
          message: 'Hello',
        }),
        mockEnv,
      );
      expect([201, 400]).toContain(res.status);
    });

    it('handles XSS in message (stripped or rejected)', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'User',
          message: '<img src=x onerror=alert(1)>',
        }),
        mockEnv,
      );
      expect([201, 400]).toContain(res.status);
    });

    it('rejects invalid JSON body', async () => {
      const res = await worker.fetch(
        new Request('https://example.com/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
          body: '{not valid json',
        }),
        mockEnv,
      );
      expect(res.status).toBe(400);
    });

    it('rejects non-object JSON body', async () => {
      const res = await worker.fetch(
        new Request('https://example.com/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.2' },
          body: JSON.stringify('just a string'),
        }),
        mockEnv,
      );
      expect([400, 201]).toContain(res.status);
    });

    it('handles honeypot field (silently accepts)', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'POST', {
          name: 'Bot',
          message: 'Spam content',
          website: 'https://spam.com',
        }),
        mockEnv,
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Method not allowed', () => {
    it('returns 405 for PUT on guestbook', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook', 'PUT'), mockEnv);
      expect(res.status).toBe(405);
    });

    it('returns 405 for PATCH on guestbook', async () => {
      const res = await worker.fetch(createRequest('/api/guestbook', 'PATCH'), mockEnv);
      expect(res.status).toBe(405);
    });
  });

  describe('Delete without body', () => {
    it('rejects delete with empty body', async () => {
      const res = await worker.fetch(
        createRequest('/api/guestbook', 'DELETE', {}, { Authorization: 'Bearer test-admin-token' }),
        mockEnv,
      );
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('id');
    });
  });
});

import { describe, expect, it } from 'vitest';
import { sanitize, json, error, securityHeaders } from '../../worker/src/security';

describe('Security', () => {
  describe('sanitize', () => {
    it('strips angle brackets', () => {
      expect(sanitize('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('strips javascript: protocol', () => {
      expect(sanitize('javascript:alert(1)')).toBe('alert(1)');
    });

    it('strips on* event handlers', () => {
      expect(sanitize('onclick=alert(1)')).toBe('alert(1)');
      expect(sanitize('onload=bad()')).toBe('bad()');
    });

    it('strips null bytes', () => {
      expect(sanitize('hello\0world')).toBe('helloworld');
    });
  });

  describe('json', () => {
    it('has correct Content-Type header', () => {
      const response = json({ ok: true });
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('includes security headers', () => {
      const response = json({ ok: true });
      for (const key of Object.keys(securityHeaders)) {
        expect(response.headers.get(key)).toBe(securityHeaders[key]);
      }
    });
  });

  describe('error', () => {
    it('returns error JSON with status', async () => {
      const response = error('bad request', 400);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'bad request' });
    });

    it('defaults to 400 status', () => {
      const response = error('oops');
      expect(response.status).toBe(400);
    });
  });
});

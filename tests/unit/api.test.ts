import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCoinGeckoGlobal,
  getCryptoTicker,
  getEarthquakes,
  getFearGreed,
  getHackerNews,
  getHealth,
  getKpIndex,
  getWeather,
} from '../../apps/site/src/lib/api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API Client', () => {
  describe('getCryptoTicker', () => {
    it('returns array of crypto prices', async () => {
      const mockData = {
        data: [
          { symbol: 'BTCUSDT', price: '50000', change24h: '1000', changePercent24h: '2.04' },
          { symbol: 'ETHUSDT', price: '3000', change24h: '50', changePercent24h: '1.69' },
        ],
      };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getCryptoTicker();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('change24h');
      expect(result[0]).toHaveProperty('changePercent24h');
    });

    it('sends correct URL', async () => {
      mockFetch.mockReturnValue(jsonResponse({ data: [] }));

      await getCryptoTicker();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/crypto-ticker',
        expect.objectContaining({ cache: 'no-cache' }),
      );
    });
  });

  describe('getWeather', () => {
    it('returns weather data object', async () => {
      const mockData = { temperature: 22, condition: 'Clear', location: 'New York' };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getWeather();

      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('condition');
      expect(result).toHaveProperty('location');
      expect(result.temperature).toBe(22);
    });
  });

  describe('getEarthquakes', () => {
    it('returns array of earthquake features', async () => {
      const mockData = {
        features: [
          {
            properties: {
              mag: 5.2,
              place: '100km NW of Tokyo',
              time: 1234567890,
              type: 'earthquake',
            },
            geometry: { coordinates: [139.0, 35.0, 10] },
          },
        ],
      };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getEarthquakes();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('properties');
      expect(result[0]).toHaveProperty('geometry');
      expect(result[0].properties.mag).toBe(5.2);
    });
  });

  describe('getHackerNews', () => {
    it('returns array of stories', async () => {
      const mockData = [
        {
          title: 'Cool Story',
          url: 'https://example.com',
          score: 100,
          by: 'user1',
          time: 1234567890,
        },
      ];
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getHackerNews();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('url');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('by');
      expect(result[0]).toHaveProperty('time');
    });
  });

  describe('getFearGreed', () => {
    it('returns fear greed data', async () => {
      const mockData = { value: '75', value_classification: 'Greed' };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getFearGreed();

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('value_classification');
    });
  });

  describe('getCoinGeckoGlobal', () => {
    it('returns global market data', async () => {
      const mockData = {
        data: {
          active_cryptocurrencies: 10000,
          markets: 800,
          total_market_cap: { usd: 2000000000000 },
          total_volume: { usd: 100000000000 },
          market_cap_percentage: { btc: 50 },
        },
      };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getCoinGeckoGlobal();

      expect(result).toHaveProperty('active_cryptocurrencies');
      expect(result).toHaveProperty('markets');
      expect(result).toHaveProperty('total_market_cap');
      expect(result.active_cryptocurrencies).toBe(10000);
    });
  });

  describe('getKpIndex', () => {
    it('returns kp index data', async () => {
      const mockData = { kp: 3, timestamp: '2025-01-01T00:00:00Z' };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getKpIndex();

      expect(result).toHaveProperty('kp');
      expect(result).toHaveProperty('timestamp');
      expect(result.kp).toBe(3);
    });
  });

  describe('getHealth', () => {
    it('returns health status', async () => {
      const mockData = { status: 'ok', timestamp: '2025-01-01T00:00:00Z' };
      mockFetch.mockReturnValue(jsonResponse(mockData));

      const result = await getHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result.status).toBe('ok');
    });
  });

  describe('Error handling', () => {
    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(jsonResponse({ error: 'not found' }, 404));

      await expect(getCryptoTicker()).rejects.toThrow('API error: 404');
    });

    it('throws on server error', async () => {
      mockFetch.mockReturnValue(jsonResponse({ error: 'internal' }, 500));

      await expect(getWeather()).rejects.toThrow('API error: 500');
    });

    it('throws on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(getHealth()).rejects.toThrow('Network error');
    });
  });

  describe('AbortSignal support', () => {
    it('passes signal to fetch', async () => {
      const controller = new AbortController();
      mockFetch.mockReturnValue(jsonResponse({ status: 'ok', timestamp: '' }));

      await getHealth(controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/health',
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});

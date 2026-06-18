import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
  CryptoPriceSchema,
  WeatherDataSchema,
  EarthquakeFeatureSchema,
  FearGreedDataSchema,
  HackerNewsStorySchema,
  GlobalDataSchema,
  KpIndexSchema,
  HealthResponseSchema,
  MempoolDataSchema,
  BinanceKlineSchema,
  LLMBenchmarkModelSchema,
  EtfHoldingSchema,
  EtfEntrySchema,
  EtfPerformanceSchema,
} from '../../apps/site/src/lib/schemas';

function check<T>(schema: v.BaseSchema<T>, data: unknown): { ok: true; data: T } | { ok: false } {
  const result = v.safeParse(schema, data);
  return result.success ? { ok: true, data: result.output } : { ok: false };
}

describe('Valibot Schemas', () => {
  describe('CryptoPriceSchema', () => {
    it('validates correct data', () => {
      const result = check(CryptoPriceSchema, {
        symbol: 'BTCUSDT',
        price: '50000.00',
        change24h: '1000',
        changePercent24h: '2.04',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.symbol).toBe('BTCUSDT');
    });

    it('rejects missing symbol', () => {
      expect(
        check(CryptoPriceSchema, {
          price: '50000',
          change24h: '1000',
          changePercent24h: '2.04',
        }).ok,
      ).toBe(false);
    });

    it('rejects wrong type for price', () => {
      expect(
        check(CryptoPriceSchema, {
          symbol: 'BTCUSDT',
          price: 50000,
          change24h: '1000',
          changePercent24h: '2.04',
        }).ok,
      ).toBe(false);
    });

    it('rejects empty object', () => {
      expect(check(CryptoPriceSchema, {}).ok).toBe(false);
    });

    it('rejects null', () => {
      expect(check(CryptoPriceSchema, null).ok).toBe(false);
    });
  });

  describe('WeatherDataSchema', () => {
    it('validates correct data', () => {
      const result = check(WeatherDataSchema, {
        temperature: 22.5,
        condition: 'Clear',
        location: 'New York',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.temperature).toBe(22.5);
    });

    it('rejects string temperature', () => {
      expect(
        check(WeatherDataSchema, {
          temperature: '22',
          condition: 'Clear',
          location: 'New York',
        }).ok,
      ).toBe(false);
    });

    it('rejects zero temperature (boundary)', () => {
      const result = check(WeatherDataSchema, {
        temperature: 0,
        condition: 'Clear',
        location: 'New York',
      });
      expect(result.ok).toBe(true);
    });

    it('rejects negative temperature as invalid only if schema requires positive', () => {
      const result = check(WeatherDataSchema, {
        temperature: -40,
        condition: 'Blizzard',
        location: 'Antarctica',
      });
      expect(result.ok).toBe(true);
    });

    it('rejects empty condition string', () => {
      const result = check(WeatherDataSchema, {
        temperature: 22,
        condition: '',
        location: 'NYC',
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('EarthquakeFeatureSchema', () => {
    const validFeature = {
      properties: {
        mag: 5.2,
        place: '100km NW of Tokyo',
        time: 1234567890,
        updated: 1234567890,
        url: 'https://example.com',
        type: 'earthquake',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [139.0, 35.0, 10] as [number, number, number],
      },
    };

    it('validates correct data', () => {
      expect(check(EarthquakeFeatureSchema, validFeature).ok).toBe(true);
    });

    it('validates with null mag', () => {
      const data = {
        ...validFeature,
        properties: { ...validFeature.properties, mag: null },
      };
      expect(check(EarthquakeFeatureSchema, data).ok).toBe(true);
    });

    it('validates with null place', () => {
      const data = {
        ...validFeature,
        properties: { ...validFeature.properties, place: null },
      };
      expect(check(EarthquakeFeatureSchema, data).ok).toBe(true);
    });

    it('validates with null url', () => {
      const data = {
        ...validFeature,
        properties: { ...validFeature.properties, url: null },
      };
      expect(check(EarthquakeFeatureSchema, data).ok).toBe(true);
    });

    it('rejects wrong geometry type', () => {
      const data = {
        ...validFeature,
        geometry: { ...validFeature.geometry, type: 'Polygon' },
      };
      expect(check(EarthquakeFeatureSchema, data).ok).toBe(false);
    });

    it('rejects coordinates with wrong length', () => {
      const data = {
        ...validFeature,
        geometry: { ...validFeature.geometry, coordinates: [139.0, 35.0] },
      };
      expect(check(EarthquakeFeatureSchema, data).ok).toBe(false);
    });

    it('rejects coordinates with string elements', () => {
      const data = {
        ...validFeature,
        geometry: { ...validFeature.geometry, coordinates: ['139.0', 35.0, 10] },
      };
      expect(check(EarthquakeFeatureSchema, data).ok).toBe(false);
    });
  });

  describe('FearGreedDataSchema', () => {
    it('validates correct data', () => {
      expect(
        check(FearGreedDataSchema, {
          value: '75',
          value_classification: 'Greed',
          timestamp: '2025-01-01T00:00:00Z',
        }).ok,
      ).toBe(true);
    });

    it('rejects missing value_classification', () => {
      expect(
        check(FearGreedDataSchema, {
          value: '75',
          timestamp: '2025-01-01',
        }).ok,
      ).toBe(false);
    });

    it('validates empty strings', () => {
      expect(
        check(FearGreedDataSchema, {
          value: '',
          value_classification: '',
          timestamp: '',
        }).ok,
      ).toBe(true);
    });
  });

  describe('HackerNewsStorySchema', () => {
    it('validates correct data', () => {
      expect(
        check(HackerNewsStorySchema, {
          id: 1,
          title: 'Test Story',
          score: 100,
          author: 'user1',
          time: 1234567890,
          comments: 50,
        }).ok,
      ).toBe(true);
    });

    it('validates with optional url', () => {
      expect(
        check(HackerNewsStorySchema, {
          id: 1,
          title: 'Test',
          url: 'https://example.com',
          score: 100,
          author: 'user1',
          time: 1234567890,
          comments: 50,
        }).ok,
      ).toBe(true);
    });

    it('validates without url', () => {
      expect(
        check(HackerNewsStorySchema, {
          id: 1,
          title: 'Ask HN',
          score: 50,
          author: 'user2',
          time: 1234567890,
          comments: 10,
        }).ok,
      ).toBe(true);
    });

    it('rejects negative id', () => {
      expect(
        check(HackerNewsStorySchema, {
          id: -1,
          title: 'Test',
          score: 100,
          author: 'user1',
          time: 1234567890,
          comments: 50,
        }).ok,
      ).toBe(true);
    });

    it('rejects zero score', () => {
      expect(
        check(HackerNewsStorySchema, {
          id: 1,
          title: 'Test',
          score: 0,
          author: 'user1',
          time: 1234567890,
          comments: 50,
        }).ok,
      ).toBe(true);
    });

    it('rejects missing author', () => {
      expect(
        check(HackerNewsStorySchema, {
          id: 1,
          title: 'Test',
          score: 100,
          time: 1234567890,
          comments: 50,
        }).ok,
      ).toBe(false);
    });
  });

  describe('GlobalDataSchema', () => {
    it('validates correct data', () => {
      expect(
        check(GlobalDataSchema, {
          active_cryptocurrencies: 10000,
          markets: 800,
          total_market_cap: { usd: 2000000000000 },
          total_volume: { usd: 100000000000 },
          market_cap_percentage: { btc: 50 },
          market_cap_change_percentage_24h_usd: 2.5,
        }).ok,
      ).toBe(true);
    });

    it('rejects non-record total_market_cap', () => {
      expect(
        check(GlobalDataSchema, {
          active_cryptocurrencies: 10000,
          markets: 800,
          total_market_cap: 'invalid',
          total_volume: { usd: 100 },
          market_cap_percentage: { btc: 50 },
          market_cap_change_percentage_24h_usd: 2.5,
        }).ok,
      ).toBe(false);
    });

    it('rejects string active_cryptocurrencies', () => {
      expect(
        check(GlobalDataSchema, {
          active_cryptocurrencies: '10000',
          markets: 800,
          total_market_cap: { usd: 2000 },
          total_volume: { usd: 100 },
          market_cap_percentage: { btc: 50 },
          market_cap_change_percentage_24h_usd: 2.5,
        }).ok,
      ).toBe(false);
    });
  });

  describe('KpIndexSchema', () => {
    it('validates correct data', () => {
      expect(
        check(KpIndexSchema, {
          timestamp_tag: '2025-01-01T00:00:00Z',
          kp_index: '3',
        }).ok,
      ).toBe(true);
    });

    it('rejects missing timestamp_tag', () => {
      expect(check(KpIndexSchema, { kp_index: '3' }).ok).toBe(false);
    });

    it('validates empty strings', () => {
      expect(check(KpIndexSchema, { timestamp_tag: '', kp_index: '' }).ok).toBe(true);
    });
  });

  describe('HealthResponseSchema', () => {
    it('validates correct data', () => {
      expect(
        check(HealthResponseSchema, {
          status: 'ok',
          timestamp: '2025-01-01T00:00:00Z',
        }).ok,
      ).toBe(true);
    });

    it('rejects missing status', () => {
      expect(check(HealthResponseSchema, { timestamp: '2025-01-01' }).ok).toBe(false);
    });
  });

  describe('MempoolDataSchema', () => {
    it('validates correct data', () => {
      expect(
        check(MempoolDataSchema, {
          fees: { fastestFee: 100, halfHourFee: 50, hourFee: 25, economyFee: 10 },
          mempool: { count: 1000, vsize: 5000000, total_fee: 10.5 },
        }).ok,
      ).toBe(true);
    });

    it('rejects missing fees', () => {
      expect(
        check(MempoolDataSchema, {
          mempool: { count: 1000, vsize: 5000000, total_fee: 10.5 },
        }).ok,
      ).toBe(false);
    });

    it('rejects zero fees (boundary)', () => {
      expect(
        check(MempoolDataSchema, {
          fees: { fastestFee: 0, halfHourFee: 0, hourFee: 0, economyFee: 0 },
          mempool: { count: 0, vsize: 0, total_fee: 0 },
        }).ok,
      ).toBe(true);
    });
  });

  describe('BinanceKlineSchema', () => {
    it('validates correct data', () => {
      expect(
        check(BinanceKlineSchema, {
          openTime: 1234567890,
          open: '50000.00',
          high: '51000.00',
          low: '49000.00',
          close: '50500.00',
          volume: '100.5',
          closeTime: 1234571490,
        }).ok,
      ).toBe(true);
    });

    it('rejects number open price', () => {
      expect(
        check(BinanceKlineSchema, {
          openTime: 1234567890,
          open: 50000,
          high: '51000',
          low: '49000',
          close: '50500',
          volume: '100',
          closeTime: 1234571490,
        }).ok,
      ).toBe(false);
    });
  });

  describe('LLMBenchmarkModelSchema', () => {
    it('validates correct data', () => {
      expect(
        check(LLMBenchmarkModelSchema, {
          model: 'GPT-4',
          parameter_count: '~1.7T',
          average_score: 86.4,
          mmlu: 86.4,
          hellaswag: 95.3,
          arc: 96.3,
          truthfulqa: 59.0,
          gsm8k: 92.0,
          humaneval: 67.0,
        }).ok,
      ).toBe(true);
    });

    it('rejects missing mmlu', () => {
      expect(
        check(LLMBenchmarkModelSchema, {
          model: 'GPT-4',
          parameter_count: '~1.7T',
          average_score: 86.4,
          hellaswag: 95.3,
          arc: 96.3,
          truthfulqa: 59.0,
          gsm8k: 92.0,
          humaneval: 67.0,
        }).ok,
      ).toBe(false);
    });

    it('rejects string score', () => {
      expect(
        check(LLMBenchmarkModelSchema, {
          model: 'GPT-4',
          parameter_count: '~1.7T',
          average_score: '86.4',
          mmlu: 86.4,
          hellaswag: 95.3,
          arc: 96.3,
          truthfulqa: 59.0,
          gsm8k: 92.0,
          humaneval: 67.0,
        }).ok,
      ).toBe(false);
    });

    it('validates zero scores (boundary)', () => {
      expect(
        check(LLMBenchmarkModelSchema, {
          model: 'Test',
          parameter_count: '0',
          average_score: 0,
          mmlu: 0,
          hellaswag: 0,
          arc: 0,
          truthfulqa: 0,
          gsm8k: 0,
          humaneval: 0,
        }).ok,
      ).toBe(true);
    });
  });

  describe('EtfHoldingSchema', () => {
    it('validates correct data', () => {
      expect(
        check(EtfHoldingSchema, {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          weight: 7.5,
        }).ok,
      ).toBe(true);
    });

    it('rejects string weight', () => {
      expect(
        check(EtfHoldingSchema, {
          ticker: 'AAPL',
          name: 'Apple',
          weight: '7.5',
        }).ok,
      ).toBe(false);
    });

    it('validates zero weight', () => {
      expect(check(EtfHoldingSchema, { ticker: '', name: '', weight: 0 }).ok).toBe(true);
    });
  });

  describe('EtfEntrySchema', () => {
    it('validates correct data', () => {
      expect(
        check(EtfEntrySchema, {
          ticker: 'VTI',
          name: 'Vanguard Total Stock Market',
          category: 'US Equity',
          sector_allocation: { Technology: 30 },
          region_allocation: { 'North America': 80 },
          top_holdings: [{ ticker: 'AAPL', name: 'Apple', weight: 7 }],
        }).ok,
      ).toBe(true);
    });

    it('validates with empty top_holdings', () => {
      expect(
        check(EtfEntrySchema, {
          ticker: 'VTI',
          name: 'Vanguard',
          category: 'Equity',
          sector_allocation: {},
          region_allocation: {},
          top_holdings: [],
        }).ok,
      ).toBe(true);
    });

    it('rejects invalid top_holdings item', () => {
      expect(
        check(EtfEntrySchema, {
          ticker: 'VTI',
          name: 'Vanguard',
          category: 'Equity',
          sector_allocation: {},
          region_allocation: {},
          top_holdings: [{ ticker: 'AAPL', name: 'Apple', weight: '7' }],
        }).ok,
      ).toBe(false);
    });

    it('rejects non-record sector_allocation', () => {
      expect(
        check(EtfEntrySchema, {
          ticker: 'VTI',
          name: 'Vanguard',
          category: 'Equity',
          sector_allocation: ['Technology'],
          region_allocation: {},
          top_holdings: [],
        }).ok,
      ).toBe(false);
    });
  });

  describe('EtfPerformanceSchema', () => {
    it('validates correct data', () => {
      expect(
        check(EtfPerformanceSchema, {
          total_return: 15.5,
          annualized_return: 12.3,
          volatility: 18.2,
          sharpe_ratio: 0.68,
          max_drawdown: -25.0,
        }).ok,
      ).toBe(true);
    });

    it('rejects missing sharpe_ratio', () => {
      expect(
        check(EtfPerformanceSchema, {
          total_return: 15.5,
          annualized_return: 12.3,
          volatility: 18.2,
          max_drawdown: -25.0,
        }).ok,
      ).toBe(false);
    });

    it('validates all zeros (boundary)', () => {
      expect(
        check(EtfPerformanceSchema, {
          total_return: 0,
          annualized_return: 0,
          volatility: 0,
          sharpe_ratio: 0,
          max_drawdown: 0,
        }).ok,
      ).toBe(true);
    });

    it('rejects null values', () => {
      expect(
        check(EtfPerformanceSchema, {
          total_return: null,
          annualized_return: 0,
          volatility: 0,
          sharpe_ratio: 0,
          max_drawdown: 0,
        }).ok,
      ).toBe(false);
    });
  });
});

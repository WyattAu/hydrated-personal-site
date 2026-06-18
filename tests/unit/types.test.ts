import { describe, expect, it } from 'vitest';
import type {
  BinanceTicker,
  EarthquakeFeature,
  EarthquakeResponse,
  EtfEntry,
  EtfHolding,
  HNStory,
  LLMBenchmarkModel,
  NavItem,
  Project,
  SocialLink,
  Theme,
  ThemeConfig,
} from '../../apps/site/src/lib/types';

describe('Type Guards and Type Utilities', () => {
  describe('Theme type', () => {
    it('accepts valid theme values', () => {
      const themes: Theme[] = ['midnight-navy', 'tokyo-night', 'arctic-dawn', 'solaris', 'light'];
      expect(themes).toHaveLength(5);
      themes.forEach((t) => {
        expect(typeof t).toBe('string');
      });
    });
  });

  describe('ThemeConfig interface', () => {
    it('has all required properties', () => {
      const config: ThemeConfig = {
        name: 'midnight-navy',
        label: 'Midnight Navy',
        bgPrimary: '#0a0e1a',
        bgSecondary: '#111827',
        bgCard: '#1a1f35',
        textPrimary: '#e2e8f0',
        textSecondary: '#94a3b8',
        accent: '#3b82f6',
        accentWarm: '#f59e0b',
        border: '#1e293b',
      };

      expect(config.name).toBe('midnight-navy');
      expect(config.bgPrimary).toBeTruthy();
      expect(config.accent).toBeTruthy();
    });
  });

  describe('NavItem interface', () => {
    it('supports required fields', () => {
      const item: NavItem = { label: 'Home', href: '/' };
      expect(item.label).toBe('Home');
      expect(item.href).toBe('/');
      expect(item.external).toBeUndefined();
    });

    it('supports optional external field', () => {
      const item: NavItem = { label: 'GitHub', href: 'https://github.com', external: true };
      expect(item.external).toBe(true);
    });
  });

  describe('Project interface', () => {
    it('has all required fields', () => {
      const project: Project = {
        title: 'Test Project',
        description: 'A test project',
        language: 'TypeScript',
        repo: 'https://github.com/test/project',
        featured: true,
      };

      expect(project.title).toBe('Test Project');
      expect(project.featured).toBe(true);
    });
  });

  describe('SocialLink interface', () => {
    it('has required fields', () => {
      const link: SocialLink = {
        platform: 'GitHub',
        url: 'https://github.com/test',
        label: 'GitHub Profile',
      };

      expect(link.platform).toBe('GitHub');
    });
  });

  describe('EarthquakeFeature interface', () => {
    it('matches expected structure', () => {
      const feature: EarthquakeFeature = {
        type: 'Feature',
        properties: {
          mag: 5.2,
          place: '100km NW of Tokyo',
          time: 1234567890,
          updated: 1234567890,
          url: 'https://example.com',
          type: 'earthquake',
        },
        geometry: {
          type: 'Point',
          coordinates: [139.0, 35.0, 10],
        },
      };

      expect(feature.type).toBe('Feature');
      expect(feature.properties.mag).toBe(5.2);
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toHaveLength(3);
    });

    it('handles null mag and place', () => {
      const feature: EarthquakeFeature = {
        type: 'Feature',
        properties: {
          mag: null,
          place: null,
          time: 1234567890,
          updated: 1234567890,
          url: null,
          type: 'earthquake',
        },
        geometry: {
          type: 'Point',
          coordinates: [0, 0, 0],
        },
      };

      expect(feature.properties.mag).toBeNull();
      expect(feature.properties.place).toBeNull();
    });
  });

  describe('EarthquakeResponse interface', () => {
    it('has type and features array', () => {
      const response: EarthquakeResponse = {
        type: 'FeatureCollection',
        features: [],
      };

      expect(response.type).toBe('FeatureCollection');
      expect(Array.isArray(response.features)).toBe(true);
    });
  });

  describe('BinanceTicker interface', () => {
    it('has all required fields', () => {
      const ticker: BinanceTicker = {
        symbol: 'BTCUSDT',
        lastPrice: '50000.00',
        priceChangePercent: '2.5',
        volume: '1000',
        quoteVolume: '50000000',
      };

      expect(ticker.symbol).toBe('BTCUSDT');
      expect(typeof ticker.lastPrice).toBe('string');
    });
  });

  describe('HNStory interface', () => {
    it('has all required fields', () => {
      const story: HNStory = {
        id: 1,
        title: 'Test Story',
        url: 'https://example.com',
        score: 100,
        author: 'user1',
        time: 1234567890,
        comments: 50,
      };

      expect(story.title).toBe('Test Story');
      expect(story.score).toBe(100);
    });

    it('allows optional url', () => {
      const story: HNStory = {
        id: 2,
        title: 'Ask HN',
        score: 50,
        author: 'user2',
        time: 1234567890,
        comments: 10,
      };

      expect(story.url).toBeUndefined();
    });
  });

  describe('EtfHolding interface', () => {
    it('has required fields', () => {
      const holding: EtfHolding = {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        weight: 7.5,
      };

      expect(holding.ticker).toBe('AAPL');
      expect(holding.weight).toBe(7.5);
    });
  });

  describe('EtfEntry interface', () => {
    it('has all required fields', () => {
      const entry: EtfEntry = {
        ticker: 'VTI',
        name: 'Vanguard Total Stock Market',
        category: 'US Equity',
        sector_allocation: { Technology: 30, Healthcare: 15 },
        region_allocation: { 'North America': 80 },
        top_holdings: [{ ticker: 'AAPL', name: 'Apple', weight: 7 }],
      };

      expect(entry.ticker).toBe('VTI');
      expect(Object.keys(entry.sector_allocation)).toContain('Technology');
    });
  });

  describe('LLMBenchmarkModel interface', () => {
    it('has all benchmark scores', () => {
      const model: LLMBenchmarkModel = {
        model: 'GPT-4',
        parameter_count: '~1.7T',
        average_score: 86.4,
        mmlu: 86.4,
        hellaswag: 95.3,
        arc: 96.3,
        truthfulqa: 59.0,
        gsm8k: 92.0,
        humaneval: 67.0,
      };

      expect(model.model).toBe('GPT-4');
      expect(model.mmlu).toBeGreaterThan(0);
      expect(model.humaneval).toBeGreaterThan(0);
    });
  });
});

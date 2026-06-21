export type Theme = 'midnight-navy' | 'tokyo-night' | 'arctic-dawn' | 'solaris' | 'light';

export interface ThemeConfig {
  name: Theme;
  label: string;
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentWarm: string;
  border: string;
}

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface Project {
  title: string;
  description: string;
  language: string;
  repo: string;
  featured: boolean;
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

// World Monitor types

export interface EarthquakeFeature {
  type: 'Feature';
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    updated: number;
    url: string | null;
    type: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number];
  };
}

export interface EarthquakeResponse {
  type: 'FeatureCollection';
  features: EarthquakeFeature[];
}

export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

export interface CoinGeckoGlobalData {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface FearGreedResponse {
  data: {
    value: string;
    value_classification: string;
    timestamp: string;
  }[];
}

export interface KpIndexResponse {
  timestamp_tag: string;
  kp_index: string;
}

export interface MempoolData {
  fees: {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
  };
  mempool: {
    count: number;
    vsize: number;
    total_fee: number;
  };
}

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  author: string;
  time: number;
  comments: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  topics?: string[];
}

export interface GitHubTrendingResponse {
  items: GitHubRepo[];
}

export interface LLMBenchmarkModel {
  model: string;
  parameter_count: string;
  average_score: number;
  mmlu: number;
  hellaswag: number;
  arc: number;
  truthfulqa: number;
  gsm8k: number;
  humaneval: number;
  /** Optional cost in USD per million tokens. Populated from upstream leaderboard when available. */
  price_per_m_token?: number;
  /** Optional inference throughput. Populated from upstream leaderboard when available. */
  tokens_per_sec?: number;
}

export interface PriceChartProps {
  symbol?: string;
  title?: string;
}

export interface DataSourceTimestamp {
  key: string;
  label: string;
  timestamp: number;
  ttlMs: number;
}

// ETF Intelligence types

export interface EtfHolding {
  ticker: string;
  name: string;
  weight: number;
}

export interface EtfEntry {
  ticker: string;
  name: string;
  category: string;
  sector_allocation: Record<string, number>;
  region_allocation: Record<string, number>;
  top_holdings: EtfHolding[];
}

export interface EtfPerformance {
  total_return: number;
  annualized_return: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
}

// API client types

export interface CryptoPrice {
  symbol: string;
  price: string;
  change24h: string;
  changePercent24h: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

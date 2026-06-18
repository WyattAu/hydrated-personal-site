const API_BASE = '/api';

interface ApiOptions {
  cache?: RequestCache;
  signal?: AbortSignal;
}

async function fetchJson<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    cache: options.cache ?? 'no-cache',
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export interface CryptoPrice {
  symbol: string;
  price: string;
  change24h: string;
  changePercent24h: string;
}

export async function getCryptoTicker(signal?: AbortSignal): Promise<CryptoPrice[]> {
  const data = await fetchJson<{ data: CryptoPrice[] }>('/crypto-ticker', { signal });
  return data.data;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}

export async function getWeather(signal?: AbortSignal): Promise<WeatherData> {
  return fetchJson<WeatherData>('/weather', { signal });
}

export interface EarthquakeFeature {
  properties: {
    mag: number;
    place: string;
    time: number;
    type: string;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

export async function getEarthquakes(signal?: AbortSignal): Promise<EarthquakeFeature[]> {
  const data = await fetchJson<{ features: EarthquakeFeature[] }>('/earthquakes', { signal });
  return data.features;
}

export interface FearGreedData {
  value: string;
  value_classification: string;
}

export async function getFearGreed(signal?: AbortSignal): Promise<FearGreedData> {
  return fetchJson<FearGreedData>('/fear-greed', { signal });
}

export interface HackerNewsStory {
  title: string;
  url: string;
  score: number;
  by: string;
  time: number;
}

export async function getHackerNews(signal?: AbortSignal): Promise<HackerNewsStory[]> {
  return fetchJson<HackerNewsStory[]>('/hacker-news', { signal });
}

export interface GlobalData {
  active_cryptocurrencies: number;
  markets: number;
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
}

export async function getCoinGeckoGlobal(signal?: AbortSignal): Promise<GlobalData> {
  const data = await fetchJson<{ data: GlobalData }>('/coingecko-global', { signal });
  return data.data;
}

export interface KpIndex {
  kp: number;
  timestamp: string;
}

export async function getKpIndex(signal?: AbortSignal): Promise<KpIndex> {
  return fetchJson<KpIndex>('/kp-index', { signal });
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/health', { signal });
}

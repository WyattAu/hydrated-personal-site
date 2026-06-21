import type {
  CoinGeckoGlobalData,
  CryptoPrice,
  EarthquakeFeature,
  EarthquakeResponse,
  FearGreedResponse,
  HNStory,
  HealthResponse,
  KpIndexResponse,
  WeatherData,
} from './types';

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

export async function getCryptoTicker(signal?: AbortSignal): Promise<CryptoPrice[]> {
  const data = await fetchJson<{ data: CryptoPrice[] }>('/crypto-ticker', { signal });
  return data.data;
}

export async function getWeather(signal?: AbortSignal): Promise<WeatherData> {
  return fetchJson<WeatherData>('/weather', { signal });
}

export async function getEarthquakes(signal?: AbortSignal): Promise<EarthquakeFeature[]> {
  const data = await fetchJson<EarthquakeResponse>('/earthquakes', { signal });
  return data.features;
}

export async function getFearGreed(signal?: AbortSignal): Promise<FearGreedResponse> {
  return fetchJson<FearGreedResponse>('/fear-greed', { signal });
}

export async function getHackerNews(signal?: AbortSignal): Promise<HNStory[]> {
  return fetchJson<HNStory[]>('/hacker-news', { signal });
}

export async function getCoinGeckoGlobal(
  signal?: AbortSignal,
): Promise<CoinGeckoGlobalData['data']> {
  const data = await fetchJson<CoinGeckoGlobalData>('/coingecko-global', { signal });
  return data.data;
}

export async function getKpIndex(signal?: AbortSignal): Promise<KpIndexResponse> {
  return fetchJson<KpIndexResponse>('/kp-index', { signal });
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/health', { signal });
}

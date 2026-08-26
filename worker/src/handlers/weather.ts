import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';

export async function handleWeather(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  if (!lat || !lon) return error('lat and lon are required');

  const cacheKey = `weather:${lat}:${lon}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`,
      'weather',
    );
    setCache(cacheKey, data, 5 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'weather fetch failed', { error: String(e) });
    return error('Upstream weather API unavailable', 502);
  }
}

export async function handleStockChart(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const range = url.searchParams.get('range') || '1d';
  const interval = url.searchParams.get('interval') || '5m';
  if (!symbol) return error('symbol is required');

  const cacheKey = `stock:${symbol}:${range}:${interval}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  const rangeTtl: Record<string, number> = {
    '1d': 2 * 60 * 1000,
    '5d': 15 * 60 * 1000,
    '1mo': 60 * 60 * 1000,
    '3mo': 2 * 60 * 60 * 1000,
    '6mo': 2 * 60 * 60 * 1000,
    '1y': 2 * 60 * 60 * 1000,
  };
  const ttl = rangeTtl[range] || 5 * 60 * 1000;

  try {
    const data = await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
      'stock-chart',
    );
    setCache(cacheKey, data, ttl);
    return json(data);
  } catch (e) {
    log('error', 'stock chart fetch failed', { symbol, error: String(e) });
    return error('Upstream stock API unavailable', 502);
  }
}

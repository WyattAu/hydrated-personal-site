import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';

export async function handleEarthquakes(): Promise<Response> {
  const cached = getCached('earthquakes');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      'earthquakes',
    );
    setCache('earthquakes', data, 5 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'earthquake fetch failed', { error: String(e) });
    return error('Upstream USGS API unavailable', 502);
  }
}

export async function handleFearGreed(): Promise<Response> {
  const cached = getCached('fear-greed');
  if (cached) return json(cached);

  try {
    const data = await fetchJson('https://api.alternative.me/fng/', 'fear-greed');
    setCache('fear-greed', data, 5 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'fear-greed fetch failed', { error: String(e) });
    return error('Upstream Fear & Greed API unavailable', 502);
  }
}

export async function handleKpIndex(): Promise<Response> {
  const cached = getCached('kp-index');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      'kp-index',
    );
    setCache('kp-index', data, 10 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'kp-index fetch failed', { error: String(e) });
    return error('Upstream NOAA API unavailable', 502);
  }
}

export async function handleMempool(): Promise<Response> {
  const cached = getCached('mempool');
  if (cached) return json(cached);

  try {
    const [fees, stats] = await Promise.all([
      fetchJson('https://mempool.space/api/v1/fees/recommended', 'mempool-fees'),
      fetchJson('https://mempool.space/api/mempool', 'mempool-stats'),
    ]);
    const data = { fees, mempool: stats };
    setCache('mempool', data, 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'mempool fetch failed', { error: String(e) });
    return error('Upstream Mempool API unavailable', 502);
  }
}

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

export async function handleSpaceLaunches(): Promise<Response> {
  const cached = getCached('space-launches');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=4&mode=list&hide_recent_previous=true',
      'space-launches',
    );
    const results = (data as { results?: unknown[] }).results ?? [];
    const slim = (results as Array<Record<string, unknown>>).map((l) => ({
      name: l.name,
      net: l.net,
      status: l.status,
      launch_service_provider: l.launch_service_provider,
      rocket: l.rocket,
      pad: l.pad,
    }));
    setCache('space-launches', slim, 30 * 60 * 1000);
    return json(slim);
  } catch (e) {
    log('error', 'space-launches fetch failed', { error: String(e) });
    return error('Upstream Launch Library 2 unavailable', 502);
  }
}

/**
 * Aurora visibility — NOAA OVATION model (ovation_aurora_latest.json).
 * The upstream grid is ~65k cells [lon, lat, aurora 0-100]; we cache the
 * parsed grid and return only cells near the requested coordinate so the
 * client payload stays under 1 KB.
 */
interface AuroraCell {
  longitude: number;
  latitude: number;
  aurora: number;
}

export async function handleAurora(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat') ?? '51.5');
  const lon = Number(url.searchParams.get('lon') ?? '-0.12');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return error('lat/lon out of range', 400);
  }

  // Round to whole degrees for the cache key — a handful of variants max.
  const rLat = Math.round(lat);
  const rLon = Math.round(lon);
  const key = `aurora:${rLat}:${rLon}`;
  const cached = getCached(key);
  if (cached) return json(cached);

  try {
    const grid = (await fetchJson(
      'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
      'aurora-grid',
    )) as {
      'Observation Time'?: string;
      'Forecast Time'?: string;
      coordinates?: Array<[number, number, number]>;
    };

    const HALF_WIDTH = 4; // ±4° box (~450 km at mid-latitudes)
    let best: AuroraCell | null = null;
    let matched = 0;
    const cells: AuroraCell[] = [];
    for (const [gLon, gLat, gAurora] of grid.coordinates ?? []) {
      if (Math.abs(gLat - rLat) <= HALF_WIDTH && Math.abs(gLon - rLon) <= HALF_WIDTH) {
        matched += 1;
        cells.push({ longitude: gLon, latitude: gLat, aurora: gAurora });
        if (!best || gAurora > best.aurora) best = cells[cells.length - 1];
      }
    }

    const payload = {
      latitude: rLat,
      longitude: rLon,
      probability: best?.aurora ?? 0,
      peak_cell: best,
      matched_cells: matched,
      observation_time: grid['Observation Time'] ?? '',
      forecast_time: grid['Forecast Time'] ?? '',
      source: 'NOAA SWPC OVATION',
      generated_at: new Date().toISOString(),
    };
    setCache(key, payload, 10 * 60 * 1000);
    return json(payload);
  } catch (e) {
    log('error', 'aurora fetch failed', { error: String(e) });
    return error('Upstream NOAA OVATION API unavailable', 502);
  }
}

/**
 * SWPC space-weather alerts — NOAA public alert products
 * (/products/alerts.json). Slimmed to the newest 6 with a first-line
 * summary; 10-minute cache.
 */
export async function handleSwpcAlerts(): Promise<Response> {
  const cached = getCached('swpc-alerts');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://services.swpc.noaa.gov/products/alerts.json',
      'swpc-alerts',
    );
    const list = (Array.isArray(data) ? data : []) as Array<{
      product_id?: string;
      issue_datetime?: string;
      message?: string;
    }>;
    const slim = list.slice(0, 6).map((a) => {
      const lines = (a.message ?? '').split(/\r?\n/).filter((l) => l.length > 0);
      const summary =
        lines.find((l) => /^(ALERT|CONTINUED ALERT|WARNING|SUMMARY|WATCH)/i.test(l)) ??
        lines[2] ??
        lines[0] ??
        '';
      return {
        product_id: a.product_id ?? '',
        issued: a.issue_datetime ?? '',
        summary: summary.slice(0, 140),
      };
    });
    setCache('swpc-alerts', slim, 10 * 60 * 1000);
    return json(slim);
  } catch (e) {
    log('error', 'swpc-alerts fetch failed', { error: String(e) });
    return error('Upstream NOAA alerts unavailable', 502);
  }
}

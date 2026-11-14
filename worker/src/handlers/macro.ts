import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';
import type { Env } from '../types';

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
    const [fees, stats, difficulty] = await Promise.all([
      fetchJson('https://mempool.space/api/v1/fees/recommended', 'mempool-fees'),
      fetchJson('https://mempool.space/api/mempool', 'mempool-stats'),
      fetchJson('https://mempool.space/api/v1/difficulty-adjustment', 'mempool-difficulty'),
    ]);
    const data = { fees, mempool: stats, difficulty };
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

export async function handleAurora(request: Request, env?: Env): Promise<Response> {
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

    // Persist the city-independent activity index for the history series.
    if (env?.AURORA_HISTORY) {
      try {
        await recordAuroraSnapshot(env, cells);
      } catch (kvErr) {
        log('error', 'aurora history write failed', { error: String(kvErr) });
      }
    }

    return json(payload);
  } catch (e) {
    log('error', 'aurora fetch failed', { error: String(e) });
    return error('Upstream NOAA OVATION API unavailable', 502);
  }
}

/**
 * Write one 30-minute-bucket aurora activity snapshot (max probability
 * over 55-65N) into KV. Called from handleAurora (write-on-view) and the
 * cron trigger (autonomous snapshots), deduped by bucket key.
 */
export async function recordAuroraSnapshot(env: Env, cells: AuroraCell[]): Promise<void> {
  if (!env.AURORA_HISTORY) return;
  let bandMax = 0;
  for (const c of cells) {
    if (c.latitude >= 55 && c.latitude <= 65 && c.aurora > bandMax) bandMax = c.aurora;
  }
  const bucket = Math.floor(Date.now() / 1800000); // 30-min dedup
  await env.AURORA_HISTORY.put(
    `hist:${bucket}`,
    JSON.stringify({ ts: Date.now(), prob: bandMax }),
    { expirationTtl: 14 * 24 * 3600 },
  );
}

/** Cron-driven autonomous snapshot: fetch the grid, write the bucket. */
export async function scheduledAuroraSnapshot(env: Env): Promise<void> {
  const grid = (await fetchJson(
    'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
    'aurora-grid',
  )) as { coordinates?: Array<[number, number, number]> };
  const cells: AuroraCell[] = (grid.coordinates ?? []).map(([longitude, latitude, aurora]) => ({
    longitude,
    latitude,
    aurora,
  }));
  await recordAuroraSnapshot(env, cells);
}

/**
 * SWPC space-weather alerts — NOAA public alert products
 * (/products/alerts.json). Slimmed to the newest 6 with a first-line
 * summary; 10-minute cache.
 */ export async function handleSwpcAlerts(): Promise<Response> {
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

/**
 * Aurora activity-index history — reads the 30-minute KV snapshots
 * (max probability over 55-65N). Empty array when KV is not bound.
 */
export async function handleAuroraHistory(env?: Env): Promise<Response> {
  if (!env?.AURORA_HISTORY) return json({ history: [] });
  try {
    const list = await env.AURORA_HISTORY.list({ prefix: 'hist:' });
    const out: Array<{ ts: number; prob: number }> = [];
    for (const key of list.keys.slice(-48)) {
      const raw = await env.AURORA_HISTORY.get(key.name);
      if (raw) {
        try {
          out.push(JSON.parse(raw) as { ts: number; prob: number });
        } catch {
          /* skip malformed snapshot */
        }
      }
    }
    out.sort((a, b) => a.ts - b.ts);
    return json({ history: out });
  } catch (e) {
    log('error', 'aurora history read failed', { error: String(e) });
    return error('Aurora history unavailable', 502);
  }
}

/**
 * Solar cycle — F10.7 radio flux (10.7 cm), NOAA SWPC hourly obs.
 * Slimmed to the last 90 entries; 60-minute cache.
 */
export async function handleSolarCycle(): Promise<Response> {
  const cached = getCached('solar-cycle');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://services.swpc.noaa.gov/json/f107_cm_flux.json',
      'solar-cycle',
    );
    const list = (Array.isArray(data) ? data : []) as Array<{
      time_tag?: string;
      flux?: number;
    }>;
    const slim = list.slice(-90).map((e) => ({ time_tag: e.time_tag ?? '', flux: e.flux ?? 0 }));
    setCache('solar-cycle', slim, 60 * 60 * 1000);
    return json(slim);
  } catch (e) {
    log('error', 'solar-cycle fetch failed', { error: String(e) });
    return error('Upstream NOAA F10.7 unavailable', 502);
  }
}

/**
 * GOES integral proton flux — radiation storm context (S-scale).
 * Latest reading per energy channel from the 1-day integral feed;
 * 10-minute cache.
 */
export async function handleProtonFlux(): Promise<Response> {
  const cached = getCached('proton-flux');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json',
      'proton-flux',
    );
    const list = (Array.isArray(data) ? data : []) as Array<{
      time_tag?: string;
      energy?: string;
      flux?: number;
    }>;
    const latest: Record<string, { flux: number; time_tag: string }> = {};
    let timeTag = '';
    for (const e of list) {
      if (!e.energy || typeof e.flux !== 'number') continue;
      timeTag = e.time_tag ?? timeTag;
      latest[e.energy] = { flux: e.flux, time_tag: e.time_tag ?? '' };
    }
    const payload = {
      time_tag: timeTag,
      p1: latest['>=1 MeV']?.flux ?? null,
      p10: latest['>=10 MeV']?.flux ?? null,
      p100: latest['>=100 MeV']?.flux ?? null,
      source: 'NOAA SWPC GOES integral protons',
    };
    setCache('proton-flux', payload, 10 * 60 * 1000);
    return json(payload);
  } catch (e) {
    log('error', 'proton-flux fetch failed', { error: String(e) });
    return error('Upstream NOAA proton feed unavailable', 502);
  }
}

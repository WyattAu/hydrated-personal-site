// Pages Function: catch-all API handler
// This runs on Cloudflare Pages, NOT as a separate worker

const cache = new Map<string, { data: unknown; expiry: number }>();
const inflight = new Map<string, Promise<unknown>>();

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...extra,
    },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function getCached(key: string): unknown | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiry) return e.data;
  return e.data;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

async function fetchJson(url: string, ep: string, init?: RequestInit): Promise<unknown> {
  const k = ep + ':' + url;
  if (inflight.has(k)) return inflight.get(k)!;
  const p = (async () => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error('Upstream ' + res.status);
    return res.json();
  })();
  inflight.set(k, p);
  try {
    return await p;
  } finally {
    inflight.delete(k);
  }
}

async function safeFetch(url: string, ep: string, init?: RequestInit): Promise<unknown | null> {
  try {
    return await fetchJson(url, ep, init);
  } catch {
    return null;
  }
}

function cached(key: string, fetcher: () => Promise<unknown>, ttl: number): Promise<unknown> {
  const c = getCached(key);
  if (c) return Promise.resolve(c);
  return fetcher().then((d: unknown) => {
    if (d) setCache(key, d, ttl);
    return d || getCached(key);
  });
}

function san(s: string): string {
  return s
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\0/g, '')
    .trim();
}

const rlMap = new Map<string, { count: number; resetAt: number }>();
function rlchk(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const e = rlMap.get(ip);
  if (!e || now > e.resetAt) {
    rlMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (e.count >= limit) return false;
  e.count++;
  return true;
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const sh: Record<string, string> = {
    'Content-Type': 'application/json',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  let r: Response;
  try {
    if (path === 'health') r = json({ status: 'ok', timestamp: Date.now() });
    else if (path === 'crypto-ticker') {
      const c = getCached('ct');
      if (c) r = json(c);
      else {
        const d = await safeFetch('https://api.binance.com/api/v3/ticker/24hr', 'ct');
        if (d) {
          setCache('ct', d, 10000);
          r = json(d);
        } else {
          r = json(getCached('ct') || { error: 'unavailable' });
        }
      }
    } else if (path === 'fear-greed') {
      const c = getCached('fg');
      if (c) r = json(c);
      else {
        const d = await safeFetch('https://api.alternative.me/fng/', 'fg');
        if (d) {
          setCache('fg', d, 300000);
          r = json(d);
        } else {
          r = json(getCached('fg') || { error: 'unavailable' });
        }
      }
    } else if (path === 'hacker-news') {
      const c = getCached('hn');
      if (c) {
        r = json(c);
      } else {
        const ids = (await fetchJson(
          'https://hacker-news.firebaseio.com/v0/topstories.json',
          'hn-top',
        )) as number[];
        const stories: unknown[] = [];
        for (let i = 0; i < Math.min(ids.length, 30); i += 10) {
          const batch = ids.slice(i, i + 10);
          const results = await Promise.allSettled(
            batch.map((id) =>
              fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, `hn-${id}`),
            ),
          );
          for (const x of results) {
            if (x.status === 'fulfilled') {
              const v = x.value as Record<string, unknown>;
              stories.push({
                id: v.id,
                title: v.title,
                url: v.url,
                score: v.score,
                author: v.by,
                time: v.time,
                comments: v.descendants || 0,
              });
            }
          }
        }
        setCache('hn', stories, 300000);
        r = json(stories);
      }
    } else if (path === 'earthquakes') {
      const c = getCached('eq');
      if (c) r = json(c);
      else {
        const d = await safeFetch(
          'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
          'eq',
        );
        if (d) {
          setCache('eq', d, 300000);
          r = json(d);
        } else {
          r = json(getCached('eq') || { error: 'unavailable' });
        }
      }
    } else if (path === 'kp-index') {
      const c = getCached('kp');
      if (c) r = json(c);
      else {
        const d = await safeFetch(
          'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
          'kp',
        );
        if (d) {
          setCache('kp', d, 600000);
          r = json(d);
        } else {
          r = json(getCached('kp') || { error: 'unavailable' });
        }
      }
    } else if (path === 'mempool') {
      const c = getCached('mp');
      if (c) r = json(c);
      else {
        const f = await safeFetch('https://mempool.space/api/v1/fees/recommended', 'mpf');
        const s = await safeFetch('https://mempool.space/api/mempool', 'mps');
        if (f && s) {
          setCache('mp', { fees: f, mempool: s }, 60000);
          r = json({ fees: f, mempool: s });
        } else {
          r = json(getCached('mp') || { error: 'unavailable' });
        }
      }
    } else if (path === 'coingecko-global') {
      const c = getCached('cg');
      if (c) r = json(c);
      else {
        const d = await safeFetch('https://api.coingecko.com/api/v3/global', 'cg');
        if (d) {
          setCache('cg', d, 300000);
          r = json(d);
        } else {
          r = json(getCached('cg') || { error: 'unavailable' });
        }
      }
    } else if (path === 'exchange-rates') {
      const c = getCached('er');
      if (c) r = json(c);
      else {
        const d = await safeFetch('https://api.exchangerate-api.com/v4/latest/USD', 'er');
        if (d) {
          setCache('er', d, 3600000);
          r = json(d);
        } else {
          r = json(getCached('er') || { error: 'unavailable' });
        }
      }
    } else if (path === 'llm-benchmarks') {
      const c = getCached('llm');
      if (c) r = json(c);
      else {
        const d = await safeFetch(
          'https://raw.githubusercontent.com/mlabonne/llm-leaderboard/main/data/llm_leaderboard.json',
          'llm',
        );
        if (d) {
          setCache('llm', d, 21600000);
          r = json(d);
        } else {
          r = json(getCached('llm') || { error: 'unavailable' });
        }
      }
    } else if (path === 'github-trending') {
      const c = getCached('gh');
      if (c) r = json(c);
      else {
        const d = await safeFetch(
          'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=25',
          'gh',
          { headers: { 'User-Agent': 'hydrated/1.0' } },
        );
        if (d) {
          setCache('gh', d, 1800000);
          r = json(d);
        } else {
          r = json(getCached('gh') || { error: 'unavailable' });
        }
      }
    } else if (path === 'binance-klines') {
      const sym = url.searchParams.get('symbol') || 'BTCUSDT';
      const iv = url.searchParams.get('interval') || '1h';
      const lm = url.searchParams.get('limit') || '100';
      const ck = 'kl:' + sym + ':' + iv + ':' + lm;
      const c = getCached(ck);
      if (c) r = json(c);
      else {
        const d = await safeFetch(
          `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${iv}&limit=${lm}`,
          'kl',
        );
        if (d) {
          setCache(ck, d, 300000);
          r = json(d);
        } else {
          r = json(getCached(ck) || { error: 'unavailable' });
        }
      }
    } else if (path === 'stock-chart') {
      const sym = url.searchParams.get('symbol');
      const rng = url.searchParams.get('range') || '1d';
      const iv = url.searchParams.get('interval') || '5m';
      if (!sym) r = error('symbol required');
      else {
        const ck = 'st:' + sym + ':' + rng + ':' + iv;
        const c = getCached(ck);
        if (c) r = json(c);
        else {
          const d = await safeFetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${rng}&interval=${iv}`,
            'st',
          );
          if (d) {
            setCache(ck, d, 300000);
            r = json(d);
          } else {
            r = json(getCached(ck) || { error: 'unavailable' });
          }
        }
      }
    } else if (path === 'weather') {
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      if (!lat || !lon) r = error('lat and lon required');
      else {
        const ck = 'wx:' + lat + ':' + lon;
        const c = getCached(ck);
        if (c) r = json(c);
        else {
          const d = await safeFetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`,
            'wx',
          );
          if (d) {
            setCache(ck, d, 300000);
            r = json(d);
          } else {
            r = json(getCached(ck) || { error: 'unavailable' });
          }
        }
      }
    } else if (path === 'metrics') r = json({ status: 'ok', timestamp: Date.now() });
    else if (path === 'guestbook') {
      if (request.method === 'GET') {
        const c = getCached('gb');
        if (c) {
          r = json(c);
        } else {
          const fallback = [
            { id: '1', name: 'Visitor', message: 'Great site!', created: Date.now() - 86400000 },
            {
              id: '2',
              name: 'Dev',
              message: 'Love the WASM widgets.',
              created: Date.now() - 3600000,
            },
          ];
          r = json({ entries: fallback });
        }
      } else if (request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (!rlchk(ip, 5, 600000)) return error('Rate limit exceeded', 429);
        let body: { name?: string; message?: string; website?: string };
        try {
          body = (await request.json()) as { name?: string; message?: string; website?: string };
        } catch {
          return error('Invalid JSON');
        }
        if (body.website) return json({ success: true });
        if (!body.name || !body.message) return error('name and message required');
        if (body.name.length > 50 || body.message.length > 500) return error('Input too long');
        const entry = {
          id: crypto.randomUUID(),
          name: san(body.name),
          message: san(body.message),
          created: Date.now(),
        };
        if (env.GUESTBOOK) await env.GUESTBOOK.put('entry:' + entry.id, JSON.stringify(entry));
        r = json({ success: true, entry }, 201);
      } else {
        r = error('Method not allowed', 405);
      }
    } else r = error('Not found', 404);
  } catch (e) {
    r = json({ error: 'Internal server error' }, 500);
  }
  return r;
};

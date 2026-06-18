export interface Env {
  ENVIRONMENT: string;
  GUESTBOOK?: KVNamespace;
  ADMIN_TOKEN?: string;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const cache = new Map<string, { data: unknown; expiry: number }>();

const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.coingecko.com https://api.binance.com https://api.github.com https://api.alternative.me https://fcc-weather-api.glitch.me https://api.mempool.space https://blockchain.info https://news.ycombinator.com https://api.exchangerate-api.com https://www.jpl.nasa.gov https://data.giss.nasa.gov;",
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders,
      ...extraHeaders,
    },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Upstream error: ${res.status}`);
  return res.json();
}

async function handleWeather(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  if (!lat || !lon) return error('lat and lon are required');

  const cacheKey = `weather:${lat}:${lon}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`,
  );
  setCache(cacheKey, data, 5 * 60 * 1000);
  return json(data);
}

async function handleStockChart(request: Request): Promise<Response> {
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

  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
  );
  setCache(cacheKey, data, ttl);
  return json(data);
}

async function handleCryptoTicker(): Promise<Response> {
  const cached = getCached('crypto-ticker');
  if (cached) return json(cached);

  const data = await fetchJson('https://api.binance.com/api/v3/ticker/24hr');
  setCache('crypto-ticker', data, 10 * 1000);
  return json(data);
}

async function handleCoinGeckoGlobal(): Promise<Response> {
  const cached = getCached('coingecko-global');
  if (cached) return json(cached);

  const data = await fetchJson('https://api.coingecko.com/api/v3/global');
  setCache('coingecko-global', data, 5 * 60 * 1000);
  return json(data);
}

async function handleEarthquakes(): Promise<Response> {
  const cached = getCached('earthquakes');
  if (cached) return json(cached);

  const data = await fetchJson(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  );
  setCache('earthquakes', data, 5 * 60 * 1000);
  return json(data);
}

async function handleFearGreed(): Promise<Response> {
  const cached = getCached('fear-greed');
  if (cached) return json(cached);

  const data = await fetchJson('https://api.alternative.me/fng/');
  setCache('fear-greed', data, 5 * 60 * 1000);
  return json(data);
}

async function handleKpIndex(): Promise<Response> {
  const cached = getCached('kp-index');
  if (cached) return json(cached);

  const data = await fetchJson(
    'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  );
  setCache('kp-index', data, 10 * 60 * 1000);
  return json(data);
}

async function handleMempool(): Promise<Response> {
  const cached = getCached('mempool');
  if (cached) return json(cached);

  const [fees, stats] = await Promise.all([
    fetchJson('https://mempool.space/api/v1/fees/recommended'),
    fetchJson('https://mempool.space/api/mempool'),
  ]);
  const data = { fees, mempool: stats };
  setCache('mempool', data, 60 * 1000);
  return json(data);
}

async function handleBinanceKlines(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';
  const limit = url.searchParams.get('limit') || '100';

  const cacheKey = `klines:${symbol}:${interval}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  const data = await fetchJson(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  setCache(cacheKey, data, 5 * 60 * 1000);
  return json(data);
}

async function handleHackerNews(): Promise<Response> {
  const cached = getCached('hacker-news');
  if (cached) return json(cached);

  const ids = (await fetchJson(
    'https://hacker-news.firebaseio.com/v0/topstories.json',
  )) as number[];
  const topIds = ids.slice(0, 30);

  const stories = await Promise.all(
    topIds.map(async (id) => {
      const story = (await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)) as {
        id: number;
        title: string;
        url?: string;
        score: number;
        by: string;
        time: number;
        descendants?: number;
      };
      return {
        id: story.id,
        title: story.title,
        url: story.url,
        score: story.score,
        author: story.by,
        time: story.time,
        comments: story.descendants ?? 0,
      };
    }),
  );

  setCache('hacker-news', stories, 5 * 60 * 1000);
  return json(stories);
}

async function handleGithubTrending(): Promise<Response> {
  const cached = getCached('github-trending');
  if (cached) return json(cached);

  const data = await fetchJson(
    'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=25',
    {
      headers: { 'User-Agent': 'hydrated-worker/1.0' },
    },
  );
  setCache('github-trending', data, 30 * 60 * 1000);
  return json(data);
}

async function handleLlmBenchmarks(): Promise<Response> {
  const cached = getCached('llm-benchmarks');
  if (cached) return json(cached);

  const data = await fetchJson(
    'https://raw.githubusercontent.com/mlabonne/llm-leaderboard/main/data/llm_leaderboard.json',
  );
  setCache('llm-benchmarks', data, 6 * 60 * 60 * 1000);
  return json(data);
}

async function handleExchangeRates(): Promise<Response> {
  const cached = getCached('exchange-rates');
  if (cached) return json(cached);

  const data = await fetchJson('https://api.exchangerate-api.com/v4/latest/USD');
  setCache('exchange-rates', data, 60 * 60 * 1000);
  return json(data);
}

async function handleFred(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const seriesId = url.searchParams.get('series_id');
  if (!seriesId) return error('series_id is required');

  const cacheKey = `fred:${seriesId}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  const data = await fetchJson('https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv');
  setCache(cacheKey, data, 60 * 60 * 1000);
  return json(data);
}

async function handleGuestbookGet(): Promise<Response> {
  const entries = [
    { id: '1', name: 'Visitor', message: 'Great site!', created: Date.now() - 86400000 },
    { id: '2', name: 'Dev', message: 'Love the WASM widgets.', created: Date.now() - 3600000 },
  ];
  return json({ entries });
}

async function handleGuestbookPost(request: Request, env: Env, ip: string): Promise<Response> {
  if (!checkRateLimit(ip, 5, 10 * 60 * 1000)) {
    return error('Rate limit exceeded. Try again later.', 429);
  }

  let body: { name?: string; message?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  if (body.website) return json({ success: true });

  if (!body.name || !body.message) return error('name and message are required');
  if (body.name.length > 50 || body.message.length > 500) return error('Input too long');

  const entry = {
    id: crypto.randomUUID(),
    name: body.name,
    message: body.message,
    created: Date.now(),
  };

  if (env.GUESTBOOK) {
    await env.GUESTBOOK.put(`entry:${entry.id}`, JSON.stringify(entry));
  }

  return json({ success: true, entry }, 201);
}

async function handleGuestbookDelete(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== env.ADMIN_TOKEN) {
    return error('Unauthorized', 401);
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  if (!body.id) return error('id is required');

  if (env.GUESTBOOK) {
    await env.GUESTBOOK.delete(`entry:${body.id}`);
  }

  return json({ success: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health') {
      return json({ status: 'ok', environment: env.ENVIRONMENT, timestamp: Date.now() });
    }

    if (path === '/api/weather') return handleWeather(request);
    if (path === '/api/stock-chart') return handleStockChart(request);
    if (path === '/api/crypto-ticker') return handleCryptoTicker();
    if (path === '/api/coingecko-global') return handleCoinGeckoGlobal();
    if (path === '/api/earthquakes') return handleEarthquakes();
    if (path === '/api/fear-greed') return handleFearGreed();
    if (path === '/api/kp-index') return handleKpIndex();
    if (path === '/api/mempool') return handleMempool();
    if (path === '/api/binance-klines') return handleBinanceKlines(request);
    if (path === '/api/hacker-news') return handleHackerNews();
    if (path === '/api/github-trending') return handleGithubTrending();
    if (path === '/api/llm-benchmarks') return handleLlmBenchmarks();
    if (path === '/api/exchange-rates') return handleExchangeRates();
    if (path === '/api/fred') return handleFred(request);

    if (path === '/api/guestbook') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (request.method === 'GET') return handleGuestbookGet();
      if (request.method === 'POST') return handleGuestbookPost(request, env, ip);
      if (request.method === 'DELETE') return handleGuestbookDelete(request, env);
      return error('Method not allowed', 405);
    }

    return error('Not found', 404);
  },
};

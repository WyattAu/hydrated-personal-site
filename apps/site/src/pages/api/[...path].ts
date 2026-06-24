import type { APIRoute } from 'astro';
import * as v from 'valibot';
import {
  CryptoPriceSchema,
  EarthquakeFeatureSchema,
  FearGreedDataSchema,
  GlobalDataSchema,
  HackerNewsStorySchema,
  KpIndexSchema,
  LLMBenchmarkModelSchema,
  MempoolDataSchema,
  WeatherDataSchema,
} from '../../lib/schemas';

const cache = new Map<string, { data: unknown; expiry: number }>();
const inflight = new Map<string, Promise<unknown>>();

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
  const k = `${ep}:${url}`;
  const pending = inflight.get(k);
  if (pending) return pending;
  const p = (async () => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
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

/**
 * Validate upstream data against a valibot schema without blocking the response.
 * Always returns the original data so the response shape is unchanged. On a
 * validation failure a warning is logged so malformed upstream data surfaces
 * in logs while the request still succeeds.
 */
function validateOrPass(
  schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
  data: unknown,
  label: string,
): unknown {
  const result = v.safeParse(schema, data);
  if (result.success) return data;
  const issue = result.issues[0];
  console.warn(`[schema] ${label} validation failed: ${issue?.message ?? 'unknown issue'}`);
  return data;
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

export const OPTIONS: APIRoute = () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};

export const prerender = false;

interface KVLike {
  list(opts?: { limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
  get(key: string, type?: 'json' | 'text'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export const GET: APIRoute = async (ctx) => {
  const { url } = ctx;
  const kv = (ctx.locals as { runtime?: { env?: Record<string, unknown> } } | undefined)?.runtime
    ?.env?.GUESTBOOK as KVLike | undefined;
  const path = url.pathname.replace(/^\/api\//, '');

  if (path === 'health')
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json' },
    });

  if (path === 'crypto-ticker') {
    const c = getCached('ct');
    if (c) return J(c);
    // Primary: Binance. Fallback: CoinGecko (Binance geo-blocks some CF egress).
    const d = await safeFetch('https://api.binance.com/api/v3/ticker/24hr', 'ct');
    if (d) {
      const validated = validateOrPass(v.array(CryptoPriceSchema), d, 'crypto-ticker');
      setCache('ct', validated, 10000);
      return J(validated);
    }
    const cg = await safeFetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h',
      'ct-cg',
    );
    if (cg && Array.isArray(cg)) {
      const normalised = cg.map((coin: Record<string, unknown>) => ({
        symbol: `${String(coin.symbol || '').toUpperCase()}USDT`,
        price: coin.current_price,
        priceChange: coin.price_change_24h,
        priceChangePercent: coin.price_change_percentage_24h,
        volume: coin.total_volume,
        quoteVolume: coin.market_cap,
        lastPrice: coin.current_price,
        highPrice: coin.high_24h,
        lowPrice: coin.low_24h,
      }));
      const validated = validateOrPass(v.array(CryptoPriceSchema), normalised, 'crypto-ticker');
      setCache('ct', validated, 30000);
      return J(validated);
    }
    return J(getCached('ct') || { error: 'unavailable' });
  }
  if (path === 'fear-greed') {
    const c = getCached('fg');
    if (c) return J(c);
    const d = await safeFetch('https://api.alternative.me/fng/', 'fg');
    if (d) {
      const validated = validateOrPass(
        v.object({ data: v.array(FearGreedDataSchema) }),
        d,
        'fear-greed',
      );
      setCache('fg', validated, 300000);
      return J(validated);
    }
    return J(getCached('fg') || { error: 'unavailable' });
  }
  if (path === 'hacker-news') {
    const c = getCached('hn');
    if (c) return J(c);
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
    setCache('hn', validateOrPass(v.array(HackerNewsStorySchema), stories, 'hacker-news'), 300000);
    return J(getCached('hn'));
  }
  if (path === 'earthquakes') {
    const c = getCached('eq');
    if (c) return J(c);
    const d = await safeFetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      'eq',
    );
    if (d) {
      const validated = validateOrPass(
        v.object({ features: v.array(EarthquakeFeatureSchema) }),
        d,
        'earthquakes',
      );
      setCache('eq', validated, 300000);
      return J(validated);
    }
    return J(getCached('eq') || { error: 'unavailable' });
  }
  if (path === 'kp-index') {
    const c = getCached('kp');
    if (c) return J(c);
    const d = await safeFetch(
      'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      'kp',
    );
    if (d) {
      const validated = validateOrPass(v.array(KpIndexSchema), d, 'kp-index');
      setCache('kp', validated, 600000);
      return J(validated);
    }
    return J(getCached('kp') || { error: 'unavailable' });
  }
  if (path === 'mempool') {
    const c = getCached('mp');
    if (c) return J(c);
    const f = await safeFetch('https://mempool.space/api/v1/fees/recommended', 'mpf');
    const s = await safeFetch('https://mempool.space/api/mempool', 'mps');
    if (f && s) {
      const validated = validateOrPass(
        v.object({ fees: MempoolDataSchema, mempool: v.record(v.string(), v.number()) }),
        { fees: f, mempool: s },
        'mempool',
      );
      setCache('mp', validated, 60000);
      return J(validated);
    }
    return J(getCached('mp') || { error: 'unavailable' });
  }
  if (path === 'coingecko-global') {
    const c = getCached('cg');
    if (c) return J(c);
    const d = await safeFetch('https://api.coingecko.com/api/v3/global', 'cg');
    if (d) {
      const validated = validateOrPass(GlobalDataSchema, d, 'coingecko-global');
      setCache('cg', validated, 300000);
      return J(validated);
    }
    return J(getCached('cg') || { error: 'unavailable' });
  }
  if (path === 'exchange-rates') {
    const c = getCached('er');
    if (c) return J(c);
    const d = await safeFetch('https://api.exchangerate-api.com/v4/latest/USD', 'er');
    if (d) {
      setCache('er', d, 3600000);
      return J(d);
    }
    return J(getCached('er') || { error: 'unavailable' });
  }
  if (path === 'llm-benchmarks') {
    const c = getCached('llm');
    if (c) return J(c);
    const d = await safeFetch(
      'https://raw.githubusercontent.com/mlabonne/llm-leaderboard/main/data/llm_leaderboard.json',
      'llm',
    );
    if (d) {
      const validated = validateOrPass(v.array(LLMBenchmarkModelSchema), d, 'llm-benchmarks');
      setCache('llm', validated, 21600000);
      return J(validated);
    }
    return J(getCached('llm') || { error: 'unavailable' });
  }
  if (path === 'github-trending') {
    const c = getCached('gh');
    if (c) return J(c);
    const d = await safeFetch(
      'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=25',
      'gh',
      { headers: { 'User-Agent': 'hydrated/1.0' } },
    );
    if (d) {
      setCache('gh', d, 1800000);
      return J(d);
    }
    return J(getCached('gh') || { error: 'unavailable' });
  }
  if (path === 'binance-klines') {
    const sym = url.searchParams.get('symbol') || 'BTCUSDT';
    const iv = url.searchParams.get('interval') || '1h';
    const lm = url.searchParams.get('limit') || '100';
    const ck = `kl:${sym}:${iv}:${lm}`;
    const c = getCached(ck);
    if (c) return J(c);
    const d = await safeFetch(
      `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${iv}&limit=${lm}`,
      'kl',
    );
    if (d) {
      setCache(ck, d, 300000);
      return J(d);
    }
    return J(getCached(ck) || { error: 'unavailable' });
  }
  if (path === 'stock-chart') {
    const sym = url.searchParams.get('symbol');
    const rng = url.searchParams.get('range') || '1d';
    const iv = url.searchParams.get('interval') || '5m';
    if (!sym) return E('symbol required');
    const ck = `st:${sym}:${rng}:${iv}`;
    const c = getCached(ck);
    if (c) return J(c);
    const d = await safeFetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${rng}&interval=${iv}`,
      'st',
    );
    if (d) {
      setCache(ck, d, 300000);
      return J(d);
    }
    return J(getCached(ck) || { error: 'unavailable' });
  }
  if (path === 'weather') {
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    if (!lat || !lon) return E('lat and lon required');
    const ck = `wx:${lat}:${lon}`;
    const c = getCached(ck);
    if (c) return J(c);
    const d = await safeFetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`,
      'wx',
    );
    if (d) {
      const validated = validateOrPass(WeatherDataSchema, d, 'weather');
      setCache(ck, validated, 300000);
      return J(validated);
    }
    return J(getCached(ck) || { error: 'unavailable' });
  }
  if (path === 'metrics') return J({ status: 'ok', timestamp: Date.now() });
  if (path === 'guestbook') {
    const c = getCached('gb');
    if (c) return J(c);
    // When Cloudflare KV binding is configured, read real entries.
    // Falls back to sample data for local dev / pre-KV setup.
    if (kv) {
      try {
        const list = await kv.list({ limit: 50 });
        const entries = await Promise.all(
          list.keys.map(async (key: { name: string }) => {
            const val = await kv.get(key.name, 'json');
            return val;
          }),
        );
        const valid = entries.filter(Boolean);
        setCache('gb', { entries: valid }, 30000);
        return J({ entries: valid });
      } catch {
        // KV read failed; fall through to sample data.
      }
    }
    return J({
      entries: [
        { id: '1', name: 'Visitor', message: 'Great site!', created: Date.now() - 86400000 },
        { id: '2', name: 'Dev', message: 'Love the WASM widgets.', created: Date.now() - 3600000 },
      ],
    });
  }

  // --- Quant Dashboard Endpoints ---

  if (path === 'deribit-options') {
    const c = getCached('deribit');
    if (c) return J(c);
    const currency = url.searchParams.get('currency') || 'BTC';
    const d = await safeFetch(
      `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`,
      'deribit',
    );
    if (d && typeof d === 'object' && 'result' in d) {
      const result = (d as { result: Array<Record<string, unknown>> }).result.map((opt) => {
        const name = opt.instrument_name as string;
        const parts = name.split('-');
        return {
          instrument: name,
          underlying: parts[0],
          expiry: parts[1],
          strike: Number.parseFloat(parts[2]),
          type: parts[3]?.startsWith('C') ? 'call' : 'put',
          iv: opt.mark_iv,
          mark_price: opt.mark_price,
          volume: opt.volume,
          open_interest: opt.open_interest,
          underlying_price: opt.underlying_price,
        };
      });
      setCache('deribit', result, 300000);
      return J(result);
    }
    return J(getCached('deribit') || { error: 'unavailable' });
  }

  if (path === 'treasury-yields') {
    const c = getCached('yields');
    if (c) return J(c);
    const series: Array<{ label: string; maturity: number; code: string }> = [
      { label: '1MO', maturity: 0.083, code: 'DGS1MO' },
      { label: '3MO', maturity: 0.25, code: 'DGS3MO' },
      { label: '6MO', maturity: 0.5, code: 'DGS6MO' },
      { label: '1Y', maturity: 1.0, code: 'DGS1' },
      { label: '2Y', maturity: 2.0, code: 'DGS2' },
      { label: '5Y', maturity: 5.0, code: 'DGS5' },
      { label: '7Y', maturity: 7.0, code: 'DGS7' },
      { label: '10Y', maturity: 10.0, code: 'DGS10' },
      { label: '20Y', maturity: 20.0, code: 'DGS20' },
      { label: '30Y', maturity: 30.0, code: 'DGS30' },
    ];
    const yields: Array<{ label: string; maturity: number; yield: number }> = [];
    for (const s of series) {
      const d = await safeFetch(
        `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.code}&cosd=2026-06-20&coed=2026-06-22`,
        `yield-${s.code}`,
      );
      if (d && typeof d === 'string') {
        const lines = (d as string).trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const val = Number.parseFloat(lastLine.split(',')[1]);
        if (!Number.isNaN(val)) {
          yields.push({ label: s.label, maturity: s.maturity, yield: val });
        }
      }
    }
    if (yields.length > 0) {
      setCache('yields', yields, 3600000);
      return J(yields);
    }
    return J(getCached('yields') || { error: 'unavailable' });
  }

  if (path === 'funding-rates') {
    const c = getCached('funding');
    if (c) return J(c);
    const d = await safeFetch('https://fapi.binance.com/fapi/v1/premiumIndex', 'funding');
    if (d && Array.isArray(d)) {
      const result = (d as Array<Record<string, string>>)
        .filter((item) => item.symbol?.endsWith('USDT'))
        .map((item) => ({
          symbol: item.symbol,
          rate: Number.parseFloat(item.lastFundingRate || '0'),
          nextFunding: item.nextFundingTime,
        }))
        .sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate))
        .slice(0, 50);
      setCache('funding', result, 60000);
      return J(result);
    }
    return J(getCached('funding') || { error: 'unavailable' });
  }

  return E('Not found', 404);
};

export const POST: APIRoute = async ({ request }) => {
  const path = request.url.replace(/^.*\/api\//, '');
  if (path === 'guestbook') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!rlchk(ip, 5, 600000)) return E('Rate limit exceeded', 429);
    let body: { name?: string; message?: string; website?: string };
    try {
      body = (await request.json()) as { name?: string; message?: string; website?: string };
    } catch {
      return E('Invalid JSON');
    }
    if (body.website) return J({ success: true });
    if (!body.name || !body.message) return E('name and message required');
    if (body.name.length > 50 || body.message.length > 500) return E('Input too long');
    const entry = {
      id: crypto.randomUUID(),
      name: san(body.name),
      message: san(body.message),
      created: Date.now(),
    };
    return J({ success: true, entry }, 201);
  }
  return E('Not found', 404);
};

function J(data: unknown, status = 200): Response {
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
    },
  });
}

function E(message: string, status = 400): Response {
  return J({ error: message }, status);
}

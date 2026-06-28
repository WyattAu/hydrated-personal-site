import type { APIRoute } from 'astro';
import * as v from 'valibot';
import {
  EarthquakeFeatureSchema,
  FearGreedDataSchema,
  HackerNewsStorySchema,
  KpIndexSchema,
  LLMBenchmarkModelSchema,
  MempoolDataSchema,
  WeatherDataSchema,
} from '../../lib/schemas';
import {
  fetchCryptoTickers,
  fetchDeribitOptions,
  fetchFundingRates,
  fetchKlines,
  fetchTreasuryYields,
} from '../../lib/upstream';

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
    // Multi-tier: OKX → Bybit → stale cache. Binance and CoinGecko are
    // geo-blocked (403) from Cloudflare edge egress.
    const result = await fetchCryptoTickers();
    if (result) {
      const data = result.tickers.map((t) => ({
        symbol: t.symbol,
        lastPrice: t.price.toString(),
        price: t.price,
        priceChange: t.change.toString(),
        priceChangePercent: t.changePct.toFixed(2),
        volume: t.volume.toString(),
        quoteVolume: '0',
        highPrice: '0',
        lowPrice: '0',
      }));
      setCache('ct', data, 10000);
      return J(data);
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
    // CoinGecko blocked from CF edge. Use OKX as fallback.
    try {
      const okxRes = await fetch(
        'https://www.okx.com/api/v5/public/instruments?instType=SPOT&instState=live',
        {
          signal: AbortSignal.timeout(5000),
        },
      );
      if (okxRes.ok) {
        const okxData = await okxRes.json();
        const usdtPairs = (okxData?.data || []).filter((p: Record<string, string>) =>
          p.instId?.endsWith('-USDT'),
        );
        const result = {
          data: {
            active_cryptocurrencies: usdtPairs.length,
            markets: 0,
            total_market_cap: { usd: 0 },
            total_volume: { usd: 0 },
            market_cap_percentage: { btc: 0, eth: 0 },
          },
        };
        setCache('cg', result, 300000);
        return J(result);
      }
    } catch {
      // fall through
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
    const iv = url.searchParams.get('interval') || '1d';
    const lm = Number.parseInt(url.searchParams.get('limit') || '100', 10);
    const ck = `kl:${sym}:${iv}:${lm}`;
    const c = getCached(ck);
    if (c) return J(c);
    // Multi-tier: OKX → Kraken → Yahoo. Binance is geo-blocked (403).
    const result = await fetchKlines(sym, iv, lm);
    if (result) {
      setCache(ck, result.candles, 300000);
      return J(result.candles);
    }
    return J(getCached(ck) || { error: 'unavailable' });
  }
  if (path === 'binance-futures') {
    const c = getCached('bf');
    if (c) return J(c);
    // Binance futures blocked from CF. Use Bybit.
    try {
      const bybitRes = await fetch('https://api.bybit.com/v5/market/tickers?category=linear', {
        signal: AbortSignal.timeout(8000),
      });
      if (bybitRes.ok) {
        const d = await bybitRes.json();
        const list = (d?.result?.list || []).filter((t: Record<string, string>) =>
          t.symbol?.endsWith('USDT'),
        );
        const result = list.map((t: Record<string, string>) => ({
          symbol: t.symbol,
          fundingRate: t.fundingRate || '0',
          openInterest: t.openInterest || '0',
          volume24h: t.volume24h || '0',
          turnover24h: t.turnover24h || '0',
          lastPrice: t.lastPrice || '0',
        }));
        setCache('bf', result, 60000);
        return J(result);
      }
    } catch {
      // fall through
    }
    return J(getCached('bf') || { error: 'unavailable' });
  }

  if (path === 'stock-chart') {
    const sym = url.searchParams.get('symbol');
    const rng = url.searchParams.get('range') || '1d';
    const iv = url.searchParams.get('interval') || '5m';
    if (!sym) return E('symbol required');
    const ck = `st:${sym}:${rng}:${iv}`;
    const c = getCached(ck);
    if (c) return J(c);
    try {
      const chartRes = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${rng}&interval=${iv}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) },
      );
      if (!chartRes.ok) throw new Error(`Yahoo ${chartRes.status}`);
      const d = await chartRes.json();
      setCache(ck, d, 300000);
      return J(d);
    } catch {
      return J(getCached(ck) || { error: 'unavailable' });
    }
  }

  if (path === 'stock-quote') {
    const symbols = url.searchParams.get('symbols') || '';
    const ck = `sq:${symbols}`;
    const c = getCached(ck);
    if (c) return J(c);
    // Yahoo v7 quote API is blocked. Use v8 chart endpoint per-symbol.
    const symList = symbols
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const results: Array<{
      symbol: string;
      price: number;
      change: number;
      changePct: number;
      name: string;
    }> = [];
    for (const sym of symList) {
      try {
        const chartRes = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=2d&interval=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) },
        );
        if (!chartRes.ok) continue;
        const d = await chartRes.json();
        const r = d?.chart?.result?.[0];
        if (!r) continue;
        const meta = r.meta || {};
        const price = meta.regularMarketPrice || 0;
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const change = price - prev;
        const changePct = prev > 0 ? (change / prev) * 100 : 0;
        results.push({
          symbol: sym,
          price,
          change,
          changePct,
          name: meta.shortName || meta.longName || sym,
        });
      } catch {
        // skip this symbol
      }
    }
    if (results.length > 0) {
      setCache(ck, results, 60000);
      return J(results);
    }
    return J(getCached(ck) || { error: 'unavailable' });
  }
  if (path === 'restcountries') {
    const code = url.searchParams.get('code') || '';
    const ck = `rc:${code}`;
    const c = getCached(ck);
    if (c) return J(c);
    // restcountries.com is deprecated. Use World Bank countries API instead.
    try {
      const res = await fetch(
        `https://api.worldbank.org/v2/country/${encodeURIComponent(code)}?format=json`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (Array.isArray(d) && d[1]?.[0]) {
        const country = d[1][0];
        const data = {
          name: { common: country.name },
          population: null as number | null,
          area: null as number | null,
          region: country.region?.value || '',
          subregion: country.adminregion?.value || '',
          capital: [country.capitalCity] as string[],
          capitalInfo: { latlng: [country.latitude, country.longitude] },
          incomeLevel: country.incomeLevel?.value || '',
          languages: {} as Record<string, string>,
          currencies: {} as Record<string, { name: string; symbol: string }>,
        };
        setCache(ck, data, 86400000);
        return J(data);
      }
      throw new Error('not found');
    } catch {
      return J(getCached(ck) || { error: 'unavailable' });
    }
  }

  if (path === 'world-bank') {
    const country = url.searchParams.get('country') || '';
    const indicators = url.searchParams.get('indicators') || 'SP.POP.TOTL,NY.GDP.MKTP.CD';
    const ck = `wb:${country}:${indicators}`;
    const c = getCached(ck);
    if (c) return J(c);
    const indList = indicators.split(',').filter(Boolean);
    // Fetch all indicators IN PARALLEL instead of sequential loop.
    const entries = await Promise.all(
      indList.map(async (ind) => {
        try {
          const res = await fetch(
            `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(ind)}?format=json&date=2018:2024&per_page=10`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (!res.ok) return [ind, null] as const;
          const d = await res.json();
          if (Array.isArray(d) && d[1]) {
            const valid = d[1].find((item: { value: number | null }) => item.value !== null);
            return [ind, valid ? valid.value : null] as const;
          }
          return [ind, null] as const;
        } catch {
          return [ind, null] as const;
        }
      }),
    );
    const result: Record<string, number | null> = Object.fromEntries(entries);
    setCache(ck, result, 86400000);
    return J(result);
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
    // Try Deribit (may rate-limit 429). OKX options as fallback.
    // Deribit's 429 is per-IP, not per-account. Cache aggressively (10 min).
    const result = await fetchDeribitOptions(currency);
    if (result) {
      setCache('deribit', result.options, 600000);
      return J(result.options);
    }
    return J(getCached('deribit') || { error: 'unavailable' });
  }

  if (path === 'treasury-yields') {
    const c = getCached('yields');
    if (c) return J(c);
    // FRED works from CF edge. Fallback: US Treasury direct CSV.
    const result = await fetchTreasuryYields();
    if (result) {
      setCache('yields', result.yields, 3600000);
      return J(result.yields);
    }
    return J(getCached('yields') || { error: 'unavailable' });
  }

  if (path === 'funding-rates') {
    const c = getCached('funding');
    if (c) return J(c);
    // Multi-tier: Bybit → OKX. Binance futures is geo-blocked (403).
    const result = await fetchFundingRates();
    if (result) {
      setCache('funding', result.rates, 60000);
      return J(result.rates);
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

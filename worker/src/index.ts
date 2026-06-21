export interface Env {
  ENVIRONMENT: string;
  GUESTBOOK?: KVNamespace;
  ADMIN_TOKEN?: string;
  AA_API_KEY?: string;
}

// --- In-Memory Cache (with SWR) ---
interface CacheEntry {
  data: unknown;
  expiry: number;
  revalidating?: boolean;
}
const cache = new Map<string, CacheEntry>();

// --- Request Deduplication ---
const inflight = new Map<string, Promise<unknown>>();

// --- Circuit Breaker ---
interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}
const circuits = new Map<string, CircuitState>();

// --- Rate Limiting ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// --- Structured Logger ---
function log(level: string, message: string, meta: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...meta });
  if (level === 'error') {
    console.error(entry);
  } else if (level === 'warn') {
    console.warn(entry);
  } else {
  }
}

// --- Security Headers ---
const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.coingecko.com https://api.binance.com https://api.github.com https://api.alternative.me https://fcc-weather-api.glitch.me https://api.mempool.space https://blockchain.info https://news.ycombinator.com https://api.exchangerate-api.com https://www.jpl.nasa.gov https://data.giss.nasa.gov https://www.reddit.com https://query1.finance.yahoo.com; report-uri /api/csp-report;",
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// --- Performance Metrics ---
const metrics = {
  requests: 0,
  errors: 0,
  upstreamLatency: new Map<string, number[]>(),
  responseTimes: new Map<string, number[]>(),
  alerts: {
    errorRateHigh: false,
    slowResponse: false,
  },
};

function recordUpstreamLatency(endpoint: string, ms: number): void {
  const arr = metrics.upstreamLatency.get(endpoint) || [];
  arr.push(ms);
  if (arr.length > 100) arr.shift();
  metrics.upstreamLatency.set(endpoint, arr);
}

function recordResponseTime(endpoint: string, ms: number): void {
  const arr = metrics.responseTimes.get(endpoint) || [];
  arr.push(ms);
  if (arr.length > 100) arr.shift();
  metrics.responseTimes.set(endpoint, arr);
}

function checkAlerts(): void {
  // Check error rate
  if (metrics.requests > 10) {
    const errorRate = (metrics.errors / metrics.requests) * 100;
    if (errorRate > 10 && !metrics.alerts.errorRateHigh) {
      metrics.alerts.errorRateHigh = true;
      log('warn', 'ALERT: Error rate exceeds 10%', {
        errorRate: errorRate.toFixed(2),
        requests: metrics.requests,
        errors: metrics.errors,
      });
    } else if (errorRate <= 10 && metrics.alerts.errorRateHigh) {
      metrics.alerts.errorRateHigh = false;
      log('info', 'ALERT RESOLVED: Error rate back to normal', { errorRate: errorRate.toFixed(2) });
    }
  }

  // Check response times per endpoint
  for (const [endpoint, times] of metrics.responseTimes) {
    if (times.length < 5) continue;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    if (avg > 5000 && !metrics.alerts.slowResponse) {
      metrics.alerts.slowResponse = true;
      log('warn', 'ALERT: Slow response times detected', { endpoint, avgMs: Math.round(avg) });
    } else if (avg <= 5000 && metrics.alerts.slowResponse) {
      metrics.alerts.slowResponse = false;
    }
  }
}

// --- Body Size Limit ---
const MAX_BODY_SIZE = 10 * 1024; // 10KB

// --- Helpers ---
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
  const now = Date.now();
  if (now > entry.expiry) {
    // SWR: return stale, trigger revalidation in background
    if (!entry.revalidating) {
      entry.revalidating = true;
      // Background revalidation happens at the fetch level
    }
    return entry.data; // Return stale data
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs, revalidating: false });
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

// --- Circuit Breaker ---
function isCircuitOpen(endpoint: string): boolean {
  const state = circuits.get(endpoint);
  if (!state || !state.open) return false;
  if (Date.now() - state.lastFailure > 30_000) {
    state.open = false;
    state.failures = 0;
    return false;
  }
  return true;
}

function recordFailure(endpoint: string): void {
  const state = circuits.get(endpoint) || { failures: 0, lastFailure: 0, open: false };
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= 3) state.open = true;
  circuits.set(endpoint, state);
}

function recordSuccess(endpoint: string): void {
  const state = circuits.get(endpoint);
  if (state) {
    state.failures = 0;
    state.open = false;
  }
}

// --- Request Deduplication + Circuit Breaker ---
async function fetchJson(url: string, endpoint: string, init?: RequestInit): Promise<unknown> {
  // Check circuit breaker
  if (isCircuitOpen(endpoint)) {
    const stale = getCached(endpoint);
    if (stale) return stale;
    throw new Error(`Circuit open for ${endpoint} and no stale data`);
  }

  // Request deduplication
  const dedupKey = `${endpoint}:${url}`;
  const inflightPromise = inflight.get(dedupKey);
  if (inflightPromise) {
    return inflightPromise;
  }

  const promise = (async () => {
    const start = Date.now();
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`Upstream error: ${res.status}`);
      const data = await res.json();
      recordSuccess(endpoint);
      recordUpstreamLatency(endpoint, Date.now() - start);
      return data;
    } catch (e) {
      recordFailure(endpoint);
      recordUpstreamLatency(endpoint, Date.now() - start);
      throw e;
    } finally {
      inflight.delete(dedupKey);
    }
  })();

  inflight.set(dedupKey, promise);
  return promise;
}

// --- Sanitize Input ---
function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\0/g, '')
    .trim();
}

// --- API Handlers ---

async function handleWeather(request: Request): Promise<Response> {
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

async function handleCryptoTicker(): Promise<Response> {
  const cached = getCached('crypto-ticker');
  if (cached) return json(cached);

  try {
    const data = await fetchJson('https://api.binance.com/api/v3/ticker/24hr', 'crypto-ticker');
    setCache('crypto-ticker', data, 10 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'crypto ticker fetch failed', { error: String(e) });
    return error('Upstream crypto API unavailable', 502);
  }
}

async function handleCoinGeckoGlobal(): Promise<Response> {
  const cached = getCached('coingecko-global');
  if (cached) return json(cached);

  try {
    const data = await fetchJson('https://api.coingecko.com/api/v3/global', 'coingecko-global');
    setCache('coingecko-global', data, 5 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'coingecko fetch failed', { error: String(e) });
    return error('Upstream CoinGecko API unavailable', 502);
  }
}

async function handleEarthquakes(): Promise<Response> {
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

async function handleFearGreed(): Promise<Response> {
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

async function handleKpIndex(): Promise<Response> {
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

async function handleMempool(): Promise<Response> {
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

async function handleBinanceKlines(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';
  const limit = url.searchParams.get('limit') || '100';

  const cacheKey = `klines:${symbol}:${interval}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      'binance-klines',
    );
    setCache(cacheKey, data, 5 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'binance klines fetch failed', { symbol, error: String(e) });
    return error('Upstream Binance API unavailable', 502);
  }
}

async function handleHackerNews(): Promise<Response> {
  const cached = getCached('hacker-news');
  if (cached) return json(cached);

  try {
    const ids = (await fetchJson(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      'hn-top',
    )) as number[];
    const topIds = ids.slice(0, 30);

    // Batched fetch with allSettled
    const batchSize = 10;
    const stories: Array<{
      id: number;
      title: string;
      url?: string;
      score: number;
      author: string;
      time: number;
      comments: number;
    }> = [];

    for (let i = 0; i < topIds.length; i += batchSize) {
      const batch = topIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((id) =>
          fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, `hn-item-${id}`),
        ),
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const story = result.value as {
            id: number;
            title: string;
            url?: string;
            score: number;
            by: string;
            time: number;
            descendants?: number;
          };
          stories.push({
            id: story.id,
            title: story.title,
            url: story.url,
            score: story.score,
            author: story.by,
            time: story.time,
            comments: story.descendants ?? 0,
          });
        }
      }
    }

    setCache('hacker-news', stories, 5 * 60 * 1000);
    return json(stories);
  } catch (e) {
    log('error', 'hacker news fetch failed', { error: String(e) });
    return error('Upstream HN API unavailable', 502);
  }
}

async function handleGithubTrending(): Promise<Response> {
  const cached = getCached('github-trending');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=25',
      'github-trending',
      { headers: { 'User-Agent': 'hydrated-worker/1.0' } },
    );
    setCache('github-trending', data, 30 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'github trending fetch failed', { error: String(e) });
    return error('Upstream GitHub API unavailable', 502);
  }
}

async function handleLlmBenchmarks(env: Env): Promise<Response> {
  const cached = getCached('llm-benchmarks');
  if (cached) return json(cached);

  const apiKey = env.AA_API_KEY;
  if (apiKey) {
    try {
      const resp = await fetch('https://artificialanalysis.ai/api/v2/data/llms/models', {
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) {
        const raw = (await resp.json()) as { data?: Array<Record<string, unknown>> };
        const models = (raw.data || [])
          .map((m) => ({
            model: (m.name as string) || 'Unknown',
            parameter_count: (m.parameter_count as string) || '?',
            average_score:
              ((m.evaluations as Record<string, unknown>)
                ?.artificial_analysis_intelligence_index as number) || 0,
            mmlu: ((m.evaluations as Record<string, unknown>)?.gpqa as number) || 0,
            humaneval:
              ((m.evaluations as Record<string, unknown>)
                ?.artificial_analysis_coding_index as number) || 0,
            hellaswag: 0,
            gsm8k: 0,
            arc: 0,
            truthfulqa: 0,
            price_per_m_token:
              ((m.pricing as Record<string, unknown>)?.price_1m_input_tokens as number) || 0,
            tokens_per_sec: (m.median_output_tokens_per_second as number) || 0,
          }))
          .filter((m) => m.model !== 'Unknown');
        if (models.length > 0) {
          setCache('llm-benchmarks', models, 6 * 60 * 60 * 1000);
          return json(models);
        }
      }
    } catch (e) {
      log('warn', 'artificialanalysis.ai fetch failed', { error: String(e) });
    }
  }

  // Fallback: embedded sample data
  const sample = [
    {
      model: 'GPT-4o',
      parameter_count: '?',
      average_score: 88.7,
      mmlu: 88.7,
      humaneval: 90.2,
      hellaswag: 95.3,
      gsm8k: 95.3,
      arc: 96.3,
      truthfulqa: 89.1,
    },
    {
      model: 'Claude 3.5 Sonnet',
      parameter_count: '?',
      average_score: 88.1,
      mmlu: 88.7,
      humaneval: 92.0,
      hellaswag: 94.8,
      gsm8k: 96.4,
      arc: 96.7,
      truthfulqa: 87.2,
    },
    {
      model: 'Gemini 1.5 Pro',
      parameter_count: '?',
      average_score: 85.9,
      mmlu: 85.9,
      humaneval: 84.1,
      hellaswag: 93.2,
      gsm8k: 91.7,
      arc: 94.4,
      truthfulqa: 86.4,
    },
    {
      model: 'Llama 3.1 405B',
      parameter_count: '405B',
      average_score: 83.6,
      mmlu: 88.6,
      humaneval: 89.0,
      hellaswag: 88.0,
      gsm8k: 96.8,
      arc: 96.9,
      truthfulqa: 82.6,
    },
    {
      model: 'Llama 3.1 70B',
      parameter_count: '70B',
      average_score: 80.4,
      mmlu: 83.6,
      humaneval: 80.5,
      hellaswag: 88.0,
      gsm8k: 95.1,
      arc: 94.1,
      truthfulqa: 79.1,
    },
    {
      model: 'Llama 3.1 8B',
      parameter_count: '8B',
      average_score: 72.9,
      mmlu: 73.0,
      humaneval: 62.2,
      hellaswag: 81.4,
      gsm8k: 84.5,
      arc: 83.4,
      truthfulqa: 69.4,
    },
    {
      model: 'Mistral Large 2',
      parameter_count: '123B',
      average_score: 84.0,
      mmlu: 84.0,
      humaneval: 92.7,
      hellaswag: 89.5,
      gsm8k: 91.2,
      arc: 94.0,
      truthfulqa: 78.4,
    },
    {
      model: 'Qwen2 72B',
      parameter_count: '72B',
      average_score: 82.3,
      mmlu: 84.2,
      humaneval: 86.4,
      hellaswag: 87.5,
      gsm8k: 91.6,
      arc: 93.0,
      truthfulqa: 80.2,
    },
    {
      model: 'Gemma 2 27B',
      parameter_count: '27B',
      average_score: 78.1,
      mmlu: 75.2,
      humaneval: 71.3,
      hellaswag: 85.3,
      gsm8k: 82.8,
      arc: 90.1,
      truthfulqa: 73.5,
    },
    {
      model: 'Phi-3 Medium',
      parameter_count: '14B',
      average_score: 77.6,
      mmlu: 78.0,
      humaneval: 62.4,
      hellaswag: 83.8,
      gsm8k: 89.6,
      arc: 88.0,
      truthfulqa: 75.2,
    },
    {
      model: 'Yi-1.5 34B',
      parameter_count: '34B',
      average_score: 76.4,
      mmlu: 76.8,
      humaneval: 67.8,
      hellaswag: 84.6,
      gsm8k: 87.2,
      arc: 89.6,
      truthfulqa: 72.4,
    },
    {
      model: 'Command R+',
      parameter_count: '104B',
      average_score: 74.8,
      mmlu: 75.7,
      humaneval: 71.2,
      hellaswag: 83.2,
      gsm8k: 79.6,
      arc: 86.2,
      truthfulqa: 68.9,
    },
    {
      model: 'DeepSeek V2',
      parameter_count: '236B',
      average_score: 81.2,
      mmlu: 81.5,
      humaneval: 83.5,
      hellaswag: 86.7,
      gsm8k: 92.2,
      arc: 91.4,
      truthfulqa: 76.3,
    },
    {
      model: 'Dbrx Instruct',
      parameter_count: '132B',
      average_score: 74.2,
      mmlu: 73.2,
      humaneval: 74.4,
      hellaswag: 81.6,
      gsm8k: 82.4,
      arc: 85.0,
      truthfulqa: 67.8,
    },
    {
      model: 'Mixtral 8x22B',
      parameter_count: '141B',
      average_score: 77.8,
      mmlu: 77.8,
      humaneval: 75.6,
      hellaswag: 84.8,
      gsm8k: 78.6,
      arc: 88.4,
      truthfulqa: 72.4,
    },
  ];
  setCache('llm-benchmarks', sample, 6 * 60 * 60 * 1000);
  return json(sample);
}

async function handleExchangeRates(): Promise<Response> {
  const cached = getCached('exchange-rates');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://api.exchangerate-api.com/v4/latest/USD',
      'exchange-rates',
    );
    setCache('exchange-rates', data, 60 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'exchange rates fetch failed', { error: String(e) });
    return error('Upstream exchange rate API unavailable', 502);
  }
}

async function handleStockQuote(url: URL): Promise<Response> {
  const raw = url.searchParams.get('symbols') || '';
  if (!raw) return error('Missing symbols parameter', 400);
  const symbols = raw
    .toUpperCase()
    .replace(/[^A-Z0-9.,^=-]/g, '')
    .split(',')
    .filter(Boolean)
    .slice(0, 20);
  if (!symbols.length) return error('No valid symbols', 400);

  const cacheKey = `stock-quote:${symbols.sort().join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  try {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const url2 = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m`;
          const resp = await fetch(url2, {
            headers: { 'User-Agent': 'HydratedSite/1.0' },
            signal: AbortSignal.timeout(8000),
          });
          if (!resp.ok) return null;
          const data = (await resp.json()) as {
            chart?: { result?: Array<{ meta?: Record<string, number> }> | null };
          };
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) return null;
          const price = meta.regularMarketPrice ?? 0;
          const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
          const change = price - prevClose;
          const changePct = prevClose ? (change / prevClose) * 100 : 0;
          return {
            symbol: sym,
            name: meta.shortName || meta.longName || sym,
            price,
            change,
            changePct,
            prevClose,
          };
        } catch {
          return null;
        }
      }),
    );
    const filtered = results.filter(Boolean);
    const out = { data: filtered };
    setCache(cacheKey, out, 60 * 1000);
    return json(out);
  } catch (_e) {
    return error('Stock quote fetch failed', 502);
  }
}

async function handleFred(): Promise<Response> {
  const cached = getCached('fred');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
      'fred',
    );
    setCache('fred', data, 60 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'fred fetch failed', { error: String(e) });
    return error('Upstream NASA API unavailable', 502);
  }
}

async function handleSocialSentiment(): Promise<Response> {
  const cached = getCached('social-sentiment');
  if (cached) return json(cached);

  const positive = new Set([
    'bullish',
    'moon',
    'hodl',
    'buy',
    'long',
    'gain',
    'profit',
    'pump',
    'surge',
    'rally',
    'breakout',
    'ath',
    'undervalued',
    'opportunity',
    'growth',
    'adoption',
    'milestone',
    'record',
    'soar',
    'boom',
    'strong',
    'upgrade',
    'accumulation',
    'bottom',
    'recovery',
  ]);
  const negative = new Set([
    'bearish',
    'dump',
    'crash',
    'sell',
    'short',
    'loss',
    'scam',
    'rug',
    'fear',
    'panic',
    'bubble',
    'overvalued',
    'collapse',
    'plunge',
    'correction',
    'downturn',
    'fraud',
    'hack',
    'exploit',
    'ponzi',
    'decline',
    'risk',
    'warning',
    'lawsuit',
    'ban',
  ]);

  try {
    const data = (await fetchJson(
      'https://www.reddit.com/r/cryptocurrency/hot.json?limit=50',
      'social-sentiment',
      { headers: { 'User-Agent': 'hydrated-worker/1.0' } },
    )) as {
      data?: {
        children: Array<{
          data: { title: string; selftext?: string; score?: number };
        }>;
      };
    };

    let posCount = 0;
    let negCount = 0;
    const posts: Array<{ title: string; score: number; sentiment: string }> = [];

    const children = data?.data?.children ?? [];
    for (const child of children) {
      const text = `${child.data.title} ${child.data.selftext || ''}`.toLowerCase();
      const words = text.split(/\s+/);
      let postPos = 0;
      let postNeg = 0;
      for (const word of words) {
        if (positive.has(word)) postPos++;
        if (negative.has(word)) postNeg++;
      }
      posCount += postPos;
      negCount += postNeg;
      const sentiment = postPos > postNeg ? 'positive' : postNeg > postPos ? 'negative' : 'neutral';
      posts.push({
        title: child.data.title.slice(0, 120),
        score: child.data.score ?? 0,
        sentiment,
      });
    }

    const total = posCount + negCount || 1;
    const result = {
      score: Math.round((posCount / total) * 100),
      positive: posCount,
      negative: negCount,
      totalPosts: children.length,
      posts: posts.slice(0, 10),
    };

    setCache('social-sentiment', result, 15 * 60 * 1000);
    return json(result);
  } catch (e) {
    log('error', 'social sentiment fetch failed', { error: String(e) });
    return error('Upstream Reddit API unavailable', 502);
  }
}

async function handleRestCountries(code: string): Promise<Response> {
  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!sanitized) return error('Missing code parameter', 400);
  const cacheKey = `restcountries:${sanitized}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);
  try {
    const resp = await fetch(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(sanitized)}?fields=name,population,area,region,subregion,capital,languages,currencies,timezones,flags`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!resp.ok) return error('Country not found', 404);
    const data = await resp.json();
    setCache(cacheKey, data, 24 * 60 * 60 * 1000);
    return json(data);
  } catch {
    return error('Upstream countries API unavailable', 502);
  }
}

async function handleWorldBank(url: URL): Promise<Response> {
  const countryCode = (url.searchParams.get('country') || '').toUpperCase();
  const indicators = (url.searchParams.get('indicators') || '').split(',').filter(Boolean);
  if (!countryCode || indicators.length === 0) return error('country and indicators required', 400);
  const cacheKey = `worldbank:${countryCode}:${indicators.join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);
  try {
    const results: Record<string, unknown> = {};
    await Promise.all(
      indicators.map(async (ind) => {
        try {
          const resp = await fetch(
            `https://api.worldbank.org/v2/country/${encodeURIComponent(countryCode)}/indicator/${encodeURIComponent(ind)}?format=json&date=2020:2024&per_page=100`,
            { signal: AbortSignal.timeout(8000) },
          );
          if (resp.ok) {
            const raw = await resp.json();
            if (Array.isArray(raw) && raw.length > 1) {
              const entries = raw[1] || [];
              const latest = entries.find((e: { value: unknown }) => e.value != null);
              results[ind] = latest ? { value: latest.value, date: latest.date } : null;
            }
          }
        } catch {}
      }),
    );
    setCache(cacheKey, results, 60 * 60 * 1000);
    return json(results);
  } catch {
    return error('World Bank API unavailable', 502);
  }
}

async function handleEtfPrice(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const ticker = url.searchParams.get('ticker');
  if (!ticker) return error('ticker is required');

  const sanitized = ticker.replace(/[^A-Z0-9.^-]/gi, '').toUpperCase();
  const cacheKey = `etf-price:${sanitized}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sanitized)}?range=1d&interval=1d`,
      `etf-price:${sanitized}`,
    );
    const result = data as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            previousClose?: number;
            currency?: string;
            symbol?: string;
          };
        }>;
      };
    };
    const meta = result?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? null;
    const prevClose = meta?.previousClose ?? null;
    const change = price && prevClose ? ((price - prevClose) / prevClose) * 100 : null;

    const response = {
      ticker: sanitized,
      price,
      previousClose: prevClose,
      change: change ? Number(change.toFixed(2)) : null,
      currency: meta?.currency ?? 'USD',
    };

    setCache(cacheKey, response, 5 * 60 * 1000);
    return json(response);
  } catch (e) {
    log('error', 'etf price fetch failed', { ticker: sanitized, error: String(e) });
    return error('Upstream Yahoo Finance API unavailable', 502);
  }
}

// --- Guestbook ---

async function handleGuestbookGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20),
  );

  const fallbackEntries = [
    {
      id: '1',
      name: 'Visitor',
      message: 'Great site!',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '2',
      name: 'Dev',
      message: 'Love the WASM widgets.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  let allEntries: Array<{ id: string; name: string; message: string; created_at: string }> =
    fallbackEntries;

  // Try to read from KV if available
  if (env.GUESTBOOK) {
    try {
      const listResult = await env.GUESTBOOK.list({ prefix: 'entry:' });
      if (listResult.keys.length > 0) {
        const kvEntries: Array<{ id: string; name: string; message: string; created_at: string }> =
          [];
        for (const key of listResult.keys) {
          const value = await env.GUESTBOOK.get(key.name);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              // Normalize field name: worker stores as 'created', frontend expects 'created_at'
              if (parsed.created && !parsed.created_at) {
                parsed.created_at = new Date(parsed.created).toISOString();
              }
              kvEntries.push(parsed);
            } catch {
              // Skip malformed entries
            }
          }
        }
        if (kvEntries.length > 0) {
          // Sort by created_at descending (newest first)
          kvEntries.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
          allEntries = kvEntries;
        }
      }
    } catch (e) {
      log('warn', 'KV read failed, using fallback', { error: String(e) });
    }
  }

  const start = (page - 1) * limit;
  const entries = allEntries.slice(start, start + limit);

  return json({
    entries,
    pagination: {
      page,
      limit,
      total: allEntries.length,
      totalPages: Math.ceil(allEntries.length / limit),
    },
  });
}

async function handleGuestbookPost(request: Request, env: Env, ip: string): Promise<Response> {
  if (!checkRateLimit(ip, 5, 10 * 60 * 1000)) {
    return error('Rate limit exceeded. Try again later.', 429);
  }

  // Body size check
  const contentLength = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return error('Request body too large', 413);
  }

  let body: { name?: string; message?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  if (body.website) return json({ success: true }); // Honeypot

  if (!body.name || !body.message) return error('name and message are required');
  if (body.name.length > 50 || body.message.length > 500) return error('Input too long');

  const entry = {
    id: crypto.randomUUID(),
    name: sanitize(body.name),
    message: sanitize(body.message),
    created: Date.now(),
  };

  if (env.GUESTBOOK) {
    await env.GUESTBOOK.put(`entry:${entry.id}`, JSON.stringify(entry));
  }

  log('info', 'guestbook entry created', { id: entry.id, ip });
  return json({ success: true, entry }, 201);
}

async function handleGuestbookDelete(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== env.ADMIN_TOKEN) {
    return error('Unauthorized', 401);
  }

  // Body size check
  const contentLength = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return error('Request body too large', 413);
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

  log('info', 'guestbook entry deleted', { id: body.id });
  return json({ success: true });
}

// --- Metrics Endpoint ---
function handleMetrics(): Response {
  const latencySummary: Record<string, { avg: number; p95: number; count: number }> = {};
  for (const [key, values] of metrics.upstreamLatency) {
    const sorted = [...values].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    latencySummary[key] = { avg: Math.round(avg), p95: Math.round(p95), count: sorted.length };
  }

  const responseTimeSummary: Record<string, { avg: number; count: number }> = {};
  for (const [key, values] of metrics.responseTimes) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    responseTimeSummary[key] = { avg: Math.round(avg), count: values.length };
  }

  checkAlerts();

  return json({
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0,
    cacheSize: cache.size,
    circuitBreakers: Object.fromEntries(
      Array.from(circuits.entries()).map(([k, v]) => [k, { open: v.open, failures: v.failures }]),
    ),
    latency: latencySummary,
    responseTimes: responseTimeSummary,
    alerts: {
      errorRateHigh: metrics.alerts.errorRateHigh,
      slowResponse: metrics.alerts.slowResponse,
    },
  });
}

// --- CSP Report ---
async function handleCspReport(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    log('warn', 'CSP violation', { report: body });
  } catch {
    // Ignore parse errors
  }
  return new Response(null, { status: 204 });
}

// --- API Versioning ---
const SUPPORTED_VERSIONS = ['v1'];
const LATEST_VERSION = 'v1';

function resolveVersionedRoute(path: string): {
  version: string | null;
  route: string;
  isVersioned: boolean;
} {
  const versionMatch = path.match(/^\/api\/(v\d+)(\/.*)?$/);
  if (versionMatch) {
    return {
      version: versionMatch[1],
      route: versionMatch[2] || '/',
      isVersioned: true,
    };
  }
  return { version: null, route: path, isVersioned: false };
}

function addVersionHeaders(response: Response, version: string): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-API-Version', version);
  newResponse.headers.set('X-API-Latest-Version', LATEST_VERSION);
  newResponse.headers.set('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  return newResponse;
}

function addDeprecationHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Deprecation', 'true');
  newResponse.headers.set('Sunset', 'Sat, 01 Jan 2028 00:00:00 GMT');
  newResponse.headers.set('Link', '</api/v1>; rel="successor-version"');
  newResponse.headers.set(
    'X-Deprecation-Notice',
    'Use /api/v1/ instead. Unversioned /api/ will be removed in a future release.',
  );
  return newResponse;
}

function handleVersions(): Response {
  return json({
    versions: SUPPORTED_VERSIONS,
    latest: LATEST_VERSION,
    deprecation: {
      unversioned: true,
      sunset: '2028-01-01',
      message: 'Unversioned /api/ endpoints are deprecated. Use /api/v1/ instead.',
    },
  });
}

// --- Main Router ---
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = Date.now();
    metrics.requests++;

    // Handle CORS preflight
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

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response: Response;
      let isVersioned = false;
      let apiVersion = LATEST_VERSION;

      const { version, route, isVersioned: versioned } = resolveVersionedRoute(path);
      isVersioned = versioned;
      if (version) apiVersion = version;

      const routePath = isVersioned ? `/api${route}` : path;

      if (routePath === '/api/versions') {
        response = handleVersions();
      } else if (routePath === '/api/health') {
        response = json({ status: 'ok', environment: env.ENVIRONMENT, timestamp: Date.now() });
      } else if (routePath === '/api/weather') {
        response = await handleWeather(request);
      } else if (routePath === '/api/stock-chart') {
        response = await handleStockChart(request);
      } else if (routePath === '/api/crypto-ticker') {
        response = await handleCryptoTicker();
      } else if (routePath === '/api/coingecko-global') {
        response = await handleCoinGeckoGlobal();
      } else if (routePath === '/api/earthquakes') {
        response = await handleEarthquakes();
      } else if (routePath === '/api/fear-greed') {
        response = await handleFearGreed();
      } else if (routePath === '/api/kp-index') {
        response = await handleKpIndex();
      } else if (routePath === '/api/mempool') {
        response = await handleMempool();
      } else if (routePath === '/api/binance-klines') {
        response = await handleBinanceKlines(request);
      } else if (routePath === '/api/hacker-news') {
        response = await handleHackerNews();
      } else if (routePath === '/api/github-trending') {
        response = await handleGithubTrending();
      } else if (routePath === '/api/llm-benchmarks') {
        response = await handleLlmBenchmarks(env);
      } else if (routePath === '/api/exchange-rates') {
        response = await handleExchangeRates();
      } else if (routePath === '/api/stock-quote') {
        response = await handleStockQuote(new URL(request.url));
      } else if (routePath === '/api/fred') {
        response = await handleFred();
      } else if (routePath === '/api/social-sentiment') {
        response = await handleSocialSentiment();
      } else if (routePath === '/api/restcountries') {
        const code = new URL(request.url).searchParams.get('code') || '';
        response = await handleRestCountries(code);
      } else if (routePath === '/api/world-bank') {
        response = await handleWorldBank(new URL(request.url));
      } else if (routePath === '/api/etf-price') {
        response = await handleEtfPrice(request);
      } else if (routePath === '/api/metrics') {
        response = handleMetrics();
      } else if (routePath === '/api/csp-report') {
        response = await handleCspReport(request);
      } else if (routePath === '/api/guestbook') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (request.method === 'GET') {
          response = await handleGuestbookGet(request, env);
        } else if (request.method === 'POST') {
          response = await handleGuestbookPost(request, env, ip);
        } else if (request.method === 'DELETE') {
          response = await handleGuestbookDelete(request, env);
        } else {
          response = error('Method not allowed', 405);
        }
      } else {
        response = error('Not found', 404);
      }

      response = addVersionHeaders(response, apiVersion);

      if (!isVersioned && path.startsWith('/api/') && path !== '/api/versions') {
        response = addDeprecationHeaders(response);
      }

      const duration = Date.now() - start;
      recordResponseTime(path, duration);
      response.headers.set('X-Response-Time', `${duration}ms`);
      log('info', 'request', { path, status: response.status, duration, method: request.method });
      return response;
    } catch (e) {
      metrics.errors++;
      checkAlerts();
      log('error', 'unhandled error', { path, error: String(e) });
      return error('Internal server error', 500);
    }
  },
};

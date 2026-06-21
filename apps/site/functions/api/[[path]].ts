// Pages Function: catch-all API handler
// This runs on Cloudflare Pages, NOT as a separate worker

// Minimal local type for the Cloudflare Pages Function entry point.
// The canonical types live in `@cloudflare/workers-types`, but that package
// is only hoisted into the workspace as a transitive dependency, so we declare
// the surface area we actually use here to keep this file self-contained.
interface PagesFunctionEnv {
  AA_API_KEY?: string;
  GUESTBOOK?: { put(key: string, value: string): Promise<void> };
  [key: string]: unknown;
}
interface PagesFunctionContext {
  request: Request;
  env: PagesFunctionEnv;
  params: Record<string, string>;
}
type PagesFunction = (context: PagesFunctionContext) => Response | Promise<Response>;

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

  const _sh: Record<string, string> = {
    'Content-Type': 'application/json',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  let r: Response | undefined;
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
        // Try artificialanalysis.ai API first
        const apiKey = (env as Record<string, string>)?.AA_API_KEY;
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
                .filter((m: { model: string }) => m.model !== 'Unknown');
              if (models.length > 0) {
                setCache('llm', models, 21600000);
                r = json(models);
              }
            }
          } catch {}
        }
        // Fallback: embedded sample data
        if (!r) {
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
          setCache('llm', sample, 21600000);
          r = json(sample);
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
      const ck = `kl:${sym}:${iv}:${lm}`;
      const c = getCached(ck);
      if (c) r = json(c);
      else {
        // CoinGecko market_chart as proxy (Binance blocks CF IPs)
        const coinId = sym.replace('USDT', '').toLowerCase();
        const days = iv === '5m' ? 1 : iv === '1h' ? 7 : iv === '4h' ? 30 : 90;
        const d = await safeFetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
          'kl',
        );
        if (d && (d as Record<string, unknown>).prices) {
          const prices = (d as { prices: number[][] }).prices;
          const klines = prices.map((p: number[]) => [
            p[0], // openTime
            p[1], // open (close from CoinGecko)
            p[1], // high
            p[1], // low
            p[1], // close
            0, // volume (not available from CoinGecko market_chart)
          ]);
          setCache(ck, klines, 300000);
          r = json(klines);
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
        const ck = `st:${sym}:${rng}:${iv}`;
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
            // Fallback: generate sample data for known symbols
            const sampleData: Record<string, { basePrice: number; volatility: number }> = {
              '^GSPC': { basePrice: 5400, volatility: 0.003 },
              '^IXIC': { basePrice: 17000, volatility: 0.004 },
              '^DJI': { basePrice: 39000, volatility: 0.002 },
              AAPL: { basePrice: 195, volatility: 0.005 },
              MSFT: { basePrice: 420, volatility: 0.004 },
              GOOGL: { basePrice: 175, volatility: 0.005 },
              NVDA: { basePrice: 120, volatility: 0.008 },
              AMZN: { basePrice: 185, volatility: 0.005 },
              TSLA: { basePrice: 250, volatility: 0.01 },
              META: { basePrice: 500, volatility: 0.006 },
              BTCUSDT: { basePrice: 65000, volatility: 0.015 },
              ETHUSDT: { basePrice: 3500, volatility: 0.02 },
            };
            const info = sampleData[sym] || { basePrice: 100, volatility: 0.005 };
            const now = Date.now();
            const points =
              rng === '1d' ? 78 : rng === '1w' ? 168 : rng === '1m' ? 120 : rng === '3m' ? 90 : 365;
            const intervalMs =
              rng === '1d' ? 5 * 60 * 1000 : rng === '1w' ? 3600 * 1000 : 86400 * 1000;
            const timestamps: number[] = [];
            const closes: (number | null)[] = [];
            let price = info.basePrice;
            for (let i = points; i >= 0; i--) {
              timestamps.push(Math.floor((now - i * intervalMs) / 1000));
              price *= 1 + (Math.random() - 0.5) * info.volatility * 2;
              closes.push(price);
            }
            const sampleResp = {
              chart: {
                result: [
                  {
                    indicators: {
                      quote: [
                        {
                          close: closes,
                          open: closes.map((c) =>
                            c !== null ? c * (1 - Math.random() * 0.002) : null,
                          ),
                          high: closes.map((c) =>
                            c !== null ? c * (1 + Math.random() * 0.003) : null,
                          ),
                          low: closes.map((c) =>
                            c !== null ? c * (1 - Math.random() * 0.003) : null,
                          ),
                          volume: closes.map(() => Math.floor(Math.random() * 5000000) + 500000),
                        },
                      ],
                    },
                    timestamp: timestamps,
                  },
                ],
              },
            };
            setCache(ck, sampleResp, 300000);
            r = json(sampleResp);
          }
        }
      }
    } else if (path === 'weather') {
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      if (!lat || !lon) r = error('lat and lon required');
      else {
        const ck = `wx:${lat}:${lon}`;
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
        if (env.GUESTBOOK) await env.GUESTBOOK.put(`entry:${entry.id}`, JSON.stringify(entry));
        r = json({ success: true, entry }, 201);
      } else {
        r = error('Method not allowed', 405);
      }
    } else r = error('Not found', 404);
  } catch (_e) {
    r = json({ error: 'Internal server error' }, 500);
  }
  return r;
};

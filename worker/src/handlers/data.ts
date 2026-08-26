import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';

export async function handleExchangeRates(): Promise<Response> {
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

export async function handleStockQuote(url: URL): Promise<Response> {
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
        } catch (e) {
          log('warn', 'stock quote individual fetch failed', { symbol: sym, error: String(e) });
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

export async function handleFred(): Promise<Response> {
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

export async function handleRestCountries(code: string): Promise<Response> {
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
  } catch (e) {
    log('warn', 'restcountries fetch failed', { code: sanitized, error: String(e) });
    return error('Upstream countries API unavailable', 502);
  }
}

export async function handleWorldBank(url: URL): Promise<Response> {
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
        } catch (e) {
          log('warn', 'worldbank indicator fetch failed', { indicator: ind, error: String(e) });
        }
      }),
    );
    setCache(cacheKey, results, 60 * 60 * 1000);
    return json(results);
  } catch (e) {
    log('warn', 'worldbank fetch failed', { country: countryCode, error: String(e) });
    return error('World Bank API unavailable', 502);
  }
}

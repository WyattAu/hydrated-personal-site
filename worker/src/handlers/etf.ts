import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';

export async function handleEtfPrice(request: Request): Promise<Response> {
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

import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';

export async function handleCryptoTicker(): Promise<Response> {
  const cached = getCached('crypto-ticker');
  if (cached) return json(cached);

  const upstreams = [
    {
      name: 'binance',
      url: 'https://api.binance.com/api/v3/ticker/24hr',
    },
    {
      name: 'coingecko',
      url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h',
    },
  ];

  for (const up of upstreams) {
    try {
      const data = await fetchJson(up.url, 'crypto-ticker');
      if (up.name === 'coingecko') {
        const normalised = (data as Array<Record<string, unknown>>).map((coin) => ({
          symbol: `${coin.symbol?.toString().toUpperCase()}USDT`,
          price: coin.current_price,
          priceChange: coin.price_change_24h,
          priceChangePercent: coin.price_change_percentage_24h,
          volume: coin.total_volume,
          quoteVolume: coin.market_cap,
          lastPrice: coin.current_price,
          highPrice: coin.high_24h,
          lowPrice: coin.low_24h,
        }));
        setCache('crypto-ticker', normalised, 30 * 1000);
        return json(normalised);
      }
      setCache('crypto-ticker', data, 10 * 1000);
      return json(data);
    } catch (e) {
      log('warn', 'crypto ticker binance/coingecko failed', {
        upstream: up.name,
        error: String(e),
      });
    }
  }

  // Tier 3: OKX spot tickers (verified working from CF edge).
  try {
    const data = (await fetchJson(
      'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      'crypto-ticker-okx',
    )) as { data: Array<Record<string, string>> };
    const normalised = (data?.data || [])
      .filter((t) => t.instId?.endsWith('-USDT'))
      .slice(0, 100)
      .map((t) => ({
        symbol: t.instId.replace('-USDT', 'USDT'),
        lastPrice: t.last,
        price: Number.parseFloat(t.last),
        priceChange: String(Number.parseFloat(t.last) - Number.parseFloat(t.open24h)),
        priceChangePercent:
          Number.parseFloat(t.open24h) > 0
            ? String(
                ((Number.parseFloat(t.last) - Number.parseFloat(t.open24h)) /
                  Number.parseFloat(t.open24h)) *
                  100,
              )
            : '0',
        volume: t.vol24h || '0',
        quoteVolume: '0',
        highPrice: t.high24h || '0',
        lowPrice: t.low24h || '0',
      }));
    setCache('crypto-ticker', normalised, 30 * 1000);
    return json(normalised);
  } catch (e) {
    log('warn', 'crypto ticker okx failed', { error: String(e) });
  }

  // Tier 4: Bybit spot tickers (verified working from CF edge).
  try {
    const data = (await fetchJson(
      'https://api.bybit.com/v5/market/tickers?category=spot',
      'crypto-ticker-bybit',
    )) as { result: { list: Array<Record<string, string>> } };
    const normalised = (data?.result?.list || [])
      .filter((t) => t.symbol?.endsWith('USDT'))
      .slice(0, 100)
      .map((t) => ({
        symbol: t.symbol,
        lastPrice: t.lastPrice,
        price: Number.parseFloat(t.lastPrice),
        priceChange: String(Number.parseFloat(t.price24hPcnt) * Number.parseFloat(t.lastPrice)),
        priceChangePercent: String(Number.parseFloat(t.price24hPcnt) * 100),
        volume: t.volume24h || '0',
        quoteVolume: t.turnover24h || '0',
        highPrice: t.highPrice24h || '0',
        lowPrice: t.lowPrice24h || '0',
      }));
    setCache('crypto-ticker', normalised, 30 * 1000);
    return json(normalised);
  } catch (e) {
    log('error', 'crypto ticker fetch failed (all upstreams)', { error: String(e) });
  }

  const stale = getCached('crypto-ticker');
  if (stale) return json(stale);
  return error('Upstream crypto API unavailable', 502);
}

export async function handleCoinGeckoGlobal(): Promise<Response> {
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

export async function handleBinanceKlines(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';
  const limit = url.searchParams.get('limit') || '100';

  const cacheKey = `klines:${symbol}:${interval}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  // Tier 1: Binance (geo-blocked from CF edge).
  try {
    const data = await fetchJson(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      'binance-klines',
    );
    setCache(cacheKey, data, 5 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('warn', 'klines binance failed', { symbol, error: String(e) });
  }

  // Tier 2: OKX candles (verified working from CF edge).
  try {
    const okxInstId = symbol.replace('USDT', '-USDT');
    const okxBar =
      interval === '1d'
        ? '1D'
        : interval === '1h'
          ? '1H'
          : interval === '4h'
            ? '4H'
            : interval === '1w'
              ? '1W'
              : interval;
    const data = (await fetchJson(
      `https://www.okx.com/api/v5/market/candles?instId=${okxInstId}&bar=${okxBar}&limit=${limit}`,
      'okx-klines',
    )) as { data: string[][] };
    // Normalise OKX format (newest-first strings) to Binance-like format.
    const normalised = (data?.data || [])
      .reverse()
      .map((c) => [Number.parseInt(c[0]), c[1], c[2], c[3], c[4], c[5]]);
    setCache(cacheKey, normalised, 5 * 60 * 1000);
    return json(normalised);
  } catch (e) {
    log('warn', 'klines okx failed', { symbol, error: String(e) });
  }

  // Tier 3: Kraken OHLC (verified working from CF edge).
  try {
    const krakenPair: Record<string, string> = {
      BTCUSDT: 'XBTUSD',
      ETHUSDT: 'ETHUSD',
      SOLUSDT: 'SOLUSD',
      XRPUSDT: 'XRPUSD',
      ADAUSDT: 'ADAUSD',
    };
    const pair = krakenPair[symbol] || symbol.replace('USDT', 'USD');
    const minMap: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080,
    };
    const mins = minMap[interval] || 1440;
    const data = (await fetchJson(
      `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${mins}`,
      'kraken-klines',
    )) as { result: Record<string, string[][]> };
    const key = Object.keys(data?.result || {}).find((k) => k !== 'last');
    if (key) {
      const normalised = data.result[key].map((c) => [
        Number.parseInt(c[0]),
        c[1],
        c[2],
        c[3],
        c[4],
        c[5],
      ]);
      setCache(cacheKey, normalised, 5 * 60 * 1000);
      return json(normalised);
    }
  } catch (e) {
    log('warn', 'klines kraken failed', { symbol, error: String(e) });
  }

  log('error', 'klines fetch failed (all upstreams)', { symbol });
  const stale = getCached(cacheKey);
  if (stale) return json(stale);
  return error('Upstream klines API unavailable', 502);
}

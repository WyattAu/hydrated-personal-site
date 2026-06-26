/**
 * Multi-tier upstream fetch with automatic fallback.
 *
 * Each upstream source has a chain of providers. The system tries them
 * in order and returns the first success. All responses are normalised
 * to a common shape so downstream code doesn't need per-exchange logic.
 */

interface UpstreamResult {
  data: unknown;
  source: string;
  latency_ms: number;
}

interface UpstreamAttempt {
  name: string;
  url: string;
  headers?: Record<string, string>;
  parse: (res: Response) => Promise<unknown>;
}

const TIMEOUT_MS = 8000;

/**
 * Try upstreams in order, return first success.
 */
async function multiFetch(chain: UpstreamAttempt[]): Promise<UpstreamResult | null> {
  for (const upstream of chain) {
    const start = Date.now();
    try {
      const res = await fetch(upstream.url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: upstream.headers,
      });
      if (!res.ok) continue;
      const data = await upstream.parse(res);
      return { data, source: upstream.name, latency_ms: Date.now() - start };
    } catch {}
  }
  return null;
}

// ============================================================
// CRYPTO KLINES (OHLCV candles)
// ============================================================

export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<{ candles: number[][]; source: string } | null> {
  // Map common symbols to exchange-specific formats
  const okxInstId = symbol.replace('USDT', '-USDT').replace('^', '');
  const krakenPair = symbolToKraken(symbol);
  const yahooSymbol = symbolToYahoo(symbol);

  // Map interval to exchange formats
  const okxBar = intervalToOkxBar(interval);
  const krakenInterval = intervalToKrakenMinutes(interval);

  const chain: UpstreamAttempt[] = [
    {
      name: 'okx',
      url: `https://www.okx.com/api/v5/market/candles?instId=${okxInstId}&bar=${okxBar}&limit=${limit}`,
      parse: async (res) => {
        const d = await res.json();
        if (!d?.data) throw new Error('no data');
        // OKX returns newest first; reverse to oldest first
        return d.data.reverse().map((c: string[]) => [
          Number.parseInt(c[0]), // timestamp
          Number.parseFloat(c[1]), // open
          Number.parseFloat(c[2]), // high
          Number.parseFloat(c[3]), // low
          Number.parseFloat(c[4]), // close
          Number.parseFloat(c[5]), // volume
        ]);
      },
    },
    {
      name: 'kraken',
      url: `https://api.kraken.com/0/public/OHLC?pair=${krakenPair}&interval=${krakenInterval}`,
      headers: {},
      parse: async (res) => {
        const d = await res.json();
        const key = Object.keys(d?.result || {}).find((k) => k !== 'last');
        if (!key) throw new Error('no data');
        return d.result[key]
          .slice(-limit)
          .map((c: string[]) => [
            Number.parseInt(c[0]),
            Number.parseFloat(c[1]),
            Number.parseFloat(c[2]),
            Number.parseFloat(c[3]),
            Number.parseFloat(c[4]),
            Number.parseFloat(c[5]),
          ]);
      },
    },
    {
      name: 'yahoo',
      url: `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${intervalToYahooRange(interval)}&interval=${interval}`,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      parse: async (res) => {
        const d = await res.json();
        const r = d?.chart?.result?.[0];
        if (!r) throw new Error('no data');
        const q = r.indicators.quote[0];
        return r.timestamp
          .slice(-limit)
          .map((t: number, i: number) => [
            t,
            q.open[i] ?? q.close[i],
            q.high[i] ?? q.close[i],
            q.low[i] ?? q.close[i],
            q.close[i],
            q.volume[i] ?? 0,
          ]);
      },
    },
  ];

  const result = await multiFetch(chain);
  if (!result) return null;
  return { candles: result.data as number[][], source: result.source };
}

// ============================================================
// CRYPTO TICKER (24h prices)
// ============================================================

export interface TickerEntry {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
}

export async function fetchCryptoTickers(): Promise<{
  tickers: TickerEntry[];
  source: string;
} | null> {
  const chain: UpstreamAttempt[] = [
    {
      name: 'okx',
      url: 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      parse: async (res) => {
        const d = await res.json();
        return (d?.data || [])
          .filter((t: Record<string, string>) => t.instId?.endsWith('-USDT'))
          .sort(
            (a: Record<string, string>, b: Record<string, string>) =>
              Number.parseFloat(b.volCcy24h || '0') - Number.parseFloat(a.volCcy24h || '0'),
          )
          .slice(0, 50)
          .map((t: Record<string, string>) => ({
            symbol: t.instId.replace('-USDT', 'USDT'),
            price: Number.parseFloat(t.last),
            change: Number.parseFloat(t.last) - Number.parseFloat(t.open24h),
            changePct:
              Number.parseFloat(t.open24h) > 0
                ? ((Number.parseFloat(t.last) - Number.parseFloat(t.open24h)) /
                    Number.parseFloat(t.open24h)) *
                  100
                : 0,
            volume: Number.parseFloat(t.vol24h || '0'),
          }));
      },
    },
    {
      name: 'bybit',
      url: 'https://api.bybit.com/v5/market/tickers?category=spot',
      parse: async (res) => {
        const d = await res.json();
        return (d?.result?.list || [])
          .filter((t: Record<string, string>) => t.symbol?.endsWith('USDT'))
          .slice(0, 100)
          .map((t: Record<string, string>) => ({
            symbol: t.symbol,
            price: Number.parseFloat(t.lastPrice),
            change: Number.parseFloat(t.price24hPcnt) * Number.parseFloat(t.lastPrice),
            changePct: Number.parseFloat(t.price24hPcnt) * 100,
            volume: Number.parseFloat(t.volume24h || '0'),
          }));
      },
    },
  ];

  const result = await multiFetch(chain);
  if (!result) return null;
  return { tickers: result.data as TickerEntry[], source: result.source };
}

// ============================================================
// FUNDING RATES
// ============================================================

export interface FundingEntry {
  symbol: string;
  rate: number;
  nextFunding: string;
}

export async function fetchFundingRates(): Promise<{
  rates: FundingEntry[];
  source: string;
} | null> {
  const chain: UpstreamAttempt[] = [
    {
      name: 'bybit',
      url: 'https://api.bybit.com/v5/market/tickers?category=linear',
      parse: async (res) => {
        const d = await res.json();
        return (d?.result?.list || [])
          .filter((t: Record<string, string>) => t.symbol?.endsWith('USDT') && t.fundingRate)
          .map((t: Record<string, string>) => ({
            symbol: t.symbol,
            rate: Number.parseFloat(t.fundingRate),
            nextFunding: t.nextFundingTime || '',
          }))
          .sort((a: FundingEntry, b: FundingEntry) => Math.abs(b.rate) - Math.abs(a.rate))
          .slice(0, 50);
      },
    },
    {
      name: 'okx',
      url: 'https://www.okx.com/api/v5/public/funding-rate?ccy=BTC&instId=BTC-USDT-SWAP',
      parse: async (res) => {
        const d = await res.json();
        const r = d?.data?.[0];
        if (!r) throw new Error('no data');
        return [
          {
            symbol: 'BTCUSDT',
            rate: Number.parseFloat(r.fundingRate),
            nextFunding: r.fundingTime || '',
          },
        ];
      },
    },
  ];

  const result = await multiFetch(chain);
  if (!result) return null;
  return { rates: result.data as FundingEntry[], source: result.source };
}

// ============================================================
// DERIBIT OPTIONS (with rate-limit handling)
// ============================================================

export interface OptionEntry {
  instrument: string;
  underlying: string;
  expiry: string;
  strike: number;
  type: string;
  iv: number;
  mark_price: number;
  volume: number;
  open_interest: number;
  underlying_price: number;
}

export async function fetchDeribitOptions(
  currency: string,
): Promise<{ options: OptionEntry[]; source: string } | null> {
  const chain: UpstreamAttempt[] = [
    {
      name: 'deribit',
      url: `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`,
      headers: { 'User-Agent': 'HydratedSite/1.0 (https://wyattau.com)' },
      parse: async (res) => {
        const d = await res.json();
        return (d?.result || []).map((opt: Record<string, unknown>) => {
          const name = opt.instrument_name as string;
          const parts = name.split('-');
          return {
            instrument: name,
            underlying: parts[0] || currency,
            expiry: parts[1] || '',
            strike: Number.parseFloat(parts[2] || '0'),
            type: parts[3]?.startsWith('C') ? 'call' : 'put',
            iv: opt.mark_iv as number,
            mark_price: opt.mark_price as number,
            volume: opt.volume as number,
            open_interest: opt.open_interest as number,
            underlying_price: opt.underlying_price as number,
          };
        });
      },
    },
    {
      name: 'okx-options',
      url: `https://www.okx.com/api/v5/public/option-instrument?uly=${currency}-USD`,
      headers: {},
      parse: async (res) => {
        // OKX doesn't have IV in the instrument list, but we get the structure
        const d = await res.json();
        return (d?.data || []).slice(0, 50).map((opt: Record<string, string>) => ({
          instrument: opt.instId || '',
          underlying: currency,
          expiry: opt.expTime || '',
          strike: Number.parseFloat(opt.strike || '0'),
          type: opt.optType === 'C' ? 'call' : 'put',
          iv: 0,
          mark_price: 0,
          volume: 0,
          open_interest: 0,
          underlying_price: 0,
        }));
      },
    },
  ];

  const result = await multiFetch(chain);
  if (!result) return null;
  return { options: result.data as OptionEntry[], source: result.source };
}

// ============================================================
// TREASURY YIELDS (FRED works! Just needs proper fetch)
// ============================================================

export async function fetchTreasuryYields(): Promise<{
  yields: Array<{ label: string; maturity: number; yield: number }>;
  source: string;
} | null> {
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
    try {
      const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.code}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const csv = await res.text();
      const lines = csv.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const val = Number.parseFloat(lastLine.split(',')[1]);
      if (!Number.isNaN(val)) {
        yields.push({ label: s.label, maturity: s.maturity, yield: val });
      }
    } catch {
      // skip
    }
  }

  // Fallback: US Treasury direct API
  if (yields.length === 0) {
    try {
      const res = await fetch(
        'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve&field_tdr_date_value=2026-06-21&_format=csv',
        { signal: AbortSignal.timeout(10000) },
      );
      if (res.ok) {
        const csv = await res.text();
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',');
        const lastRow = lines[lines.length - 1].split(',');
        const colMap: Record<string, number> = {
          '1 Mo': 0.083,
          '3 Mo': 0.25,
          '6 Mo': 0.5,
          '1 Yr': 1.0,
          '2 Yr': 2.0,
          '5 Yr': 5.0,
          '7 Yr': 7.0,
          '10 Yr': 10.0,
          '20 Yr': 20.0,
          '30 Yr': 30.0,
        };
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i].trim();
          if (h in colMap) {
            const val = Number.parseFloat(lastRow[i]);
            if (!Number.isNaN(val)) {
              yields.push({ label: h.replace(' ', ''), maturity: colMap[h], yield: val });
            }
          }
        }
      }
    } catch {
      // skip
    }
  }

  if (yields.length === 0) return null;
  return { yields, source: yields.length >= 10 ? 'fred' : 'treasury-gov' };
}

// ============================================================
// SYMBOL MAPPING HELPERS
// ============================================================

function symbolToKraken(symbol: string): string {
  const map: Record<string, string> = {
    BTCUSDT: 'XBTUSD',
    ETHUSDT: 'ETHUSD',
    SOLUSDT: 'SOLUSD',
    XRPUSDT: 'XRPUSD',
    ADAUSDT: 'ADAUSD',
    DOGEUSDT: 'XDGUSD',
    BNBUSDT: 'BNBUSD',
    AVAXUSDT: 'AVAXUSD',
    DOTUSDT: 'DOTUSD',
    LINKUSDT: 'LINKUSD',
    '^GSPC': '^GSPC',
    '^DJI': '^DJI',
  };
  return map[symbol] || symbol.replace('USDT', 'USD');
}

function symbolToYahoo(symbol: string): string {
  const map: Record<string, string> = {
    BTCUSDT: 'BTC-USD',
    ETHUSDT: 'ETH-USD',
    SOLUSDT: 'SOL-USD',
    BNBUSDT: 'BNB-USD',
    XRPUSDT: 'XRP-USD',
    ADAUSDT: 'ADA-USD',
    DOGEUSDT: 'DOGE-USD',
    AVAXUSDT: 'AVAX-USD',
    '^GSPC': '^GSPC',
    '^DJI': '^DJI',
    '^IXIC': '^IXIC',
  };
  return map[symbol] || symbol;
}

function intervalToOkxBar(interval: string): string {
  const map: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',
    '4h': '4H',
    '1d': '1D',
    '1w': '1W',
  };
  return map[interval] || '1D';
}

function intervalToKrakenMinutes(interval: string): number {
  const map: Record<string, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
    '1w': 10080,
  };
  return map[interval] || 1440;
}

function intervalToYahooRange(interval: string): string {
  const map: Record<string, string> = {
    '5m': '1d',
    '15m': '5d',
    '1h': '1mo',
    '1d': '1y',
    '1w': '5y',
  };
  return map[interval] || '1y';
}

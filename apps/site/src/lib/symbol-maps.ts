export const KRAKEN_PAIRS: Record<string, string> = {
  BTCUSDT: 'XBTUSD',
  ETHUSDT: 'ETHUSD',
  SOLUSDT: 'SOLUSD',
  XRPUSDT: 'XRPUSD',
  ADAUSDT: 'ADAUSD',
};

export const OKX_INTERVALS: Record<string, string> = {
  '1d': '1D',
  '1h': '1H',
  '4h': '4H',
  '1w': '1W',
};

export const KRAKEN_INTERVALS: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
};

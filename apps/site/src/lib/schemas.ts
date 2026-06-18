import * as v from 'valibot';

export const CryptoPriceSchema = v.object({
  symbol: v.string(),
  price: v.string(),
  change24h: v.string(),
  changePercent24h: v.string(),
});

export const WeatherDataSchema = v.object({
  temperature: v.number(),
  condition: v.string(),
  location: v.string(),
});

export const EarthquakeFeatureSchema = v.object({
  properties: v.object({
    mag: v.union([v.number(), v.null()]),
    place: v.union([v.string(), v.null()]),
    time: v.number(),
    updated: v.number(),
    url: v.union([v.string(), v.null()]),
    type: v.string(),
  }),
  geometry: v.object({
    type: v.literal('Point'),
    coordinates: v.tuple([v.number(), v.number(), v.number()]),
  }),
});

export const FearGreedDataSchema = v.object({
  value: v.string(),
  value_classification: v.string(),
  timestamp: v.string(),
});

export const HackerNewsStorySchema = v.object({
  id: v.number(),
  title: v.string(),
  url: v.optional(v.string()),
  score: v.number(),
  author: v.string(),
  time: v.number(),
  comments: v.number(),
});

export const GlobalDataSchema = v.object({
  active_cryptocurrencies: v.number(),
  markets: v.number(),
  total_market_cap: v.record(v.string(), v.number()),
  total_volume: v.record(v.string(), v.number()),
  market_cap_percentage: v.record(v.string(), v.number()),
  market_cap_change_percentage_24h_usd: v.number(),
});

export const KpIndexSchema = v.object({
  timestamp_tag: v.string(),
  kp_index: v.string(),
});

export const HealthResponseSchema = v.object({
  status: v.string(),
  timestamp: v.string(),
});

export const MempoolDataSchema = v.object({
  fees: v.object({
    fastestFee: v.number(),
    halfHourFee: v.number(),
    hourFee: v.number(),
    economyFee: v.number(),
  }),
  mempool: v.object({
    count: v.number(),
    vsize: v.number(),
    total_fee: v.number(),
  }),
});

export const BinanceKlineSchema = v.object({
  openTime: v.number(),
  open: v.string(),
  high: v.string(),
  low: v.string(),
  close: v.string(),
  volume: v.string(),
  closeTime: v.number(),
});

export const LLMBenchmarkModelSchema = v.object({
  model: v.string(),
  parameter_count: v.string(),
  average_score: v.number(),
  mmlu: v.number(),
  hellaswag: v.number(),
  arc: v.number(),
  truthfulqa: v.number(),
  gsm8k: v.number(),
  humaneval: v.number(),
});

export const EtfHoldingSchema = v.object({
  ticker: v.string(),
  name: v.string(),
  weight: v.number(),
});

export const EtfEntrySchema = v.object({
  ticker: v.string(),
  name: v.string(),
  category: v.string(),
  sector_allocation: v.record(v.string(), v.number()),
  region_allocation: v.record(v.string(), v.number()),
  top_holdings: v.array(EtfHoldingSchema),
});

export const EtfPerformanceSchema = v.object({
  total_return: v.number(),
  annualized_return: v.number(),
  volatility: v.number(),
  sharpe_ratio: v.number(),
  max_drawdown: v.number(),
});

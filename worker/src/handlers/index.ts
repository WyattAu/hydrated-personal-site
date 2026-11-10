export { handleWeather, handleStockChart } from './weather';
export { handleCryptoTicker, handleCoinGeckoGlobal, handleBinanceKlines } from './crypto';
export {
  handleEarthquakes,
  handleFearGreed,
  handleKpIndex,
  handleAurora,
  handleSpaceLaunches,
  handleMempool,
} from './macro';
export { handleHackerNews, handleGithubTrending, handleSocialSentiment } from './social';
export {
  handleExchangeRates,
  handleFred,
  handleRestCountries,
  handleWorldBank,
  handleStockQuote,
} from './data';
export { handleEtfPrice } from './etf';
export { handleLlmBenchmarks } from './llm';
export { handleGuestbookGet, handleGuestbookPost, handleGuestbookDelete } from './guestbook';
export {
  handleMetrics,
  handleCspReport,
  handleVersions,
  resolveVersionedRoute,
  addVersionHeaders,
  addDeprecationHeaders,
} from './system';

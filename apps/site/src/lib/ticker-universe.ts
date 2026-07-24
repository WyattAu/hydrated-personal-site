import { createSignal } from 'solid-js';

// Shared ticker universe for cross-asset analysis.
// All cross-asset widgets read from activeTickers() to know which assets to analyze.

export interface TickerEntry {
  symbol: string; // Yahoo Finance symbol
  label: string; // Display label
}

export interface Preset {
  name: string;
  tickers: TickerEntry[];
}

export const PRESETS: Preset[] = [
  {
    name: 'Multi-Asset',
    tickers: [
      { symbol: '^GSPC', label: 'S&P 500' },
      { symbol: 'QQQ', label: 'QQQ' },
      { symbol: 'AAPL', label: 'AAPL' },
      { symbol: 'NVDA', label: 'NVDA' },
      { symbol: 'GLD', label: 'GLD' },
      { symbol: 'TLT', label: 'TLT' },
      { symbol: 'BTC-USD', label: 'BTC' },
      { symbol: 'ETH-USD', label: 'ETH' },
      { symbol: 'CL=F', label: 'Oil' },
      { symbol: 'EURUSD=X', label: 'EUR/USD' },
    ],
  },
  {
    name: 'Tech Giants',
    tickers: [
      { symbol: 'AAPL', label: 'AAPL' },
      { symbol: 'MSFT', label: 'MSFT' },
      { symbol: 'NVDA', label: 'NVDA' },
      { symbol: 'GOOGL', label: 'GOOGL' },
      { symbol: 'AMZN', label: 'AMZN' },
      { symbol: 'META', label: 'META' },
      { symbol: 'TSLA', label: 'TSLA' },
      { symbol: 'AVGO', label: 'AVGO' },
    ],
  },
  {
    name: 'Sector ETFs',
    tickers: [
      { symbol: 'XLF', label: 'Financials' },
      { symbol: 'XLK', label: 'Tech' },
      { symbol: 'XLV', label: 'Healthcare' },
      { symbol: 'XLE', label: 'Energy' },
      { symbol: 'XLI', label: 'Industrial' },
      { symbol: 'XLP', label: 'Staples' },
      { symbol: 'XLU', label: 'Utilities' },
      { symbol: 'SMH', label: 'Semis' },
    ],
  },
  {
    name: 'Macro',
    tickers: [
      { symbol: '^GSPC', label: 'S&P 500' },
      { symbol: '^IXIC', label: 'Nasdaq' },
      { symbol: '^VIX', label: 'VIX' },
      { symbol: 'GLD', label: 'Gold' },
      { symbol: 'TLT', label: '20+Y Bonds' },
      { symbol: 'CL=F', label: 'Oil WTI' },
      { symbol: 'DX-Y.NYB', label: 'DXY' },
      { symbol: 'EURUSD=X', label: 'EUR/USD' },
    ],
  },
  {
    name: 'Crypto',
    tickers: [
      { symbol: 'BTC-USD', label: 'BTC' },
      { symbol: 'ETH-USD', label: 'ETH' },
      { symbol: 'SOL-USD', label: 'SOL' },
      { symbol: 'BNB-USD', label: 'BNB' },
      { symbol: 'XRP-USD', label: 'XRP' },
    ],
  },
];

const DEFAULT = PRESETS[0].tickers;

const [activeTickers, setActiveTickers] = createSignal<TickerEntry[]>([...DEFAULT]);

export { activeTickers };

export function addTicker(entry: TickerEntry) {
  setActiveTickers((prev) => {
    if (prev.some((t) => t.symbol === entry.symbol)) return prev;
    if (prev.length >= 20) return prev;
    return [...prev, entry];
  });
  notifyChange();
}

export function removeTicker(symbol: string) {
  setActiveTickers((prev) => {
    const next = prev.filter((t) => t.symbol !== symbol);
    return next.length < 3 ? prev : next; // minimum 3
  });
  notifyChange();
}

export function loadPreset(name: string) {
  const preset = PRESETS.find((p) => p.name === name);
  if (preset) {
    setActiveTickers([...preset.tickers]);
    notifyChange();
  }
}

export function clearTickers() {
  setActiveTickers([]);
  notifyChange();
}

// Cross-island notification: Astro islands have separate reactive roots,
// so SolidJS createEffect in one island won't fire when a signal is updated
// from another island. We use a window event for cross-island sync.
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tickers-changed'));
  }
}

export function getSymbols(): string[] {
  return activeTickers().map((t) => t.symbol);
}

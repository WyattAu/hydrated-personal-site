import { createSignal } from 'solid-js';

// Shared asset store for the world page quant section.
// Components read activeAsset() to know which symbol to analyze.
// The selector UI writes to setActiveAsset().

export interface AssetOption {
  symbol: string;
  label: string;
  category: 'stock' | 'etf' | 'index' | 'forex' | 'commodity' | 'crypto';
}

export const ASSET_UNIVERSE: AssetOption[] = [
  { symbol: '^GSPC', label: 'S&P 500', category: 'index' },
  { symbol: '^DJI', label: 'Dow Jones', category: 'index' },
  { symbol: '^IXIC', label: 'Nasdaq', category: 'index' },
  { symbol: '^VIX', label: 'VIX', category: 'index' },
  { symbol: 'AAPL', label: 'Apple', category: 'stock' },
  { symbol: 'MSFT', label: 'Microsoft', category: 'stock' },
  { symbol: 'NVDA', label: 'NVIDIA', category: 'stock' },
  { symbol: 'GOOGL', label: 'Alphabet', category: 'stock' },
  { symbol: 'AMZN', label: 'Amazon', category: 'stock' },
  { symbol: 'META', label: 'Meta', category: 'stock' },
  { symbol: 'TSLA', label: 'Tesla', category: 'stock' },
  { symbol: 'SPY', label: 'SPY', category: 'etf' },
  { symbol: 'QQQ', label: 'QQQ', category: 'etf' },
  { symbol: 'IWM', label: 'Russell 2000', category: 'etf' },
  { symbol: 'EURUSD=X', label: 'EUR/USD', category: 'forex' },
  { symbol: 'GBPUSD=X', label: 'GBP/USD', category: 'forex' },
  { symbol: 'JPY=X', label: 'USD/JPY', category: 'forex' },
  { symbol: 'DX-Y.NYB', label: 'DXY', category: 'forex' },
  { symbol: 'GC=F', label: 'Gold', category: 'commodity' },
  { symbol: 'SI=F', label: 'Silver', category: 'commodity' },
  { symbol: 'CL=F', label: 'Oil WTI', category: 'commodity' },
  { symbol: 'HG=F', label: 'Copper', category: 'commodity' },
  { symbol: 'NG=F', label: 'Nat Gas', category: 'commodity' },
  { symbol: 'BTC-USD', label: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETH-USD', label: 'Ethereum', category: 'crypto' },
  { symbol: 'SOL-USD', label: 'Solana', category: 'crypto' },
];

const [activeAsset, setActiveAssetInternal] = createSignal<string>('^GSPC');

// Cross-island notification
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asset-changed'));
  }
}

function setActiveAsset(symbol: string) {
  setActiveAssetInternal(symbol);
  notifyChange();
}

export { activeAsset, setActiveAsset };

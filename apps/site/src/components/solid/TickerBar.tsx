import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

interface TickerItem {
  symbol: string;
  price: string;
  change24h: string;
  changePercent24h: string;
}

export default function TickerBar() {
  const [tickers, setTickers] = createSignal<TickerItem[]>([]);
  const [error, setError] = createSignal(false);
  const [lastUpdated, setLastUpdated] = createSignal<Date | null>(null);
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;

  async function fetchTickers() {
    try {
      abortController?.abort();
      abortController = new AbortController();

      const res = await fetch('/api/crypto-ticker', {
        signal: abortController.signal,
        cache: 'no-cache',
      });

      if (!res.ok) throw new Error('Ticker fetch failed');

      const data = (await res.json()) as { data: TickerItem[] };
      setTickers(data.data ?? []);
      setLastUpdated(new Date());
      setError(false);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Ticker fetch error:', err);
      setError(true);
    }
  }

  function formatPrice(price: string): string {
    const num = Number.parseFloat(price);
    if (Number.isNaN(num)) return price;
    if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (num >= 1)
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }

  function isPositive(change: string): boolean {
    return Number.parseFloat(change) >= 0;
  }

  onMount(() => {
    fetchTickers();
    intervalId = setInterval(fetchTickers, 10_000);
    onCleanup(() => {
      clearInterval(intervalId);
      abortController?.abort();
    });
  });

  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        gap: '24px',
        padding: '8px 16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        'font-family': "'JetBrains Mono', monospace",
        'font-size': '11px',
        overflow: 'hidden',
      }}
      role="status"
      aria-label="Cryptocurrency price ticker"
    >
      <For each={tickers()}>
        {(ticker) => (
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '8px',
              'white-space': 'nowrap',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', 'font-weight': '700' }}>
              {ticker.symbol}
            </span>
            <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>
              ${formatPrice(ticker.price)}
            </span>
            <span
              style={{
                color: isPositive(ticker.changePercent24h) ? '#69f0ae' : '#f85149',
                'font-weight': '500',
              }}
            >
              {isPositive(ticker.changePercent24h) ? '+' : ''}
              {ticker.changePercent24h}%
            </span>
          </div>
        )}
      </For>

      <Show when={error()}>
        <span style={{ color: 'var(--text-secondary)', 'font-style': 'italic' }}>
          Unable to fetch prices
        </span>
      </Show>

      <Show when={lastUpdated()}>
        <span style={{ color: 'var(--text-secondary)', 'font-size': '9px', 'margin-left': 'auto' }}>
          {lastUpdated()?.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </Show>
    </div>
  );
}

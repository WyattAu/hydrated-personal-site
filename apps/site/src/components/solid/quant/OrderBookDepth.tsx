import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { activeAsset } from '../../../lib/asset-store';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const H = 300;

interface DepthFrame {
  lastUpdateId: number;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
}

const WS_URL = 'wss://stream.binance.com:9443/ws';

/// Maps an activeAsset symbol to a Binance USDT pair where possible.
function toBinancePair(asset: string): string {
  const a = asset.toUpperCase().replace('=F', '').replace('/', '');
  if (a.endsWith('USDT')) return a.toLowerCase();
  return `${a}usdt`;
}

export default function OrderBookDepth() {
  const [book, setBook] = createSignal<DepthFrame | null>(null);
  const [pair, setPair] = createSignal('btcusdt');
  const [connected, setConnected] = createSignal(false);
  const [err, setErr] = createSignal<string | null>(null);
  let ws: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;

  function connect(streamPair: string) {
    ws?.close();
    try {
      ws = new WebSocket(`${WS_URL}/${streamPair}@depth20@100ms`);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempts = 0;
      setConnected(true);
      setErr(null);
    };

    ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data as string) as DepthFrame;
        if (frame.bids && frame.asks) setBook(frame);
      } catch {
        /* malformed */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      setErr('stream unavailable for this pair');
      ws?.close();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    attempts += 1;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect(pair());
    }, delay);
  }

  function switchPair(asset: string) {
    const p = toBinancePair(asset);
    setPair(p);
    setBook(null);
    attempts = 0;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    connect(p);
  }

  onMount(() => switchPair(activeAsset()));
  onCleanup(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  });

  function renderChart() {
    const b = book();
    if (!b) return;
    const bids = b.bids.slice(0, 15).map((x) => [Number(x[0]), Number(x[1])]);
    const asks = b.asks.slice(0, 15).map((x) => [Number(x[0]), Number(x[1])]);
    renderPlychart('l2-depth', 'update_order_book', JSON.stringify({ bids, asks }), '');
  }

  createEffect(() => {
    book();
    renderChart();
  });
  usePlychartAuto(() => 'l2-depth', renderChart);

  const best = () => {
    const b = book();
    if (!b || !b.bids.length || !b.asks.length) return null;
    const bid = Number(b.bids[0][0]);
    const ask = Number(b.asks[0][0]);
    return { bid, ask, spread: ask - bid, spreadBps: ((ask - bid) / ((ask + bid) / 2)) * 10_000 };
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          L2 ORDER BOOK: {pair().toUpperCase()}
        </p>
        <span
          class="font-mono text-[10px] flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            class="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: connected() ? '#4caf50' : '#ff9800' }}
          />
          {connected() ? 'LIVE @100ms' : 'RECONNECTING'}
        </span>
      </div>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()} — showing BTC as fallback.
        </p>
      </Show>

      <canvas id="l2-depth" class="w-full" style={{ height: `${H}px` }} />

      <Show when={best()}>
        <div class="grid grid-cols-3 gap-2 mt-3">
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              BEST BID
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: '#4caf50' }}>
              {best()!.bid}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              SPREAD
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {best()!.spreadBps.toFixed(1)} bps
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              BEST ASK
            </p>
            <p class="font-mono text-sm font-bold" style={{ color: '#ff5252' }}>
              {best()!.ask}
            </p>
          </div>
        </div>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          partial depth20 @ 100ms | green = bids, red = asks | spread in basis points
        </p>
      </Show>
    </div>
  );
}

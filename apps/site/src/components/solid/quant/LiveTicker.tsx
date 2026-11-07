import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

interface Tick {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  updated: number;
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];

const WS_URL = `wss://stream.binance.com:9443/stream?streams=${SYMBOLS.map(
  (s) => `${s.toLowerCase()}@miniTicker`,
).join('/')}`;

const POLL_INTERVAL = 10_000;
/** Ticks older than this are dropped from the grid. */
const REFRESH_STALE_MS = POLL_INTERVAL;
/** Consecutive REST failures before declaring market data unavailable. */
const REST_FAILURE_LIMIT = 3;
/** If WS produces nothing within this window, fall back to REST polling. */
const WS_FALLBACK_MS = 5_000;

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function label(sym: string): string {
  return sym.replace('USDT', '').toUpperCase();
}

export default function LiveTicker() {
  const [ticks, setTicks] = createSignal<Record<string, Tick>>({});
  const [source, setSource] = createSignal<'connecting' | 'ws' | 'rest' | 'error'>('connecting');
  let ws: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let wsFallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let restFailures = 0;
  let destroyed = false;

  // --- REST polling fallback ---

  async function pollRest() {
    if (destroyed) return;
    try {
      const res = await fetch(`${apiBase()}/api/crypto-ticker`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const raw = body?.data ?? body;
      const items: Array<{
        symbol?: string;
        lastPrice?: string | number;
        price?: string | number;
        priceChangePercent?: string | number;
        highPrice?: string | number;
        lowPrice?: string | number;
        quoteVolume?: string | number;
      }> = Array.isArray(raw) ? raw : [];
      const now = Date.now();
      const updates: Record<string, Tick> = {};
      for (const item of items) {
        const sym = (item.symbol ?? '').toUpperCase();
        if (!SYMBOLS.includes(sym)) continue;
        const price = Number(item.lastPrice ?? item.price ?? 0);
        if (!Number.isFinite(price) || price <= 0) continue;
        updates[sym] = {
          price,
          open: price / (1 + Number(item.priceChangePercent ?? 0) / 100),
          high: Number(item.highPrice ?? price),
          low: Number(item.lowPrice ?? price),
          volume: Number(item.quoteVolume ?? 0),
          updated: now,
        };
      }
      if (Object.keys(updates).length > 0) {
        setTicks((prev) => ({ ...prev, ...updates }));
        restFailures = 0;
        setSource('rest');
      }
    } catch {
      restFailures += 1;
      if (restFailures >= REST_FAILURE_LIMIT && source() !== 'ws') {
        setSource('error');
      }
    }
  }

  function startPolling() {
    if (pollTimer || destroyed) return;
    void pollRest();
    pollTimer = setInterval(pollRest, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  }

  // --- WebSocket primary ---

  function connect() {
    if (destroyed) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      startPolling();
      return;
    }

    ws.onopen = () => {
      attempts = 0;
      setSource('ws');
      // If WS doesn't produce data within WS_FALLBACK_MS, start REST polling
      wsFallbackTimer = setTimeout(() => {
        if (Object.keys(ticks()).length === 0 && !destroyed) {
          startPolling();
        }
      }, WS_FALLBACK_MS);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        const d = msg?.data ?? msg;
        if (d?.e !== '24hrMiniTicker' || !d.s) return;
        const price = Number(d.c);
        if (!Number.isFinite(price)) return;
        // WS is working — stop REST polling
        stopPolling();
        setSource('ws');
        setTicks((prev) => ({
          ...prev,
          [d.s.toLowerCase()]: {
            price,
            open: Number(d.o),
            high: Number(d.h),
            low: Number(d.l),
            volume: Number(d.q),
            updated: Date.now(),
          },
        }));
      } catch {
        /* malformed frame */
      }
    };

    ws.onclose = () => {
      setSource('connecting');
      if (!destroyed) scheduleReconnect();
    };

    ws.onerror = () => ws?.close();
  }

  function scheduleReconnect() {
    if (reconnectTimer || destroyed) return;
    attempts += 1;
    // Always start polling as a fallback while WS reconnects
    startPolling();
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  onMount(() => {
    // Poll REST immediately; WS takes over (and stops polling) once it
    // produces its first frame.
    startPolling();
    connect();
  });
  onCleanup(() => {
    destroyed = true;
    stopPolling();
    if (wsFallbackTimer) clearTimeout(wsFallbackTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  });

  const visible = () => {
    const all = ticks();
    const now = Date.now();
    return SYMBOLS.filter((s) => all[s] && now - all[s].updated < REFRESH_STALE_MS * 20);
  };

  const sourceLabel = () => {
    switch (source()) {
      case 'ws':
        return 'BINANCE WS';
      case 'rest':
        return 'REST POLL';
      case 'error':
        return 'OFFLINE';
      default:
        return 'CONNECTING';
    }
  };

  const sourceColor = () => {
    // follows theme tokens: connected = positive, polling = warm accent,
    // error = negative, idle = secondary
    switch (source()) {
      case 'ws':
        return 'var(--positive, #34d399)';
      case 'rest':
        return 'var(--accent-warm, #ff9800)';
      case 'error':
        return 'var(--negative, #f87171)';
      default:
        return 'var(--text-secondary, #666)';
    }
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          LIVE PRICES
        </p>
        <span
          class="font-mono text-[10px] flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            class="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: sourceColor() }}
          />
          {sourceLabel()}
        </span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <For each={visible()}>
          {(sym) => {
            const t = () => ticks()[sym];
            const delta = () => ((t().price - t().open) / t().open) * 100;
            const up = () => delta() >= 0;
            return (
              <div
                class="p-3 border transition-colors"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <p
                  class="font-mono text-[9px] tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {label(sym)}/USDT
                </p>
                <p
                  class="font-mono text-lg font-bold"
                  style={{ color: up() ? 'var(--positive, #34d399)' : 'var(--negative, #f87171)' }}
                >
                  {fmt(t().price)}
                </p>
                <p
                  class="font-mono text-[10px]"
                  style={{ color: up() ? 'var(--positive, #34d399)' : 'var(--negative, #f87171)' }}
                >
                  {up() ? '+' : ''}
                  {delta().toFixed(2)}%
                </p>
                <p class="font-mono text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  H {fmt(t().high)} · L {fmt(t().low)}
                </p>
              </div>
            );
          }}
        </For>
        <Show when={visible().length === 0}>
          <p class="font-mono text-xs p-4 col-span-full" style={{ color: 'var(--text-secondary)' }}>
            {source() === 'error'
              ? 'Market data unavailable'
              : `Connecting to market data — ${sourceLabel()}...`}
          </p>
        </Show>
      </div>
    </div>
  );
}

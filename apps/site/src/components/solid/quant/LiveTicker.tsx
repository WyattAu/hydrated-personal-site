import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

interface Tick {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  updated: number;
}

const SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'adAusdt'];

const WS_URL = `wss://stream.binance.com:9443/stream?streams=${SYMBOLS.map(
  (s) => `${s}@miniTicker`,
).join('/')}`;

const REFRESH_STALE_MS = 30_000;

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function label(sym: string): string {
  return sym.replace('usdt', '').toUpperCase();
}

export default function LiveTicker() {
  const [ticks, setTicks] = createSignal<Record<string, Tick>>({});
  const [connected, setConnected] = createSignal(false);
  const [everConnected, setEverConnected] = createSignal(false);
  let ws: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;

  function connect() {
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempts = 0;
      setConnected(true);
      setEverConnected(true);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        // Combined stream envelope: { stream, data }
        const d = msg?.data ?? msg;
        if (d?.e !== '24hrMiniTicker' || !d.s) return;
        const price = Number(d.c);
        if (!Number.isFinite(price)) return;
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
      setConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    attempts += 1;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  onMount(() => connect());
  onCleanup(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  });

  // Drop stale symbols from the grid so dead pairs fade out.
  const visible = () => {
    const all = ticks();
    const now = Date.now();
    return SYMBOLS.filter((s) => all[s] && now - all[s].updated < REFRESH_STALE_MS * 20);
  };

  const deltaPct = (t: Tick) => ((t.price - t.open) / t.open) * 100;

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
            style={{
              background: connected() ? '#4caf50' : everConnected() ? '#ff9800' : '#666',
            }}
          />
          {connected() ? 'BINANCE WS' : everConnected() ? 'RECONNECTING' : 'CONNECTING'}
        </span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <For each={visible()}>
          {(sym) => {
            const t = () => ticks()[sym];
            const delta = () => deltaPct(t());
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
                  style={{ color: up() ? '#4caf50' : '#ff5252' }}
                >
                  {fmt(t().price)}
                </p>
                <p class="font-mono text-[10px]" style={{ color: up() ? '#4caf50' : '#ff5252' }}>
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
            Waiting for ticker data...
          </p>
        </Show>
      </div>
    </div>
  );
}

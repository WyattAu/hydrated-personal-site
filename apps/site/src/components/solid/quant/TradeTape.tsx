import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { activeAsset } from '../../../lib/asset-store';

interface Trade {
  id: number;
  price: number;
  qty: number;
  isBuyerMaker: boolean;
  time: number;
}

const MAX_ROWS = 24;

function toBinancePair(asset: string): string {
  const a = asset.toUpperCase().replace('=F', '').replace('/', '');
  if (a.endsWith('USDT')) return a.toLowerCase();
  return `${a}usdt`;
}

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function TradeTape() {
  const [trades, setTrades] = createSignal<Trade[]>([]);
  const [pair, setPair] = createSignal(toBinancePair(activeAsset()));
  const [connected, setConnected] = createSignal(false);
  let ws: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;

  function connect(p: string) {
    ws?.close();
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${p}@aggTrade`);
    } catch {
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      attempts = 0;
      setConnected(true);
    };
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string);
        if (d?.e !== 'aggTrade') return;
        const t: Trade = {
          id: Number(d.a),
          price: Number(d.p),
          qty: Number(d.q),
          isBuyerMaker: Boolean(d.m), // true = sell-side aggressor (red)
          time: Number(d.T),
        };
        setTrades((prev) => [t, ...prev].slice(0, MAX_ROWS));
      } catch {
        /* malformed */
      }
    };
    ws.onclose = () => {
      setConnected(false);
      scheduleReconnect();
    };
    ws.onerror = () => ws?.close();
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
    setTrades([]);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    connect(p);
  }

  onMount(() => switchPair(activeAsset()));
  onCleanup(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  });

  // Net flow over visible tape: buy volume minus sell volume.
  const netFlow = () => {
    const ts = trades();
    let buy = 0;
    let sell = 0;
    for (const t of ts) {
      const notional = t.price * t.qty;
      if (t.isBuyerMaker) sell += notional;
      else buy += notional;
    }
    const total = buy + sell;
    if (total === 0) return null;
    return { pct: ((buy - sell) / total) * 100, buy, sell };
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          TRADE TAPE: {pair().toUpperCase()}
        </p>
        <span
          class="font-mono text-[10px] flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            class="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: connected() ? '#4caf50' : '#ff9800' }}
          />
          aggTrade
        </span>
      </div>
      <div class="max-h-[340px] overflow-y-auto border" style={{ 'border-color': 'var(--border)' }}>
        <table class="w-full font-mono text-[10px]">
          <thead>
            <tr style={{ color: 'var(--text-secondary)' }} class="sticky top-0">
              <th class="text-left p-1.5" style={{ background: 'var(--bg-card)' }}>
                TIME
              </th>
              <th class="text-right p-1.5" style={{ background: 'var(--bg-card)' }}>
                PRICE
              </th>
              <th class="text-right p-1.5" style={{ background: 'var(--bg-card)' }}>
                QTY
              </th>
              <th class="text-right p-1.5" style={{ background: 'var(--bg-card)' }}>
                SIDE
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={trades()}>
              {(t) => (
                <tr
                  style={{
                    color: t.isBuyerMaker ? 'var(--negative, #ff5252)' : 'var(--positive, #4caf50)',
                    background: t.isBuyerMaker ? 'rgba(255,82,82,0.04)' : 'rgba(76,175,80,0.04)',
                  }}
                >
                  <td class="p-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {fmtTime(t.time)}
                  </td>
                  <td class="p-1.5 text-right">{fmt(t.price)}</td>
                  <td class="p-1.5 text-right">{t.qty.toFixed(4)}</td>
                  <td class="p-1.5 text-right">{t.isBuyerMaker ? 'SELL' : 'BUY'}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <Show when={trades().length === 0}>
          <p class="font-mono text-xs p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            Waiting for trades...
          </p>
        </Show>
      </div>
      <Show when={netFlow()}>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          TAPE FLOW:{' '}
          <span
            style={{
              color: netFlow()!.pct >= 0 ? 'var(--positive, #4caf50)' : 'var(--negative, #ff5252)',
            }}
          >
            {netFlow()!.pct >= 0 ? '+' : ''}
            {netFlow()!.pct.toFixed(1)}% buy
          </span>{' '}
          over last {trades().length} prints
        </p>
      </Show>
    </div>
  );
}

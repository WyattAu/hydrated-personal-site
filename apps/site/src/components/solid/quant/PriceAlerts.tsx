import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { activeAsset } from '../../../lib/asset-store';
import { createNotification } from '../../../lib/notifications';

interface Alert {
  id: number;
  pair: string;
  above: boolean;
  threshold: number;
  fired: boolean;
  firedAt?: number;
}

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];

const WS_URL = `wss://stream.binance.com:9443/stream?streams=${PAIRS.map(
  (p) => `${p.toLowerCase()}@miniTicker`,
).join('/')}`;

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

let nextId = 1;

export default function PriceAlerts() {
  const [prices, setPrices] = createSignal<Record<string, number>>({});
  const [alerts, setAlerts] = createSignal<Alert[]>([]);
  const [pair, setPair] = createSignal('BTCUSDT');
  const [threshold, setThreshold] = createSignal('');
  const [direction, setDirection] = createSignal<'above' | 'below'>('above');
  const [permission, setPermission] = createSignal<NotificationPermission>('default');
  let ws: WebSocket | undefined;

  onMount(() => {
    if ('Notification' in window) setPermission(Notification.permission);
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          const d = msg?.data ?? msg;
          if (d?.e !== '24hrMiniTicker' || !d.s) return;
          const price = Number(d.c);
          if (!Number.isFinite(price)) return;
          const sym = d.s.toUpperCase();
          setPrices((prev) => ({ ...prev, [sym]: price }));
          checkAlerts(sym, price);
        } catch {
          /* malformed */
        }
      };
    } catch {
      /* WS unavailable */
    }
  });

  onCleanup(() => ws?.close());

  function checkAlerts(sym: string, price: number) {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.fired || a.pair !== sym) return a;
        const hit = a.above ? price >= a.threshold : price <= a.threshold;
        if (!hit) return a;
        const msg = `${sym} ${a.above ? '≥' : '≤'} ${fmt(a.threshold)} — now ${fmt(price)}`;
        createNotification('Price Alert', { body: msg, tag: `alert-${a.id}` });
        return { ...a, fired: true, firedAt: Date.now() };
      }),
    );
  }

  async function requestPermission() {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }

  function arm() {
    const v = Number(threshold());
    if (!Number.isFinite(v) || v <= 0) return;
    setAlerts((prev) => [
      ...prev,
      { id: nextId++, pair: pair(), above: direction() === 'above', threshold: v, fired: false },
    ]);
    setThreshold('');
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          PRICE ALERTS
        </p>
        <Show when={permission() !== 'granted'}>
          <button
            type="button"
            class="font-mono text-[9px] px-2 py-0.5 border cursor-pointer"
            style={{
              'border-color': 'var(--border)',
              color: 'var(--accent)',
              background: 'var(--bg-secondary)',
            }}
            onClick={requestPermission}
            onKeyDown={(e) => e.key === 'Enter' && requestPermission()}
          >
            ENABLE NOTIFICATIONS
          </button>
        </Show>
      </div>

      <div class="flex gap-2 items-center mb-3 flex-wrap">
        <select
          class="font-mono text-[10px] px-2 py-1 border cursor-pointer"
          style={{
            'border-color': 'var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--bg-secondary)',
          }}
          value={pair()}
          onChange={(e) => setPair(e.currentTarget.value)}
        >
          <For each={PAIRS}>{(p) => <option value={p}>{p}</option>}</For>
        </select>
        <select
          class="font-mono text-[10px] px-2 py-1 border cursor-pointer"
          style={{
            'border-color': 'var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--bg-secondary)',
          }}
          value={direction()}
          onChange={(e) => setDirection(e.currentTarget.value as 'above' | 'below')}
        >
          <option value="above">≥ above</option>
          <option value="below">≤ below</option>
        </select>
        <input
          type="number"
          placeholder="threshold"
          value={threshold()}
          onInput={(e) => setThreshold(e.currentTarget.value)}
          class="font-mono text-[10px] px-2 py-1 border w-28"
          style={{
            'border-color': 'var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--bg-secondary)',
          }}
        />
        <button
          type="button"
          class="font-mono text-[10px] px-3 py-1 border cursor-pointer"
          style={{
            'border-color': 'var(--accent)',
            color: 'var(--accent)',
            background: 'var(--bg-secondary)',
          }}
          onClick={arm}
          onKeyDown={(e) => e.key === 'Enter' && arm()}
        >
          ARM
        </button>
        <Show when={prices()[pair()]}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            last: {fmt(prices()[pair()]!)}
          </span>
        </Show>
      </div>

      <Show when={alerts().length > 0}>
        <div class="space-y-1">
          <For each={alerts()}>
            {(a) => (
              <div
                class="flex items-center justify-between p-2 border font-mono text-[10px]"
                style={{
                  'border-color': a.fired ? 'var(--accent)' : 'var(--border)',
                  background: a.fired ? 'rgba(0,229,255,0.06)' : 'var(--bg-secondary)',
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>
                  {a.pair} {a.above ? '≥' : '≤'} {fmt(a.threshold)}
                </span>
                <span style={{ color: a.fired ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {a.fired ? 'FIRED' : 'ARMED'}
                </span>
              </div>
            )}
          </For>
        </div>
        <button
          type="button"
          class="font-mono text-[9px] px-2 py-0.5 border cursor-pointer mt-2"
          style={{
            'border-color': 'var(--border)',
            color: 'var(--text-secondary)',
            background: 'transparent',
          }}
          onClick={() => setAlerts([])}
          onKeyDown={(e) => e.key === 'Enter' && setAlerts([])}
        >
          CLEAR ALL
        </button>
      </Show>
      <Show when={alerts().length === 0}>
        <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          Arm a threshold — alerts fire as browser notifications while the page is open.
        </p>
      </Show>
    </div>
  );
}

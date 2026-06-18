import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

// biome-ignore lint/correctness/noUnusedVariables: interface used for type documentation
interface Metric {
  key: string;
  label: string;
  value: () => string;
  change?: () => number | null;
  refreshMs: number;
}

function useBtcPrice() {
  const [price, setPrice] = createSignal<number | null>(null);
  const [prev, setPrev] = createSignal<number | null>(null);

  async function fetch_() {
    try {
      const res = await fetch('/api/crypto-ticker');
      const data = await res.json();
      const btc = Array.isArray(data)
        ? data.find((t: { symbol: string }) => t.symbol === 'BTCUSDT')
        : null;
      if (btc) {
        setPrev(price());
        setPrice(Number.parseFloat(btc.lastPrice));
      }
    } catch {}
  }

  onMount(() => {
    fetch_();
    const id = setInterval(fetch_, 10_000);
    onCleanup(() => clearInterval(id));
  });

  return {
    value: () => {
      const p = price();
      return p !== null ? `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '---';
    },
    change: () => {
      const p = price();
      const pr = prev();
      if (p === null || pr === null || pr === 0) return null;
      return ((p - pr) / pr) * 100;
    },
  };
}

function useEthPrice() {
  const [price, setPrice] = createSignal<number | null>(null);
  const [prev, setPrev] = createSignal<number | null>(null);

  async function fetch_() {
    try {
      const res = await fetch('/api/crypto-ticker');
      const data = await res.json();
      const eth = Array.isArray(data)
        ? data.find((t: { symbol: string }) => t.symbol === 'ETHUSDT')
        : null;
      if (eth) {
        setPrev(price());
        setPrice(Number.parseFloat(eth.lastPrice));
      }
    } catch {}
  }

  onMount(() => {
    fetch_();
    const id = setInterval(fetch_, 10_000);
    onCleanup(() => clearInterval(id));
  });

  return {
    value: () => {
      const p = price();
      return p !== null ? `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '---';
    },
    change: () => {
      const p = price();
      const pr = prev();
      if (p === null || pr === null || pr === 0) return null;
      return ((p - pr) / pr) * 100;
    },
  };
}

function useSp500() {
  const [price, setPrice] = createSignal<number | null>(null);
  const [change, setChange] = createSignal<number | null>(null);

  async function fetch_() {
    try {
      const res = await fetch('/api/stock-chart?symbol=^GSPC&range=1d&interval=5m');
      const data = await res.json();
      const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
      if (quotes?.close) {
        const closes = quotes.close.filter((v: number | null) => v !== null);
        if (closes.length >= 2) {
          setPrice(closes[closes.length - 1]);
          setChange(((closes[closes.length - 1] - closes[0]) / closes[0]) * 100);
        }
      }
    } catch {}
  }

  onMount(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    onCleanup(() => clearInterval(id));
  });

  return {
    value: () => {
      const p = price();
      return p !== null ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---';
    },
    change,
  };
}

function useFearGreed() {
  const [value, setValue] = createSignal<number | null>(null);
  const [label, setLabel] = createSignal<string>('');

  async function fetch_() {
    try {
      const res = await fetch('/api/fear-greed');
      const data = await res.json();
      if (data?.data?.[0]) {
        setValue(Number.parseInt(data.data[0].value));
        setLabel(data.data[0].value_classification);
      }
    } catch {}
  }

  onMount(() => {
    fetch_();
    const id = setInterval(fetch_, 5 * 60_000);
    onCleanup(() => clearInterval(id));
  });

  return {
    value: () => {
      const v = value();
      return v !== null ? `${v}` : '---';
    },
    displayLabel: label,
    change: () => null,
  };
}

function useKpIndex() {
  const [kp, setKp] = createSignal<number | null>(null);

  async function fetch_() {
    try {
      const res = await fetch('/api/kp-index');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1];
        setKp(Number.parseFloat(latest.kp_index));
      }
    } catch {}
  }

  onMount(() => {
    fetch_();
    const id = setInterval(fetch_, 10 * 60_000);
    onCleanup(() => clearInterval(id));
  });

  return {
    value: () => {
      const k = kp();
      return k !== null ? k.toFixed(1) : '---';
    },
    change: () => null,
  };
}

function useMempoolFees() {
  const [fees, setFees] = createSignal<{ fastest: number; mid: number } | null>(null);

  async function fetch_() {
    try {
      const res = await fetch('/api/mempool');
      const data = await res.json();
      if (data?.fees) {
        setFees({
          fastest: data.fees.fastestFee,
          mid: data.fees.halfHourFee,
        });
      }
    } catch {}
  }

  onMount(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    onCleanup(() => clearInterval(id));
  });

  return {
    value: () => {
      const f = fees();
      return f !== null ? `${f.fastest} sat` : '---';
    },
    change: () => null,
  };
}

function SkeletonCard() {
  return (
    <div class="p-4 border" style="border-color: var(--border); background: var(--bg-card);">
      <div
        class="h-2 w-16 mb-3"
        style="background: var(--border); animation: pulse 1.5s infinite;"
      />
      <div
        class="h-6 w-24 mb-1"
        style="background: var(--border); animation: pulse 1.5s infinite;"
      />
      <div class="h-2 w-12" style="background: var(--border); animation: pulse 1.5s infinite;" />
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  change?: number | null;
  sublabel?: string;
}) {
  return (
    <div
      class="p-4 border transition-colors"
      style="border-color: var(--border); background: var(--bg-card);"
      role="status"
      aria-label={`${props.label}: ${props.value}`}
    >
      <p
        class="code-text mb-1 font-bold tracking-wider"
        style="color: var(--text-secondary); font-size: 9px; letter-spacing: 0.3em;"
      >
        {props.label.toUpperCase()}
      </p>
      <p class="font-mono text-xl font-bold" style="color: var(--text-primary);">
        {props.value}
      </p>
      <Show when={props.change !== null && props.change !== undefined}>
        <p
          class="code-text mt-1"
          style={{
            color:
              props.change! > 0
                ? '#69f0ae'
                : props.change! < 0
                  ? '#f44336'
                  : 'var(--text-secondary)',
          }}
        >
          {props.change! > 0 ? '+' : ''}
          {props.change?.toFixed(2)}%
        </p>
      </Show>
      <Show when={props.sublabel}>
        <p class="code-text mt-1" style="color: var(--text-secondary);">
          {props.sublabel}
        </p>
      </Show>
    </div>
  );
}

export default function MetricCards() {
  const btc = useBtcPrice();
  const eth = useEthPrice();
  const sp = useSp500();
  const fg = useFearGreed();
  const kp = useKpIndex();
  const mp = useMempoolFees();

  const [loaded, setLoaded] = createSignal(false);

  onMount(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    onCleanup(() => clearTimeout(t));
  });

  return (
    <div>
      <p class="label mb-3" style="color: var(--accent);">
        METRICS
      </p>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Show
          when={loaded()}
          fallback=<For each={[1, 2, 3, 4, 5, 6]}>{() => <SkeletonCard />}</For>
        >
          <MetricCard label="BTC" value={btc.value()} change={btc.change()} />
          <MetricCard label="ETH" value={eth.value()} change={eth.change()} />
          <MetricCard label="S&P 500" value={sp.value()} change={sp.change()} />
          <MetricCard label="Fear & Greed" value={fg.value()} sublabel={fg.displayLabel()} />
          <MetricCard label="Kp Index" value={kp.value()} />
          <MetricCard label="Mempool" value={mp.value()} sublabel="fastest fee" />
        </Show>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

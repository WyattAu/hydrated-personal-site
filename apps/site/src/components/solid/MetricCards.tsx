import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { storeMetric, getMetricTrend } from '../../lib/metrics-history';

// biome-ignore lint/correctness/noUnusedVariables: interface used for type documentation
interface Metric {
  key: string;
  label: string;
  value: () => string;
  change?: () => number | null;
  refreshMs: number;
}

function useCryptoPrice(symbol: string) {
  const [price, setPrice] = createSignal<number | null>(null);
  const [prev, setPrev] = createSignal<number | null>(null);

  async function fetch_() {
    try {
      const res = await fetch('/api/crypto-ticker');
      const data = await res.json();
      const match = Array.isArray(data)
        ? data.find((t: { symbol: string }) => t.symbol === symbol)
        : null;
      if (match) {
        setPrev(price());
        setPrice(Number.parseFloat(match.lastPrice));
        storeMetric(symbol, Number.parseFloat(match.lastPrice));
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
      return p !== null ? `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'N/A';
    },
    change: () => {
      const p = price();
      const pr = prev();
      if (p === null || pr === null || pr === 0) return null;
      return ((p - pr) / pr) * 100;
    },
    trend: () => getMetricTrend(symbol),
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
          storeMetric('SP500', closes[closes.length - 1]);
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
      return p !== null ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A';
    },
    change,
    trend: () => getMetricTrend('SP500'),
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
        const v = Number.parseInt(data.data[0].value);
        setValue(v);
        setLabel(data.data[0].value_classification);
        storeMetric('fear-greed', v);
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
      return v !== null ? `${v}` : 'N/A';
    },
    displayLabel: label,
    change: () => null,
    trend: () => getMetricTrend('fear-greed'),
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
        const v = Number.parseFloat(latest.kp_index);
        setKp(v);
        storeMetric('kp-index', v);
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
      return k !== null ? k.toFixed(1) : 'N/A';
    },
    change: () => null,
    trend: () => getMetricTrend('kp-index'),
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
        storeMetric('mempool', data.fees.fastestFee);
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
      return f !== null ? `${f.fastest} sat` : 'N/A';
    },
    change: () => null,
    trend: () => getMetricTrend('mempool'),
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

function TrendArrow(props: { trend: 'increasing' | 'decreasing' | 'stable' }) {
  return (
    <span
      class="trend-arrow"
      style={{
        color:
          props.trend === 'increasing'
            ? '#69f0ae'
            : props.trend === 'decreasing'
              ? '#f44336'
              : 'var(--text-secondary)',
        'font-size': '11px',
        'margin-left': '4px',
        'vertical-align': 'middle',
      }}
    >
      {props.trend === 'increasing' ? '\u25B2' : props.trend === 'decreasing' ? '\u25BC' : '\u25C0'}
    </span>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  change?: number | null;
  sublabel?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
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
        {props.trend && props.trend !== 'stable' && <TrendArrow trend={props.trend} />}
      </p>
      <p class="font-mono text-xl font-bold" style="color: var(--text-primary);">
        {props.value}
      </p>
      {props.change !== null && props.change !== undefined && (
        <p
          class="code-text mt-1"
          style={{
            color:
              props.change > 0 ? '#69f0ae' : props.change < 0 ? '#f44336' : 'var(--text-secondary)',
          }}
        >
          {props.change > 0 ? '+' : ''}
          {props.change?.toFixed(2)}%
        </p>
      )}
      {props.sublabel && (
        <p class="code-text mt-1" style="color: var(--text-secondary);">
          {props.sublabel}
        </p>
      )}
    </div>
  );
}

export default function MetricCards() {
  const btc = useCryptoPrice('BTCUSDT');
  const eth = useCryptoPrice('ETHUSDT');
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
        {loaded() ? (
          <>
            <MetricCard label="BTC" value={btc.value()} change={btc.change()} trend={btc.trend()} />
            <MetricCard label="ETH" value={eth.value()} change={eth.change()} trend={eth.trend()} />
            <MetricCard
              label="S&P 500"
              value={sp.value()}
              change={sp.change()}
              trend={sp.trend()}
            />
            <MetricCard
              label="Fear & Greed"
              value={fg.value()}
              sublabel={fg.displayLabel()}
              trend={fg.trend()}
            />
            <MetricCard label="Kp Index" value={kp.value()} trend={kp.trend()} />
            <MetricCard
              label="Mempool"
              value={mp.value()}
              sublabel="fastest fee"
              trend={mp.trend()}
            />
          </>
        ) : (
          <For each={[1, 2, 3, 4, 5, 6]}>{() => <SkeletonCard />}</For>
        )}
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

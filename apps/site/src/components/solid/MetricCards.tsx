import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';
import { recordFetch } from './StaleIndicator';

// ─── Data Hooks ─────────────────────────────────────────────────────

function useCryptoTicker() {
  const [data, setData] = createSignal<
    Record<string, { price: number; change: number; volume: number }>
  >({});
  onMount(async () => {
    async function fetch_() {
      try {
        const res = await fetch(`${apiBase()}/api/crypto-ticker`);
        if (!res.ok) return;
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : raw.data || [];
        const map: Record<string, { price: number; change: number; volume: number }> = {};
        for (const e of items as Array<{
          symbol: string;
          price: number;
          change?: number;
          volume?: number;
        }>) {
          map[e.symbol] = { price: e.price || 0, change: e.change || 0, volume: e.volume || 0 };
        }
        setData(map);
        recordFetch('crypto-ticker');
      } catch (e) {
        console.error('[MetricCards:useCryptoTicker]', e);
      }
    }
    fetch_();
    const id = setInterval(fetch_, 15_000);
    onCleanup(() => clearInterval(id));
  });
  return data;
}

function useStockQuote(symbols: string) {
  const [data, setData] = createSignal<
    Record<string, { price: number; change: number; changePct: number; name: string }>
  >({});
  onMount(async () => {
    async function fetch_() {
      try {
        const res = await fetch(`${apiBase()}/api/stock-quote?symbols=${symbols}`);
        if (!res.ok) return;
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : raw.data || [];
        const map: Record<
          string,
          { price: number; change: number; changePct: number; name: string }
        > = {};
        for (const e of items as Array<{
          symbol: string;
          price: number;
          change: number;
          changePct: number;
          name: string;
        }>) {
          map[e.symbol] = {
            price: e.price || 0,
            change: e.change || 0,
            changePct: e.changePct || 0,
            name: e.name || e.symbol,
          };
        }
        setData(map);
        recordFetch('stock-quote');
      } catch (e) {
        console.error('[MetricCards:useStockQuote]', e);
      }
    }
    fetch_();
    const id = setInterval(fetch_, 60_000);
    onCleanup(() => clearInterval(id));
  });
  return data;
}

function useMempool() {
  const [data, setData] = createSignal<{ fastest: number; halfHour: number; hour: number } | null>(
    null,
  );
  onMount(async () => {
    async function fetch_() {
      try {
        const res = await fetch(`${apiBase()}/api/mempool`);
        if (!res.ok) return;
        const raw = await res.json();
        if (raw.fees)
          setData({
            fastest: raw.fees.fastestFee,
            halfHour: raw.fees.halfHourFee,
            hour: raw.fees.hourFee,
          });
        recordFetch('mempool');
      } catch (e) {
        console.error('[MetricCards:useMempool]', e);
      }
    }
    fetch_();
    const id = setInterval(fetch_, 60_000);
    onCleanup(() => clearInterval(id));
  });
  return data;
}

function useBinanceFutures() {
  const [data, setData] = createSignal<{
    fundingRate: number;
    openInterest: number;
    longShortRatio: number;
    takerBuySellRatio: number;
  } | null>(null);
  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/binance-futures`);
      if (!res.ok) return;
      const _resp = await res.json();
      const items = Array.isArray(_resp) ? _resp : _resp.data || [];
      // Find BTCUSDT in the list
      const btc = items.find((t: Record<string, string>) => t.symbol === 'BTCUSDT');
      if (btc) {
        setData({
          fundingRate: Number.parseFloat(btc.fundingRate || '0'),
          openInterest: Number.parseFloat(btc.openInterest || '0'),
          longShortRatio: 0,
          takerBuySellRatio: 0,
        });
        recordFetch('binance-futures');
      }
    } catch (e) {
      console.error('[MetricCards:useBinanceFutures]', e);
    }
  });
  return data;
}

function useFearGreed() {
  const [data, setData] = createSignal<{ value: string; classification: string } | null>(null);
  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/fear-greed`);
      if (!res.ok) return;
      const _resp = await res.json();
      // fear-greed returns { name, data: [{ value, value_classification }] }
      const fgData = _resp.data?.[0] || (Array.isArray(_resp) ? _resp[0] : null);
      if (fgData) {
        setData({ value: fgData.value, classification: fgData.value_classification });
        recordFetch('fear-greed');
      }
    } catch (e) {
      console.error('[MetricCards:useFearGreed]', e);
    }
  });
  return data;
}

function useKpIndex() {
  const [data, setData] = createSignal<string>('N/A');
  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/kp-index`);
      if (!res.ok) return;
      const _resp = await res.json();
      const raw = _resp.data || _resp;
      if (Array.isArray(raw) && raw.length > 0) {
        const latest = raw[raw.length - 1];
        const kpVal = Array.isArray(latest) ? latest[1] : (latest.kp_index ?? latest.Kp ?? '?');
        setData(String(kpVal));
        recordFetch('kp-index');
      }
    } catch (e) {
      console.error('[MetricCards:useKpIndex]', e);
    }
  });
  return data;
}

function useEarthquakes() {
  const [count, setCount] = createSignal(0);
  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/earthquakes`);
      if (!res.ok) return;
      const _resp = await res.json();
      const raw = _resp.data || _resp;
      setCount((raw.features || []).length);
      recordFetch('earthquakes');
    } catch (e) {
      console.error('[MetricCards:useEarthquakes]', e);
    }
  });
  return count;
}

function useExchangeRates() {
  const [rates, setRates] = createSignal<Record<string, number>>({});
  onMount(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/exchange-rates`);
      if (!res.ok) return;
      const _resp = await res.json();
      const raw = _resp.data || _resp;
      setRates(raw.rates || {});
      recordFetch('exchange-rates');
    } catch (e) {
      console.error('[MetricCards:useExchangeRates]', e);
    }
  });
  return rates;
}

// ─── Shared Components ──────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div class="p-3 border" style="border-color: var(--border); background: var(--bg-card);">
      <div
        class="h-2 w-16 mb-2"
        style="background: var(--border); animation: pulse 1.5s infinite;"
      />
      <div
        class="h-5 w-20 mb-1"
        style="background: var(--border); animation: pulse 1.5s infinite;"
      />
      <div class="h-2 w-12" style="background: var(--border); animation: pulse 1.5s infinite;" />
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <output
      class="p-3 border block"
      style="border-color: var(--border); background: var(--bg-card);"
      aria-label={`${props.label}: ${props.value}`}
    >
      <p
        class="font-mono font-bold tracking-wider mb-1"
        style={{ color: 'var(--text-secondary)', 'font-size': '9px', 'letter-spacing': '0.3em' }}
      >
        {props.label}
      </p>
      <p
        class="font-mono text-lg font-bold"
        style={{ color: props.color || 'var(--text-primary)' }}
      >
        {props.value}
      </p>
      {props.sublabel && (
        <p class="font-mono text-[10px] mt-0.5" style="color: var(--text-secondary)">
          {props.sublabel}
        </p>
      )}
    </output>
  );
}

function SectionHeader(props: { title: string; source: string }) {
  return (
    <div class="flex items-center gap-3 mb-3 mt-6">
      <p class="label" style="color: var(--accent);">
        {props.title}
      </p>
      <span class="font-mono text-[9px]" style="color: var(--text-secondary);">
        {props.source}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function MetricCards() {
  const crypto = useCryptoTicker();
  const macro = useStockQuote('^VIX,DX-Y.NYB,^TNX,GC=F,SI=F,HG=F,CL=F,BZ=F,^IRX');
  const spQuote = useStockQuote('^GSPC,^NDX');
  const mp = useMempool();
  const futures = useBinanceFutures();
  const fg = useFearGreed();
  const kp = useKpIndex();
  const quakes = useEarthquakes();
  const _rates = useExchangeRates();

  const [loaded, setLoaded] = createSignal(false);
  onMount(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    onCleanup(() => clearTimeout(t));
  });

  const fmt = (v: number, d = 2) => v.toLocaleString(undefined, { maximumFractionDigits: d });
  const btc = () => crypto().BTCUSDT;
  const eth = () => crypto().ETHUSDT;

  return (
    <div>
      {loaded() ? (
        <>
          {/* ── MACRO RATES ── */}
          <SectionHeader title="MACRO RATES" source="LIVE · YAHOO / FRED" />
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-2">
            <MetricCard
              label="VIX"
              value={macro()['^VIX'] ? fmt(macro()['^VIX'].price) : 'N/A'}
              sublabel="CBOE"
            />
            <MetricCard
              label="DXY"
              value={macro()['DX-Y.NYB'] ? fmt(macro()['DX-Y.NYB'].price, 3) : 'N/A'}
              sublabel="US DOLLAR INDEX"
            />
            <MetricCard
              label="10Y YIELD"
              value={macro()['^TNX'] ? `${fmt(macro()['^TNX'].price, 3)}%` : 'N/A'}
              sublabel="US TREASURY"
            />
            <MetricCard
              label="GOLD"
              value={macro()['GC=F'] ? `$${fmt(macro()['GC=F'].price)}` : 'N/A'}
              sublabel="COMEX"
              color="var(--accent)"
            />
            <MetricCard
              label="SILVER"
              value={macro()['SI=F'] ? `$${fmt(macro()['SI=F'].price, 3)}` : 'N/A'}
              sublabel="COMEX"
            />
            <MetricCard
              label="COPPER"
              value={macro()['HG=F'] ? `$${fmt(macro()['HG=F'].price, 4)}` : 'N/A'}
              sublabel="COMEX HG"
              color="var(--accent)"
            />
            <MetricCard
              label="OIL WTI"
              value={macro()['CL=F'] ? `$${fmt(macro()['CL=F'].price)}` : 'N/A'}
              sublabel="NYMEX"
            />
            <MetricCard
              label="OIL BRENT"
              value={macro()['BZ=F'] ? `$${fmt(macro()['BZ=F'].price)}` : 'N/A'}
              sublabel="ICE"
            />
          </div>

          {/* ── RISK ASSETS ── */}
          <SectionHeader title="RISK ASSETS" source="LIVE · YAHOO / BINANCE" />
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-2">
            <MetricCard
              label="S&P 500"
              value={spQuote()['^GSPC'] ? fmt(spQuote()['^GSPC'].price) : 'N/A'}
              sublabel={spQuote()['^GSPC']?.name || 'US EQUITIES'}
            />
            <MetricCard
              label="NASDAQ 100"
              value={spQuote()['^NDX'] ? fmt(spQuote()['^NDX'].price) : 'N/A'}
              sublabel="US TECH"
            />
            <MetricCard
              label="BTC / USD"
              value={btc() ? `$${fmt(btc()?.price)}` : 'N/A'}
              sublabel="BINANCE"
              color="var(--accent)"
            />
            <MetricCard
              label="ETH / USD"
              value={eth() ? `$${fmt(eth()?.price)}` : 'N/A'}
              sublabel="BINANCE"
            />
            <MetricCard
              label="ETH/BTC"
              value={btc() && eth() ? (eth()?.price / btc()?.price).toFixed(4) : 'N/A'}
              sublabel="RATIO"
            />
            <MetricCard
              label="GOLD/S&P"
              value={
                macro()['GC=F'] && spQuote()['^GSPC']
                  ? (macro()['GC=F'].price / spQuote()['^GSPC'].price).toFixed(4)
                  : 'N/A'
              }
              sublabel="RATIO"
            />
            <MetricCard
              label="OIL SPREAD"
              value={
                macro()['CL=F'] && macro()['BZ=F']
                  ? `$${fmt(macro()['BZ=F'].price - macro()['CL=F'].price)}`
                  : 'N/A'
              }
              sublabel="BRENT - WTI"
            />
            <MetricCard
              label="FEAR & GREED"
              value={fg() ? (fg()?.value ?? 'N/A') : 'N/A'}
              sublabel={fg()?.classification || ''}
              color="var(--accent)"
            />
          </div>

          {/* ── CRYPTO STRUCTURE ── */}
          <SectionHeader title="CRYPTO STRUCTURE" source="BINANCE PERPETUALS" />
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-2">
            <MetricCard
              label="BTC MARKET CAP"
              value={btc() ? `$${fmt((btc()?.price ?? 0) * 19_850_000, 0)}` : 'N/A'}
              sublabel="ESTIMATED"
            />
            <MetricCard
              label="24H VOLUME"
              value={btc() ? `$${fmt((btc()?.volume ?? 0) / 1e9, 1)}B` : 'N/A'}
              sublabel="BINANCE USDT"
            />
            <MetricCard
              label="FUNDING RATE"
              value={futures() ? `${((futures()?.fundingRate ?? 0) * 100).toFixed(4)}%` : 'N/A'}
              sublabel="BTC PERP"
            />
            <MetricCard
              label="BTC OI"
              value={futures() ? fmt(futures()?.openInterest ?? 0, 0) : 'N/A'}
              sublabel="OPEN INTEREST"
            />
            <MetricCard
              label="LONG/SHORT"
              value={futures() ? (futures()?.longShortRatio ?? 0).toFixed(2) : 'N/A'}
              sublabel="BTC TOP TRADERS"
            />
            <MetricCard
              label="NET TAKER"
              value={futures() ? (futures()?.takerBuySellRatio ?? 0).toFixed(2) : 'N/A'}
              sublabel="BTC 24H"
            />
            <MetricCard label="BTC NVT" value="N/A" sublabel="RATIO" />
            <MetricCard
              label="24H CHG"
              value={btc() ? `${btc()?.change >= 0 ? '+' : ''}${btc()?.change.toFixed(2)}%` : 'N/A'}
              sublabel="BTCUSDT"
              color={btc() && btc()?.change >= 0 ? '#69f0ae' : '#f44336'}
            />
          </div>

          {/* ── SENTIMENT ── */}
          <SectionHeader title="SENTIMENT" source="FEAR & GREED / NOAA" />
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <MetricCard
              label="FEAR & GREED"
              value={fg() ? (fg()?.value ?? 'N/A') : 'N/A'}
              sublabel={fg()?.classification || ''}
              color="var(--accent)"
            />
            <MetricCard
              label="BTC MEMPOOL"
              value={mp() ? `${mp()?.fastest} sat` : 'N/A'}
              sublabel="FASTEST FEE"
            />
            <MetricCard label="QUAKES (M4.5+)" value={String(quakes())} sublabel="PAST 24H" />
            <MetricCard label="GEOMAGNETIC" value={kp()} sublabel="KP INDEX · NOAA" />
          </div>
        </>
      ) : (
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <For each={Array(16)}>{() => <SkeletonCard />}</For>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

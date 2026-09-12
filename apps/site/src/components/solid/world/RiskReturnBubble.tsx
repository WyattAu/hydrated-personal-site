import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import {
  attachPlychartTooltip,
  renderPlychart,
  usePlychartAuto,
} from '../../../lib/plychart-render';

const H = 360;
const RISK_FREE = 0.04;

const ASSETS = [
  { symbol: 'BTCUSDT', label: 'BTC' },
  { symbol: 'ETHUSDT', label: 'ETH' },
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'BNBUSDT', label: 'BNB' },
  { symbol: 'XRPUSDT', label: 'XRP' },
  { symbol: 'SPY', label: 'SPY' },
  { symbol: 'QQQ', label: 'QQQ' },
  { symbol: 'GLD', label: 'GLD' },
];

interface Bubble {
  label: string;
  ret: number;
  vol: number;
  sharpe: number;
  volume: number;
}

async function fetchSeries(symbol: string): Promise<{ closes: number[]; volume: number }> {
  const isCrypto = symbol.endsWith('USDT');
  try {
    if (isCrypto) {
      const res = await fetch(`/api/binance-klines?symbol=${symbol}&interval=1d&limit=365`);
      if (!res.ok) return { closes: [], volume: 0 };
      const raw = await res.json();
      const k: (string | number)[][] = raw.data || raw;
      const closes = k.map((r) => Number(r[4])).filter((n) => Number.isFinite(n));
      const lastVol = k.length ? Number(k[k.length - 1][7] ?? k[k.length - 1][5] ?? 0) : 0;
      return { closes, volume: lastVol };
    }
    const res = await fetch(
      `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`,
    );
    if (!res.ok) return { closes: [], volume: 0 };
    const json = await res.json();
    const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
    const closes = (quote?.close ?? []).filter((c: number | null): c is number => c != null);
    const vols = (quote?.volume ?? []).filter((c: number | null): c is number => c != null);
    const lastVol = vols.length ? vols[vols.length - 1] : 0;
    return { closes, volume: lastVol };
  } catch {
    return { closes: [], volume: 0 };
  }
}

function stats(closes: number[], volume: number, label: string): Bubble | null {
  if (closes.length < 30) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  const annVol = Math.sqrt(variance) * Math.sqrt(252);
  const annRet = mean * 252;
  if (!Number.isFinite(annVol) || annVol <= 0) return null;
  return { label, ret: annRet, vol: annVol, sharpe: (annRet - RISK_FREE) / annVol, volume };
}

const VOLUME_BUCKETS = [
  { color: '#546e7a', label: 'LOW VOL' },
  { color: '#42a5f5', label: 'MED VOL' },
  { color: '#00e5ff', label: 'HIGH VOL' },
];

export default function RiskReturnBubble() {
  const [bubbles, setBubbles] = createSignal<Bubble[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const settled = await Promise.allSettled(
        ASSETS.map(async (a) => {
          const s = await fetchSeries(a.symbol);
          return stats(s.closes, s.volume, a.label);
        }),
      );
      const ok: Bubble[] = [];
      for (const r of settled) if (r.status === 'fulfilled' && r.value) ok.push(r.value);
      if (ok.length === 0) throw new Error('No data');
      setBubbles(ok);
      setChartMetaState('risk-return-bubble', { freshAt: Date.now(), error: null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
      setChartMetaState('risk-return-bubble', {
        error: e instanceof Error ? e.message : 'Failed',
      });
    } finally {
      setLoading(false);
    }
  }

  function buildSeries() {
    const pts = bubbles();
    if (pts.length === 0) return null;

    const maxVol = Math.max(...pts.map((p) => p.volume)) || 1;
    const buckets: number[][][] = [[], [], []];
    for (const p of pts) {
      const ratio = Math.max(0, p.volume) / maxVol;
      const b = ratio >= 0.66 ? 2 : ratio >= 0.33 ? 1 : 0;
      buckets[b].push([p.vol * 100, p.ret * 100]);
    }

    return VOLUME_BUCKETS.map((bucket, i) => ({
      color: bucket.color,
      points: buckets[i],
    }));
  }

  function renderChart() {
    const series = buildSeries();
    if (!series) return;
    renderPlychart('risk-return-bubble', 'update_scatter_multi', JSON.stringify(series), '');
  }

  createEffect(() => {
    bubbles();
    renderChart();
  });

  usePlychartAuto(() => 'risk-return-bubble', renderChart);

  onCleanup(attachPlychartTooltip('risk-return-bubble', () => JSON.stringify(buildSeries() ?? [])));

  onMount(() => {
    attachChartMeta('risk-return-bubble', {
      source: 'OKX/Kraken + Yahoo Finance',
      detail: '1y daily · Sharpe rf 4%',
    });
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        RISK / RETURN BUBBLES
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing risk/return...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas id="risk-return-bubble" class="w-full" style={{ height: `${H}px` }} />
      <div class="flex items-center gap-4 mt-1 flex-wrap">
        <For each={VOLUME_BUCKETS}>
          {(bucket) => (
            <span class="font-mono text-[9px]" style={{ color: bucket.color }}>
              ■ {bucket.label}
            </span>
          )}
        </For>
        <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          bucket = 24h volume (S/M/L)
        </span>
      </div>
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        1y daily | {ASSETS.map((a) => a.label).join(' ')} | Sharpe vs rf 4%
      </p>
    </div>
  );
}

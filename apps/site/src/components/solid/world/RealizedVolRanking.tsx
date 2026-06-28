import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 300;

interface Asset {
  symbol: string;
  label: string;
}

const ASSETS: Asset[] = [
  { symbol: 'BTCUSDT', label: 'BTC' },
  { symbol: 'ETHUSDT', label: 'ETH' },
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'BNBUSDT', label: 'BNB' },
  { symbol: 'XRPUSDT', label: 'XRP' },
  { symbol: 'SPY', label: 'SPY' },
  { symbol: 'QQQ', label: 'QQQ' },
  { symbol: 'GLD', label: 'GLD' },
];

interface VolRow {
  label: string;
  vol: number;
}

async function fetchCloses(symbol: string): Promise<number[]> {
  const isCrypto = symbol.endsWith('USDT');
  try {
    if (isCrypto) {
      const res = await fetch(`/api/binance-klines?symbol=${symbol}&interval=1d&limit=60`);
      if (!res.ok) return [];
      const raw = await res.json();
      const k: (string | number)[][] = raw.data || raw;
      return k.map((r) => Number(r[4])).filter((n) => Number.isFinite(n));
    }
    const res = await fetch(
      `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=3mo&interval=1d`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
    return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
  } catch {
    return [];
  }
}

export default function RealizedVolRanking() {
  const [rows, setRows] = createSignal<VolRow[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const settled = await Promise.allSettled(
        ASSETS.map(async (a) => {
          const closes = await fetchCloses(a.symbol);
          if (closes.length < 32) throw new Error(a.label);
          const last = closes.slice(-31);
          const rets: number[] = [];
          for (let i = 1; i < last.length; i++) rets.push(Math.log(last[i] / last[i - 1]));
          const mean = rets.reduce((x, y) => x + y, 0) / rets.length;
          const variance =
            rets.reduce((x, y) => x + (y - mean) ** 2, 0) / Math.max(1, rets.length - 1);
          const vol = Math.sqrt(variance) * Math.sqrt(252);
          if (!Number.isFinite(vol)) throw new Error(a.label);
          return { label: a.label, vol } as VolRow;
        }),
      );
      const ok: VolRow[] = [];
      for (const r of settled) if (r.status === 'fulfilled') ok.push(r.value);
      if (ok.length === 0) throw new Error('No data');
      ok.sort((a, b) => b.vol - a.vol);
      setRows(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const list = rows();
    if (!canvas || list.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, H);

    const labelW = 48;
    const maxVol = Math.max(...list.map((r) => r.vol)) || 1;
    const rowH = (H - 24) / list.length;
    const barH = Math.min(18, rowH - 6);

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const y = 12 + i * rowH;
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, labelW - 6, y + barH / 2);

      const barW = ((w - labelW - 56) * r.vol) / maxVol;
      const intensity = Math.min(1, r.vol / maxVol);
      const red = Math.floor(60 + intensity * 195);
      ctx.fillStyle = `rgb(${red},80,80)`;
      ctx.fillRect(labelW, y, barW, barH);

      ctx.fillStyle = colors.textPrimary || '#fff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${(r.vol * 100).toFixed(1)}%`, labelW + barW + 4, y + barH / 2);
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('30d annualized vol', w - 4, H - 8);
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = rows();
    if (v.length) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        REALIZED VOLATILITY RANKING
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing 30d realized vol...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        8 assets | 30d log returns | annualized (x sqrt 252) | sorted desc
      </p>
    </div>
  );
}

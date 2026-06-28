import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

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

export default function RiskReturnBubble() {
  const [bubbles, setBubbles] = createSignal<Bubble[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

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
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const pts = bubbles();
    if (!canvas || pts.length === 0) return;
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

    const pad = { l: 48, r: 16, t: 16, b: 36 };
    const cW = w - pad.l - pad.r;
    const cH = H - pad.t - pad.b;

    const risks = pts.map((p) => p.vol * 100);
    const rets = pts.map((p) => p.ret * 100);
    const minR = Math.min(...risks, 0);
    const maxR = Math.max(...risks);
    const minRet = Math.min(...rets, 0);
    const maxRet = Math.max(...rets, 0);
    const rangeR = maxR - minR || 1;
    const rangeRet = maxRet - minRet || 1;
    const padR = rangeR * 0.1;
    const padRet = rangeRet * 0.1;
    const toX = (v: number) => pad.l + ((v - minR + padR) / (rangeR + 2 * padR)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minRet + padRet) / (rangeRet + 2 * padRet)) * cH;

    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '8px "JetBrains Mono", monospace';
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + (cH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${(maxRet + padRet - ((rangeRet + 2 * padRet) * i) / 5).toFixed(0)}%`,
        pad.l - 5,
        y,
      );
      const x = pad.l + (cW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, H - pad.b);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `${(minR + padR + ((rangeR + 2 * padR) * i) / 5).toFixed(0)}%`,
        x,
        H - pad.b + 6,
      );
    }

    if (minRet < 0) {
      const zy = toY(0);
      ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.2)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.l, zy);
      ctx.lineTo(w - pad.r, zy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const maxVol = Math.max(...pts.map((p) => p.volume)) || 1;
    for (const p of pts) {
      const x = toX(p.vol * 100);
      const y = toY(p.ret * 100);
      const radius = 4 + Math.sqrt(Math.max(0, p.volume) / maxVol) * 14;
      const intensity = Math.max(0, Math.min(1, (p.sharpe + 1) / 3));
      const r = Math.floor(255 * (1 - intensity));
      const g = Math.floor(120 + intensity * 135);
      const b = Math.floor(80 + intensity * 175);
      ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.55)';
    ctx.font = '8px "JetBrains Mono", monospace';
    for (const p of pts) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, toX(p.vol * 100) + 7, toY(p.ret * 100));
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VOL (annualized %)', w / 2, H - 6);
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = bubbles();
    if (v.length) draw();
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
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        1y daily | size = 24h volume | colour = Sharpe (rf 4%)
      </p>
    </div>
  );
}

import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';

interface EtfEntry {
  ticker: string;
  name?: string;
}

interface ScatterPoint {
  ticker: string;
  ret: number;
  risk: number;
  sharpe: number;
  volume: number;
}

interface ChartResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{ close: Array<number | null>; volume?: Array<number | null> }>;
      };
      meta?: { regularMarketVolume?: number };
    }>;
  };
  error?: unknown;
}

const BATCH = 20;
const MAX_FETCH = 40;
const PLOT_TOP_N = 20;
const RISK_FREE = 0.04;

export default function EtfRiskReturnScatter() {
  const [points, setPoints] = createSignal<ScatterPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const dbRes = await fetch('/data/etf-database.json');
      if (!dbRes.ok) throw new Error('etf database unavailable');
      const db: EtfEntry[] = await dbRes.json();
      const tickers = db.map((e) => e.ticker).filter((t, i, arr) => arr.indexOf(t) === i);
      const toFetch = tickers.slice(0, MAX_FETCH);

      const fetched: ScatterPoint[] = [];
      for (let i = 0; i < toFetch.length; i += BATCH) {
        const slice = toFetch.slice(i, i + BATCH);
        const settled = await Promise.allSettled(slice.map((t) => fetchOne(t)));
        for (const s of settled) {
          if (s.status === 'fulfilled' && s.value) fetched.push(s.value);
        }
      }

      if (fetched.length === 0) throw new Error('no chart data');

      // Rank by volume, take top N for clarity.
      fetched.sort((a, b) => b.volume - a.volume);
      setPoints(fetched.slice(0, PLOT_TOP_N));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOne(ticker: string): Promise<ScatterPoint | null> {
    try {
      const res = await fetch(`${apiBase()}/api/stock-chart?symbol=${ticker}&range=1y&interval=1d`);
      if (!res.ok) return null;
      const json: ChartResponse = await res.json();
      if (json.error) return null;
      const result = json.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const closes = (quote?.close ?? []).filter((c): c is number => c != null);
      if (closes.length < 30) return null;
      const volume = Number(result?.meta?.regularMarketVolume ?? 0) || 0;

      // Annualised log return + stdev from daily closes.
      const rets: number[] = [];
      for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1);
      const annReturn = mean * 252;
      const annStdev = Math.sqrt(variance) * Math.sqrt(252);
      if (!Number.isFinite(annStdev) || annStdev <= 0) return null;
      const sharpe = (annReturn - RISK_FREE) / annStdev;
      return { ticker, ret: annReturn, risk: annStdev, sharpe, volume };
    } catch {
      return null;
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || points().length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 360 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 360;
    const colors = getThemeColors();
    const pad = { l: 50, r: 16, t: 16, b: 36 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pts = points();
    const allRisk = pts.map((p) => p.risk * 100);
    const allRet = pts.map((p) => p.ret * 100);
    const minR = Math.min(...allRisk);
    const maxR = Math.max(...allRisk);
    const minRet = Math.min(...allRet, 0);
    const maxRet = Math.max(...allRet, 0);
    const rangeR = maxR - minR || 1;
    const rangeRet = maxRet - minRet || 1;
    const padR = rangeR * 0.08;
    const padRet = rangeRet * 0.08;

    const toX = (v: number) => pad.l + ((v - minR + padR) / (rangeR + 2 * padR)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minRet + padRet) / (rangeRet + 2 * padRet)) * cH;

    // Grid + axis ticks
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.06)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + (cH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(
        `${(maxRet + padRet - ((rangeRet + 2 * padRet) * i) / 5).toFixed(0)}%`,
        pad.l - 5,
        y + 3,
      );
      const x = pad.l + (cW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, h - pad.b);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(minR + padR + ((rangeR + 2 * padR) * i) / 5).toFixed(0)}%`,
        x,
        h - pad.b + 14,
      );
    }

    // Zero-return reference line
    if (minRet < 0) {
      const zy = toY(0);
      ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.15)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.l, zy);
      ctx.lineTo(w - pad.r, zy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Scatter points coloured by Sharpe (red -> cyan -> green)
    for (const p of pts) {
      const intensity = Math.max(0, Math.min(1, (p.sharpe + 1) / 3));
      const r = Math.floor(255 * (1 - intensity));
      const g = Math.floor(120 + intensity * 135);
      const b = Math.floor(80 + intensity * 175);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(toX(p.risk * 100), toY(p.ret * 100), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ticker labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.55)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    for (const p of pts) {
      ctx.fillText(p.ticker, toX(p.risk * 100) + 6, toY(p.ret * 100) + 3);
    }

    // Axis titles
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RISK (annualized std dev)', w / 2, h - 4);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('RETURN (annualized)', 0, 0);
    ctx.restore();
  }

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    const v = points();
    if (v) draw();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          RISK / RETURN SCATTER
        </p>
        <Show
          when={!loading()}
          fallback={
            <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              COMPUTING...
            </span>
          }
        >
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {points().length} ETFs
          </span>
        </Show>
      </div>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '360px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        1y daily returns | colour = Sharpe (rf 4%) | top {PLOT_TOP_N} by volume
      </p>
    </div>
  );
}

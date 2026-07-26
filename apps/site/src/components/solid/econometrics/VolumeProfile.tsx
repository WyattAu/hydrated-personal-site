import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { activeAsset } from '../../../lib/asset-store';
import { onAssetChanged } from '../../../lib/asset-events';
import { getThemeColors } from '../../../lib/theme-colors';

const BINS = 25;

interface Ohlcv {
  closes: number[];
  volumes: number[];
}

interface ProfileState {
  buckets: number[];
  minP: number;
  maxP: number;
  step: number;
  pocIdx: number;
  current: number;
}

async function fetchOhlcv(symbol: string, range: string): Promise<Ohlcv> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return { closes: [], volumes: [] };
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  const rawClose: (number | null)[] = quote?.close ?? [];
  const rawVol: (number | null)[] = quote?.volume ?? [];
  const closes: number[] = [];
  const volumes: number[] = [];
  const n = Math.min(rawClose.length, rawVol.length);
  for (let i = 0; i < n; i++) {
    const c = rawClose[i];
    const v = rawVol[i];
    if (c != null && v != null && c > 0 && v > 0) {
      closes.push(c);
      volumes.push(v);
    }
  }
  return { closes, volumes };
}

function buildProfile(closes: number[], volumes: number[]): ProfileState | null {
  if (closes.length < 5) return null;
  const minP = closes.reduce((a, b) => (b < a ? b : a), closes[0]);
  const maxP = closes.reduce((a, b) => (b > a ? b : a), closes[0]);
  const step = (maxP - minP) / BINS || 1;
  const buckets = new Array<number>(BINS).fill(0);
  for (let i = 0; i < closes.length; i++) {
    let idx = Math.floor((closes[i] - minP) / step);
    if (idx < 0) idx = 0;
    if (idx >= BINS) idx = BINS - 1;
    buckets[idx] += volumes[i];
  }
  let pocIdx = 0;
  for (let i = 1; i < BINS; i++) {
    if (buckets[i] > buckets[pocIdx]) pocIdx = i;
  }
  return { buckets, minP, maxP, step, pocIdx, current: closes[closes.length - 1] };
}

export default function VolumeProfile() {
  const [profile, setProfile] = createSignal<ProfileState | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { closes, volumes } = await fetchOhlcv(activeAsset(), '3mo');
      const p = buildProfile(closes, volumes);
      if (!p) throw new Error('Insufficient data');
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !profile()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 300;
    const colors = getThemeColors();
    const p = profile()!;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 56, r: 16, t: 16, b: 24 };
    const plotX0 = pad.l;
    const plotW = Math.max(10, w - pad.r - plotX0);
    const cH = h - pad.t - pad.b;
    const rowH = cH / BINS;
    const maxVol = Math.max(...p.buckets) || 1;

    const priceAt = (i: number) => p.minP + (i + 0.5) * p.step;
    const _yAt = (i: number) => pad.t + (BINS - 1 - i) * rowH + rowH / 2;

    // Horizontal gridlines + price labels (every ~5 buckets)
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.lineWidth = 1;
    for (let i = 0; i < BINS; i += 5) {
      const y = pad.t + (BINS - 1 - i) * rowH;
      ctx.beginPath();
      ctx.moveTo(plotX0, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(priceAt(i).toFixed(2), plotX0 - 4, y + rowH / 2 + 3);
    }

    // Bars grow rightward from the price axis (center baseline)
    for (let i = 0; i < BINS; i++) {
      const v = p.buckets[i];
      const ratio = v / maxVol;
      const barW = Math.max(1, ratio * plotW);
      const y = pad.t + (BINS - 1 - i) * rowH;
      const barH = Math.max(1, rowH - 1);
      if (i === p.pocIdx) {
        ctx.fillStyle = '#ffc107';
      } else {
        // brightness by volume: dim -> bright cyan
        const alpha = 0.18 + 0.72 * ratio;
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
      }
      ctx.fillRect(plotX0, y + 0.5, barW, barH);
    }

    // X-axis volume scale (max)
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(fmtVol(maxVol), plotX0 + 2, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText('volume', w - pad.r, h - 6);

    // Current price dashed line
    const curIdx = (p.current - p.minP) / p.step;
    const curY = pad.t + (BINS - 0.5 - curIdx) * rowH;
    if (curY >= pad.t && curY <= pad.t + cH) {
      ctx.strokeStyle = colors.accent || '#00e5ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX0, curY);
      ctx.lineTo(w - pad.r, curY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.accent || '#00e5ff';
      ctx.textAlign = 'left';
      ctx.fillText(`cur ${p.current.toFixed(2)}`, w - pad.r - 70, curY - 3);
    }

    // POC label
    ctx.fillStyle = '#ffc107';
    ctx.textAlign = 'left';
    ctx.fillText(`POC ${priceAt(p.pocIdx).toFixed(2)}`, plotX0 + 2, pad.t + 10);
  }

  onMount(() => loadData());

  onAssetChanged(() => loadData());

  createEffect(() => {
    profile();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          VOLUME PROFILE
        </p>
        <Show when={!loading() && profile()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {activeAsset()} | 3M daily | {BINS} buckets
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Building volume profile...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && profile()}>
        <canvas ref={canvasRef} class="w-full" style={{ height: '300px' }} />
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          3M daily | Price-binned volume | POC = Point of Control (highest volume node)
        </p>
      </Show>
    </div>
  );
}

function fmtVol(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0';
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

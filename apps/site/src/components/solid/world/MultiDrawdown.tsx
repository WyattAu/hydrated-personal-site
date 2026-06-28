import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 300;

const SYMBOLS = [
  'SPY',
  'QQQ',
  'VTI',
  'IWM',
  'GLD',
  'TSLA',
  'AAPL',
  'NVDA',
  'MSFT',
  'AMD',
  'META',
  'GOOGL',
  'AMZN',
  '^VIX',
  '^GSPC',
  '^DJI',
  '^IXIC',
];

const COLORS = ['#00e5ff', '#ff6b35', '#a855f7'];

interface Curve {
  symbol: string;
  dd: number[];
}

async function fetchCloses(symbol: string): Promise<number[]> {
  const isCrypto = symbol.endsWith('USDT');
  try {
    if (isCrypto) {
      const res = await fetch(`/api/binance-klines?symbol=${symbol}&interval=1d&limit=365`);
      if (!res.ok) return [];
      const raw = await res.json();
      const k: (string | number)[][] = raw.data || raw;
      return k.map((r) => Number(r[4])).filter((n) => Number.isFinite(n));
    }
    const res = await fetch(
      `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
    return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
  } catch {
    return [];
  }
}

function drawdown(closes: number[]): number[] {
  let peak = Number.NEGATIVE_INFINITY;
  const dd: number[] = [];
  for (const c of closes) {
    if (c > peak) peak = c;
    dd.push(peak > 0 ? (c - peak) / peak : 0);
  }
  return dd;
}

export default function MultiDrawdown() {
  const [sels, setSels] = createSignal<string[]>(['SPY', 'QQQ', 'GLD']);
  const [curves, setCurves] = createSignal<Curve[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  function setSel(i: number, v: string) {
    setSels((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const picks = sels().filter((s, i, arr) => s && arr.indexOf(s) === i);
      const settled = await Promise.allSettled(
        picks.map(async (sym) => {
          const closes = await fetchCloses(sym);
          if (closes.length < 20) throw new Error(sym);
          return { symbol: sym, dd: drawdown(closes) } as Curve;
        }),
      );
      const ok: Curve[] = [];
      for (const r of settled) if (r.status === 'fulfilled') ok.push(r.value);
      if (ok.length === 0) throw new Error('No data');
      setCurves(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const cv = curves();
    if (!canvas || cv.length === 0) return;
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

    const pad = { l: 44, r: 16, t: 12, b: 26 };
    const cW = w - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const zeroY = pad.t;

    const maxDD = Math.max(0.05, ...cv.flatMap((c) => c.dd).map((d) => Math.abs(d)));

    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.4)';
    ctx.font = '8px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = zeroY + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${((-(maxDD * i) / 4) * 100).toFixed(0)}%`, pad.l - 4, y);
    }

    for (let ci = 0; ci < cv.length; ci++) {
      const c = cv[ci];
      const color = COLORS[ci % COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < c.dd.length; i++) {
        const x = pad.l + (i / (c.dd.length - 1)) * cW;
        const y = zeroY + (Math.abs(c.dd[i]) / maxDD) * cH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(c.symbol, pad.l + 4 + ci * 64, zeroY + 2);
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('underwater curves (peak-to-trough)', w - pad.r, H - 4);
  }

  onMount(() => loadData());
  createEffect(() => {
    sels();
    loadData();
  });
  createEffect(() => {
    const v = curves();
    if (v.length) draw();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          MULTI DRAWDOWN
        </p>
        <div class="flex gap-2">
          <For each={[0, 1, 2]}>
            {(i) => (
              <select
                class="font-mono text-[10px] px-2 py-1 border"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-card)',
                  color: COLORS[i],
                }}
                onChange={(e) => setSel(i, e.currentTarget.value)}
              >
                <option value="" selected={sels()[i] === ''}>
                  none
                </option>
                <For each={SYMBOLS}>
                  {(s) => (
                    <option value={s} selected={sels()[i] === s}>
                      {s}
                    </option>
                  )}
                </For>
              </select>
            )}
          </For>
        </div>
      </div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing drawdowns...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        select up to 3 assets | overlapping underwater curves | 1Y daily
      </p>
    </div>
  );
}

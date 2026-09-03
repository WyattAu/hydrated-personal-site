import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getPlychart } from '../../../lib/plychart-loader';

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
  const [wasmReady, setWasmReady] = createSignal(false);

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

  async function initWasm() {
    try {
      const p = await getPlychart();
      const canvas = document.getElementById('multi-drawdown') as HTMLCanvasElement | null;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        p.create_chart('multi-drawdown', Math.round(rect.width), H);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const cv = curves();
    const ready = wasmReady();
    if (cv.length === 0 || !ready) return;
    const canvas = document.getElementById('multi-drawdown') as HTMLCanvasElement | null;
    if (!canvas) return;

    const series = cv.map((c, ci) => ({
      color: COLORS[ci % COLORS.length],
      data: c.dd.map((v, i) => ({ time: i, open: 0, high: 0, low: 0, close: v * 100, volume: 0 })),
    }));

    getPlychart().then((p) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) p.create_chart('multi-drawdown', Math.round(rect.width), H);
      p.update_line('multi-drawdown', JSON.stringify(series), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });
  createEffect(() => {
    sels();
    loadData();
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
      <canvas id="multi-drawdown" class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        select up to 3 assets | overlapping underwater curves | 1Y daily
      </p>
    </div>
  );
}

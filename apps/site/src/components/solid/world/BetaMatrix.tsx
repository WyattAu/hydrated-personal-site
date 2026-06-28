import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 300;

const ALTS = [
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'BNBUSDT', label: 'BNB' },
  { symbol: 'XRPUSDT', label: 'XRP' },
  { symbol: 'ADAUSDT', label: 'ADA' },
  { symbol: 'DOGEUSDT', label: 'DOGE' },
  { symbol: 'AVAXUSDT', label: 'AVAX' },
  { symbol: 'LINKUSDT', label: 'LINK' },
  { symbol: 'LTCUSDT', label: 'LTC' },
  { symbol: 'DOTUSDT', label: 'DOT' },
  { symbol: 'TRXUSDT', label: 'TRX' },
];

const COLS = ['BTC 30d', 'BTC 90d', 'ETH 30d', 'ETH 90d'];

async function fetchCloses(symbol: string): Promise<number[]> {
  const isCrypto = symbol.endsWith('USDT');
  try {
    if (isCrypto) {
      const res = await fetch(`/api/binance-klines?symbol=${symbol}&interval=1d&limit=120`);
      if (!res.ok) return [];
      const raw = await res.json();
      const k: (string | number)[][] = raw.data || raw;
      return k.map((r) => Number(r[4])).filter((n) => Number.isFinite(n));
    }
    const res = await fetch(
      `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=6mo&interval=1d`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
    return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
  } catch {
    return [];
  }
}

function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

function beta(a: number[], b: number[], window: number): number {
  const n = Math.min(a.length, b.length);
  const win = Math.min(window, n);
  if (win < 5) return 0;
  const aa = a.slice(a.length - win);
  const bb = b.slice(b.length - win);
  const ma = aa.reduce((x, y) => x + y, 0) / aa.length;
  const mb = bb.reduce((x, y) => x + y, 0) / bb.length;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < aa.length; i++) {
    const da = aa[i] - ma;
    const db = bb[i] - mb;
    cov += da * db;
    varB += db * db;
  }
  return varB === 0 ? 0 : cov / varB;
}

function betaColor(b: number): string {
  const f = Math.max(-1, Math.min(1, b - 1));
  if (f < 0) return `rgba(0,180,255,${Math.min(1, -f)})`;
  return `rgba(255,90,90,${Math.min(1, f)})`;
}

export default function BetaMatrix() {
  const [grid, setGrid] = createSignal<{ label: string; cells: number[] }[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const all = [
        ...ALTS,
        { symbol: 'BTCUSDT', label: 'BTC' },
        { symbol: 'ETHUSDT', label: 'ETH' },
        { symbol: 'SPY', label: 'SPY' },
      ];
      const settled = await Promise.allSettled(
        all.map(async (a) => ({ label: a.label, rets: logReturns(await fetchCloses(a.symbol)) })),
      );
      const map = new Map<string, number[]>();
      for (const r of settled)
        if (r.status === 'fulfilled' && r.value.rets.length >= 30)
          map.set(r.value.label, r.value.rets);
      const btc = map.get('BTC');
      const eth = map.get('ETH');
      if (!btc || !eth) throw new Error('No benchmark');

      const rows: { label: string; cells: number[] }[] = [];
      for (const alt of ALTS) {
        const a = map.get(alt.label);
        if (!a) continue;
        rows.push({
          label: alt.label,
          cells: [beta(a, btc, 30), beta(a, btc, 90), beta(a, eth, 30), beta(a, eth, 90)],
        });
      }
      if (rows.length === 0) throw new Error('No data');
      setGrid(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const rows = grid();
    if (!canvas || !rows) return;
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

    const labelW = 56;
    const colW = (w - labelW - 12) / COLS.length;
    const headerH = 22;
    const rowH = (H - headerH - 20) / rows.length;

    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    for (let c = 0; c < COLS.length; c++) {
      ctx.fillText(COLS[c], labelW + c * colW + colW / 2, headerH - 4);
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const y = headerH + i * rowH;
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, labelW - 4, y + rowH / 2);

      for (let c = 0; c < r.cells.length; c++) {
        ctx.fillStyle = betaColor(r.cells[c]);
        ctx.fillRect(labelW + c * colW, y, colW - 2, rowH - 2);
        ctx.fillStyle = colors.textPrimary || '#fff';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.cells[c].toFixed(2), labelW + c * colW + colW / 2, y + rowH / 2);
      }
    }

    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.35)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('cool = beta < 1 | warm = beta > 1', w - 4, H - 4);
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = grid();
    if (v) draw();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        BETA MATRIX
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing betas...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        10 alts vs BTC + ETH | 30d / 90d rolling beta | log returns
      </p>
    </div>
  );
}

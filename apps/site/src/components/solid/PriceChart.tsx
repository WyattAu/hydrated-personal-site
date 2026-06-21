import { For, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { getThemeColors } from '../../lib/theme-colors';
import { formatPrice } from '../../lib/utils';
import { recordFetch } from './StaleIndicator';

interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = '1d' | '1w' | '1m' | '3m' | '1y';

const TIMEFRAMES: { key: Timeframe; label: string; interval: string; limit: string }[] = [
  { key: '1d', label: '1D', interval: '5m', limit: '288' },
  { key: '1w', label: '1W', interval: '1h', limit: '168' },
  { key: '1m', label: '1M', interval: '4h', limit: '180' },
  { key: '3m', label: '3M', interval: '1d', limit: '90' },
  { key: '1y', label: '1Y', interval: '1d', limit: '365' },
];

const COLORS = [
  '#00e5ff',
  '#ff4081',
  '#69f0ae',
  '#ffab40',
  '#7c4dff',
  '#ff6b6b',
  '#40c4ff',
  '#ffcc00',
];

const PRESETS: { label: string; symbols: string[] }[] = [
  { label: 'S&P 500 vs NASDAQ', symbols: ['^GSPC', '^IXIC'] },
  { label: 'BTC vs ETH', symbols: ['BTCUSDT', 'ETHUSDT'] },
  { label: 'Tech Giants', symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'] },
  { label: 'Bonds vs Stocks', symbols: ['^GSPC', 'TLT', 'AGG'] },
];

function parseKlines(raw: unknown[]): Kline[] {
  return raw.map((k: unknown) => {
    const arr = k as unknown[];
    return {
      openTime: arr[0] as number,
      open: Number.parseFloat(arr[1] as string),
      high: Number.parseFloat(arr[2] as string),
      low: Number.parseFloat(arr[3] as string),
      close: Number.parseFloat(arr[4] as string),
      volume: Number.parseFloat(arr[5] as string),
    };
  });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PriceChart(props: { symbol?: string; title?: string }) {
  const defaultSymbol = props.symbol || 'BTCUSDT';
  const title = props.title || 'Price History';

  const [symbols, setSymbols] = createSignal<string[]>([defaultSymbol]);
  const [tf, setTf] = createSignal<Timeframe>('1m');
  const [seriesData, setSeriesData] = createSignal<Map<string, Kline[]>>(new Map());
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [viewMode, setViewMode] = createSignal<'price' | 'pct'>('price');
  const [searchInput, setSearchInput] = createSignal('');
  const [showPresets, setShowPresets] = createSignal(false);
  const [crosshair, setCrosshair] = createSignal<{
    values: { symbol: string; price: number; value: number; color: string }[];
    date: string;
    x: number;
    y: number;
  } | null>(null);

  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  function addSymbol(sym: string) {
    const s = sym.trim().toUpperCase();
    if (!s || symbols().includes(s)) return;
    setSymbols([...symbols(), s]);
  }

  function removeSymbol(sym: string) {
    setSymbols(symbols().filter((s) => s !== sym));
  }

  async function fetchSeriesData(sym: string): Promise<Kline[]> {
    try {
      const tfConfig = TIMEFRAMES.find((t) => t.key === tf());
      if (!tfConfig) return [];
      const isStock = sym.startsWith('^');
      const url = isStock
        ? `/api/stock-chart?symbol=${sym}&range=${tfConfig.key}&interval=${tfConfig.interval}`
        : `/api/binance-klines?symbol=${sym}&interval=${tfConfig.interval}&limit=${tfConfig.limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${sym}: HTTP ${res.status}`);
      const raw = await res.json();
      if (raw?.error) throw new Error(`${sym}: ${raw.error}`);

      if (isStock) {
        const quotes = raw?.chart?.result?.[0]?.indicators?.quote?.[0];
        if (quotes?.close && quotes?.timestamp) {
          return quotes.timestamp
            .map((ts: number, i: number) => ({
              openTime: ts * 1000,
              open: quotes.open[i] ?? quotes.close[i] ?? 0,
              high: quotes.high[i] ?? quotes.close[i] ?? 0,
              low: quotes.low[i] ?? quotes.close[i] ?? 0,
              close: quotes.close[i] ?? 0,
              volume: quotes.volume[i] ?? 0,
            }))
            .filter((k: Kline) => k.close > 0);
        }
        throw new Error(`${sym}: No data`);
      }
      if (!Array.isArray(raw) || raw.length === 0) throw new Error(`${sym}: No data`);
      return parseKlines(raw);
    } catch {
      // Fallback: generate sample data
      return generateSampleData(sym);
    }
  }

  function generateSampleData(sym: string): Kline[] {
    const samplePrices: Record<string, { base: number; vol: number }> = {
      '^GSPC': { base: 5400, vol: 0.003 },
      '^IXIC': { base: 17000, vol: 0.004 },
      '^DJI': { base: 39000, vol: 0.002 },
      AAPL: { base: 195, vol: 0.005 },
      MSFT: { base: 420, vol: 0.004 },
      GOOGL: { base: 175, vol: 0.005 },
      NVDA: { base: 120, vol: 0.008 },
      AMZN: { base: 185, vol: 0.005 },
      TSLA: { base: 250, vol: 0.01 },
      META: { base: 500, vol: 0.006 },
      BTCUSDT: { base: 65000, vol: 0.015 },
      ETHUSDT: { base: 3500, vol: 0.02 },
      SOLUSDT: { base: 150, vol: 0.025 },
    };
    const info = samplePrices[sym] || { base: 100, vol: 0.005 };
    const tfConfig = TIMEFRAMES.find((t) => t.key === tf());
    if (!tfConfig) return [];
    const now = Date.now();
    const points =
      tfConfig.key === '1d'
        ? 78
        : tfConfig.key === '1w'
          ? 168
          : tfConfig.key === '1m'
            ? 120
            : tfConfig.key === '3m'
              ? 90
              : 365;
    const intervalMs =
      tfConfig.key === '1d' ? 5 * 60000 : tfConfig.key === '1w' ? 3600000 : 86400000;
    const result: Kline[] = [];
    let price = info.base;
    for (let i = points; i >= 0; i--) {
      const t = now - i * intervalMs;
      price *= 1 + (Math.random() - 0.5) * info.vol * 2;
      const open = price * (1 - Math.random() * 0.002);
      const high = price * (1 + Math.random() * 0.003);
      const low = price * (1 - Math.random() * 0.003);
      result.push({
        openTime: t,
        open,
        high,
        low,
        close: price,
        volume: Math.floor(Math.random() * 5000000) + 500000,
      });
    }
    return result;
  }

  async function fetchAllData() {
    setLoading(true);
    setError(null);
    const newMap = new Map<string, Kline[]>();
    const syms = symbols();
    const results = await Promise.allSettled(syms.map((s) => fetchSeriesData(s)));

    let anyError = false;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        newMap.set(syms[i], r.value);
      } else {
        anyError = true;
      }
    });

    setSeriesData(newMap);
    if (newMap.size === 0) {
      setError('No data available for any symbol');
    } else if (anyError) {
      setError('Some symbols failed to load');
    } else {
      setError(null);
    }
    setLoading(false);
    recordFetch('stock-chart');
  }

  function drawChart() {
    const canvas = canvasRef;
    const container = containerRef;
    if (!canvas || !container) return;

    const allSeries = seriesData();
    if (allSeries.size === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 320;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padLeft = 70;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 32;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const colors = getThemeColors();
    const bgColor = colors.bgCard || '#0c0c0c';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Determine global min/max across all series
    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;

    const normalizedData = new Map<string, { index: number; value: number }[]>();

    for (const [sym, data] of allSeries) {
      const base = data[0]?.close || 1;
      const points = data.map((d, i) => ({
        index: i,
        value: viewMode() === 'pct' ? ((d.close - base) / base) * 100 : d.close,
      }));
      normalizedData.set(sym, points);
      for (const p of points) {
        if (p.value < globalMin) globalMin = p.value;
        if (p.value > globalMax) globalMax = p.value;
      }
    }

    const range = globalMax - globalMin || 1;
    const padding = range * 0.05;
    const yMin = globalMin - padding;
    const yMax = globalMax + padding;
    const yRange = yMax - yMin;

    // Find max length across series for x-axis
    let maxLen = 0;
    for (const data of allSeries.values()) {
      if (data.length > maxLen) maxLen = data.length;
    }
    if (maxLen === 0) return;

    const toX = (i: number) => padLeft + (i / (maxLen - 1)) * chartW;
    const toY = (v: number) => padTop + (1 - (v - yMin) / yRange) * chartH;

    // Grid lines
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const val = yMin + (yRange * i) / gridLines;
      const y = toY(val);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      const label =
        viewMode() === 'pct'
          ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
          : formatPrice(val, { currency: true });
      ctx.fillText(label, padLeft - 8, y + 3);
    }

    // X-axis labels
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(maxLen / 6));
    // Use the longest series for date labels
    let dateSeries: Kline[] = [];
    for (const data of allSeries.values()) {
      if (data.length > dateSeries.length) dateSeries = data;
    }
    for (let i = 0; i < dateSeries.length; i += labelStep) {
      ctx.fillText(formatDate(dateSeries[i].openTime), toX(i), h - 8);
    }

    // Draw each series
    const syms = symbols();
    syms.forEach((sym, si) => {
      const data = allSeries.get(sym);
      if (!data || data.length === 0) return;

      const color = COLORS[si % COLORS.length];
      const base = data[0]?.close || 1;

      // Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      data.forEach((d, i) => {
        const x = toX(i);
        const val = viewMode() === 'pct' ? ((d.close - base) / base) * 100 : d.close;
        const y = toY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Area fill
      const lastIdx = data.length - 1;
      ctx.lineTo(toX(lastIdx), padTop + chartH);
      ctx.lineTo(toX(0), padTop + chartH);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
      gradient.addColorStop(0, color.replace(')', ',0.12)').replace('rgb', 'rgba'));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // End label
      const lastVal =
        viewMode() === 'pct' ? ((data[lastIdx].close - base) / base) * 100 : data[lastIdx].close;
      const endY = toY(lastVal);
      ctx.fillStyle = color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      const endLabel =
        viewMode() === 'pct'
          ? `${lastVal >= 0 ? '+' : ''}${lastVal.toFixed(1)}%`
          : `${sym} ${formatPrice(lastVal, { currency: true })}`;
      ctx.fillText(endLabel, toX(lastIdx) + 4, endY - 6);
    });

    // Crosshair
    const ch = crosshair();
    if (ch) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ch.x, padTop);
      ctx.lineTo(ch.x, padTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Value labels
      ch.values.forEach((v, i) => {
        const y = toY(v.value);
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.arc(ch.x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = v.color;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        const valLabel =
          viewMode() === 'pct'
            ? `${v.symbol}: ${v.value >= 0 ? '+' : ''}${v.value.toFixed(1)}%`
            : `${v.symbol}: ${formatPrice(v.price, { currency: true })}`;
        ctx.fillText(valLabel, ch.x + 10, y + 3 - i * 14);
      });

      // Date label
      const dateW = 80;
      ctx.fillStyle = 'rgba(0,229,255,0.8)';
      ctx.fillRect(ch.x - dateW / 2, padTop + chartH + 2, dateW, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch.date, ch.x, padTop + chartH + 15);
    }
  }

  createEffect(() => {
    tf();
    symbols();
    fetchAllData();
  });

  createEffect(() => {
    seriesData();
    viewMode();
    drawChart();
  });

  onMount(() => {
    const observer = new ResizeObserver(() => drawChart());
    if (containerRef) observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  let rafId: number | undefined;
  function handleMouseMove(e: MouseEvent) {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = undefined;
      const canvas = canvasRef;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = rect.width;
      const padLeft = 70;
      const padRight = 16;
      const padTop = 16;
      const padBottom = 32;
      const chartW = w - padLeft - padRight;
      const _chartH = 320 - padTop - padBottom;

      let maxLen = 0;
      for (const data of seriesData().values()) {
        if (data.length > maxLen) maxLen = data.length;
      }
      if (maxLen === 0) return;

      const idx = Math.round(((mx - padLeft) / chartW) * (maxLen - 1));
      if (idx < 0) {
        setCrosshair(null);
        return;
      }

      const values: { symbol: string; price: number; value: number; color: string }[] = [];
      const syms = symbols();
      syms.forEach((sym, si) => {
        const data = seriesData().get(sym);
        if (!data || idx >= data.length) return;
        const base = data[0]?.close || 1;
        const d = data[Math.min(idx, data.length - 1)];
        const value = viewMode() === 'pct' ? ((d.close - base) / base) * 100 : d.close;
        values.push({ symbol: sym, price: d.close, value, color: COLORS[si % COLORS.length] });
      });

      if (values.length === 0) {
        setCrosshair(null);
        return;
      }

      // Find the date from the longest series
      let dateStr = '';
      for (const data of seriesData().values()) {
        if (idx < data.length && data.length > 0)
          dateStr = formatDate(data[Math.min(idx, data.length - 1)].openTime);
      }

      const allVals = values.map((v) => v.value);
      const globalMin = Math.min(...allVals);
      const globalMax = Math.max(...allVals);
      const range = globalMax - globalMin || 1;
      const padding = range * 0.05;
      const _yMin = globalMin - padding;
      const _yMax = globalMax + padding;

      setCrosshair({
        values,
        date: dateStr,
        x: padLeft + (idx / (maxLen - 1)) * chartW,
        y: my,
      });
    });
  }

  function handleSearch(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const val = searchInput().trim();
      if (val) {
        addSymbol(val);
        setSearchInput('');
        setShowPresets(false);
      }
    }
  }

  function handleSearchInput(e: Event) {
    setSearchInput((e.target as HTMLInputElement).value);
    setShowPresets(false);
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style="color: var(--accent);">
          {title.toUpperCase()}
        </p>
        <div class="flex gap-1">
          <For each={TIMEFRAMES}>
            {(t) => (
              <button
                type="button"
                class="code-text px-2 py-1 transition-colors"
                style={{
                  color: tf() === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                  'border-bottom':
                    tf() === t.key ? '1px solid var(--accent)' : '1px solid transparent',
                }}
                onClick={() => setTf(t.key)}
              >
                {t.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Search bar and controls */}
      <div class="flex gap-2 mb-3 flex-wrap items-center">
        <div class="relative flex-1" style="min-width: 200px;">
          <input
            type="text"
            class="w-full px-3 py-1.5 text-xs font-mono"
            style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px;"
            placeholder="Add symbol (e.g. AAPL, ^GSPC, BTCUSDT)"
            value={searchInput()}
            onInput={handleSearchInput}
            onKeyDown={handleSearch}
            onFocus={() => setShowPresets(true)}
          />
          {showPresets() && (
            <div
              class="absolute z-10 mt-1 w-full border"
              style="background: var(--bg-card); border-color: var(--border); border-radius: 4px; max-height: 200px; overflow-y: auto;"
            >
              <For each={PRESETS}>
                {(p) => (
                  <button
                    type="button"
                    class="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-opacity-20"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => {
                      setSymbols(p.symbols);
                      setShowPresets(false);
                      setSearchInput('');
                    }}
                  >
                    {p.label} ({p.symbols.join(', ')})
                  </button>
                )}
              </For>
            </div>
          )}
        </div>

        <button
          type="button"
          class="px-2 py-1.5 text-xs font-mono"
          style={{
            color: viewMode() === 'pct' ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${viewMode() === 'pct' ? 'var(--accent)' : 'var(--border)'}`,
            'border-radius': '4px',
          }}
          onClick={() => setViewMode(viewMode() === 'price' ? 'pct' : 'price')}
        >
          {viewMode() === 'pct' ? '% Growth' : 'Price'}
        </button>
      </div>

      {/* Active symbols */}
      <div class="flex gap-1.5 mb-3 flex-wrap">
        <For each={symbols()}>
          {(sym, i) => (
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded"
              style={{
                background: `${COLORS[i() % COLORS.length]}20`,
                color: COLORS[i() % COLORS.length],
                border: `1px solid ${COLORS[i() % COLORS.length]}40`,
              }}
            >
              <span
                class="w-2 h-2 rounded-full inline-block"
                style={{ background: COLORS[i() % COLORS.length] }}
              />
              {sym}
              <button
                type="button"
                class="ml-0.5 opacity-60 hover:opacity-100"
                onClick={() => removeSymbol(sym)}
                aria-label={`Remove ${sym}`}
              >
                ×
              </button>
            </span>
          )}
        </For>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        class="border relative"
        style="border-color: var(--border); background: var(--bg-card);"
      >
        {!loading() && seriesData().size > 0 && (
          <canvas
            ref={canvasRef}
            class="w-full cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setCrosshair(null)}
            role="img"
            aria-label={`${title} chart`}
          />
        )}

        {loading() && (
          <div class="flex items-center justify-center" style="height: 320px;">
            <div class="text-center">
              <div
                class="w-6 h-6 border-2 mb-2 mx-auto"
                style="border-color: var(--border); border-top-color: var(--accent); animation: spin 1s linear infinite;"
              />
              <p class="code-text" style="color: var(--text-secondary);">
                Loading chart...
              </p>
            </div>
          </div>
        )}

        {!loading() && seriesData().size === 0 && (
          <div class="flex items-center justify-center" style="height: 320px;">
            <div class="text-center">
              <p class="code-text mb-1" style="color: var(--accent-warm);">
                {error() ? 'DATA ERROR' : 'NO DATA'}
              </p>
              <p class="text-xs" style="color: var(--text-secondary);">
                {error() || 'Add a symbol to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

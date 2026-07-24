import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getThemeColors } from '../../../lib/theme-colors';
import { onTickersChanged } from '../../../lib/ticker-events';
import { activeTickers } from '../../../lib/ticker-universe';
import { getWasmMod } from '../../../lib/wasm-loader';

interface PairsResult {
  hedge_ratio: number;
  z_score: number;
  signal: string;
  is_cointegrated: boolean;
  half_life: number;
  spread_tail: number[];
}

async function fetchCloses(symbol: string, range: string): Promise<number[]> {
  const res = await fetch(
    `${apiBase()}/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  return (quote?.close ?? []).filter((c: number | null): c is number => c != null);
}

function buildPairs() {
  const t = activeTickers();
  const out: {
    yi: number;
    xi: number;
    yLabel: string;
    xLabel: string;
    ySym: string;
    xSym: string;
  }[] = [];
  for (let i = 0; i < t.length; i++) {
    for (let j = i + 1; j < t.length; j++) {
      out.push({
        yi: i,
        xi: j,
        yLabel: t[i].label,
        xLabel: t[j].label,
        ySym: t[i].symbol,
        xSym: t[j].symbol,
      });
    }
  }
  return out;
}

export default function PairsTradingSignal() {
  const [data, setData] = createSignal<PairsResult | null>(null);
  const [pairIdx, setPairIdx] = createSignal(0);
  const [pairs, setPairs] = createSignal<ReturnType<typeof buildPairs>>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const all = buildPairs();
      setPairs(all);
      if (all.length === 0) throw new Error('Need at least 2 tickers');
      const idx = Math.min(pairIdx(), all.length - 1);
      if (idx !== pairIdx()) setPairIdx(idx);
      const pair = all[idx];

      const [yC, xC] = await Promise.all([
        fetchCloses(pair.ySym, '1y'),
        fetchCloses(pair.xSym, '1y'),
      ]);
      const len = Math.min(yC.length, xC.length);
      if (len < 30) throw new Error('Insufficient data');

      const y = new Float64Array(len);
      const x = new Float64Array(len);
      for (let k = 0; k < len; k++) {
        y[k] = yC[k];
        x[k] = xC[k];
      }

      const wasmMod = await getWasmMod();
      const json = wasmMod.quant_pairs_signal(y, x);
      const parsed = JSON.parse(json);
      if (!parsed || parsed.signal === undefined) {
        throw new Error('Pairs signal computation failed');
      }
      setData({
        hedge_ratio: parsed.hedge_ratio ?? 0,
        z_score: parsed.z_score ?? 0,
        signal: parsed.signal ?? 'NO_DATA',
        is_cointegrated: !!parsed.is_cointegrated,
        half_life: parsed.half_life ?? 9999,
        spread_tail: Array.isArray(parsed.spread_tail)
          ? parsed.spread_tail.map((v: number | null) => v ?? 0)
          : [],
      });
    } catch (e) {
      console.error('[PairsTradingSignal]', e);
      setError(e instanceof Error ? e.message : `Failed: ${String(e)}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function signalStyle(signal: string): { color: string; label: string } {
    const s = signal.toUpperCase();
    if (s === 'LONG_SPREAD' || s === 'SHORT_SPREAD')
      return { color: '#4caf50', label: s.replace('_', ' ') };
    if (s === 'HOLD' || s === 'EXIT_OR_FLAT')
      return { color: '#ffc107', label: s.replace('_', ' ') };
    return { color: '#ff5252', label: s.replace('_', ' ') };
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas || !data()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 280;
    const colors = getThemeColors();
    const pad = { l: 44, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const d = data()!;
    const tail = d.spread_tail ?? [];
    if (tail.length < 2) return;
    const n = tail.length;
    const yMax = Math.max(4, Math.max(...tail.map((v) => Math.abs(v))) * 1.1);
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v + yMax) / (2 * yMax)) * cH;

    // Grid
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${(yMax - (2 * yMax * i) / 4).toFixed(1)}σ`, pad.l - 5, y + 3);
    }

    // Reference lines
    const refLine = (val: number, color: string, dash: number[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(pad.l, toY(val));
      ctx.lineTo(w - pad.r, toY(val));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    refLine(3.5, '#ff9800', [6, 3]);
    refLine(-3.5, '#ff9800', [6, 3]);
    refLine(2, '#ff5252', [4, 3]);
    refLine(-2, '#ff5252', [4, 3]);
    refLine(0.5, '#4caf50', [2, 3]);
    refLine(-0.5, '#4caf50', [2, 3]);
    refLine(0, colors.canvasGrid || 'rgba(255,255,255,0.25)', []);

    // Z-score line
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      i === 0 ? ctx.moveTo(toX(i), toY(tail[i])) : ctx.lineTo(toX(i), toY(tail[i]));
    }
    ctx.stroke();

    // Current z marker
    const lastZ = tail[n - 1];
    ctx.fillStyle = signalStyle(d.signal).color;
    ctx.beginPath();
    ctx.arc(toX(n - 1), toY(lastZ), 4, 0, Math.PI * 2);
    ctx.fill();

    // Legend
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['±2 ENTRY', '#ff5252'],
      ['±0.5 EXIT', '#4caf50'],
      ['±3.5 STOP', '#ff9800'],
    ];
    legend.forEach(([label, color], i) => {
      const x = pad.l + 8 + i * 90;
      ctx.fillStyle = color;
      ctx.fillRect(x, h - 14, 8, 8);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 12, h - 7);
    });
  }

  onMount(() => loadData());

  onTickersChanged(() => {
    setPairIdx(0);
    loadData();
  });

  createEffect(() => {
    data();
    if (!loading()) requestAnimationFrame(() => draw());
  });

  const cur = () => pairs()[Math.min(pairIdx(), Math.max(0, pairs().length - 1))];

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          PAIRS TRADING SIGNAL
        </p>
        <Show when={!loading() && pairs().length > 0}>
          <select
            class="font-mono text-[10px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            value={pairIdx()}
            onChange={(e) => {
              setPairIdx(Number.parseInt(e.currentTarget.value, 10));
              loadData();
            }}
          >
            <For each={pairs()}>
              {(p, i) => (
                <option value={i()}>
                  {p.yLabel} / {p.xLabel}
                </option>
              )}
            </For>
          </select>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing pairs signal...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && !error() && !data()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          No data available. Try selecting different tickers.
        </p>
      </Show>

      <Show when={!loading() && data()} keyed>
        {(d) => {
          const st = signalStyle(d.signal);
          return (
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {cur()?.yLabel} / {cur()?.xLabel} | 1Y daily
                </span>
                <span
                  class="font-mono text-xl font-bold tracking-wider"
                  style={{ color: st.color, 'text-shadow': `0 0 12px ${st.color}55` }}
                >
                  {st.label}
                </span>
              </div>
              <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
              <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
                Hedge ratio: {d.hedge_ratio.toFixed(3)} | Half-life:{' '}
                {d.half_life > 9000 ? 'inf' : `${d.half_life.toFixed(1)} days`} | Entry ±2σ | Exit
                ±0.5σ | Stop ±3.5σ
              </p>
            </div>
          );
        }}
      </Show>
    </div>
  );
}

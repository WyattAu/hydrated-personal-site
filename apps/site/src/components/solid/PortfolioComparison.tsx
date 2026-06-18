import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { EtfEntry } from '../../lib/types';

interface PortfolioComparisonProps {
  database: EtfEntry[];
}

function drawComparison(canvas: HTMLCanvasElement, a: EtfEntry, b: EtfEntry) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 320;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const bg =
    getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#0c0c0c';
  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() ||
    '#888';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const allSectors = new Set([
    ...Object.keys(a.sector_allocation),
    ...Object.keys(b.sector_allocation),
  ]);
  const sectors = [...allSectors].sort();
  const maxVal = Math.max(
    ...sectors.map((s) => Math.max(a.sector_allocation[s] || 0, b.sector_allocation[s] || 0)),
    1,
  );

  const padLeft = 140;
  const padRight = 40;
  const padTop = 16;
  const padBottom = 16;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const groupH = chartH / sectors.length;
  const barH = Math.min(12, groupH / 2 - 2);

  const accent =
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00e5ff';

  sectors.forEach((sector, i) => {
    const y = padTop + i * groupH + groupH / 2;
    const valA = a.sector_allocation[sector] || 0;
    const valB = b.sector_allocation[sector] || 0;

    // ETF A bar (above center)
    const barWA = (valA / maxVal) * chartW;
    ctx.fillStyle = `${accent}99`;
    ctx.fillRect(padLeft, y - barH - 1, barWA, barH);

    // ETF B bar (below center)
    const barWB = (valB / maxVal) * chartW;
    ctx.fillStyle = '#b388ff99';
    ctx.fillRect(padLeft, y + 1, barWB, barH);

    // Label
    ctx.fillStyle = textColor;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(sector, padLeft - 8, y + 3);
  });
}

function EtfSelector(props: {
  label: string;
  database: EtfEntry[];
  selected: EtfEntry | null;
  onSelect: (e: EtfEntry) => void;
  accentColor: string;
}) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<EtfEntry[]>([]);
  const [open, setOpen] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    const q = query().toLowerCase().trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setResults(
      props.database
        .filter((e) => e.ticker.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
        .slice(0, 8),
    );
  });

  return (
    <div>
      <p class="label mb-2" style={{ color: props.accentColor }}>
        {props.label}
      </p>
      <div class="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ticker..."
          class="w-full border px-3 py-2 font-mono text-sm bg-transparent outline-none"
          style={{
            'border-color': open() ? props.accentColor : 'var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--bg-card)',
          }}
          value={query()}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <Show when={open() && results().length > 0}>
          <ul
            class="absolute left-0 right-0 border overflow-y-auto"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
              'max-height': '200px',
              'z-index': 'var(--z-overlay)',
            }}
          >
            <For each={results()}>
              {(entry) => (
                <li
                  class="px-3 py-2 cursor-pointer text-sm font-mono border-b transition-colors"
                  style={{
                    'border-color': 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    props.onSelect(entry);
                    setQuery(entry.ticker);
                    setOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ color: props.accentColor }}>{entry.ticker}</span>
                  <span class="ml-2" style={{ color: 'var(--text-secondary)' }}>
                    {entry.name}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
      <Show when={props.selected}>
        <div class="mt-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          {props.selected?.name}
        </div>
      </Show>
    </div>
  );
}

export default function PortfolioComparison(props: PortfolioComparisonProps) {
  const [etfA, setEtfA] = createSignal<EtfEntry | null>(null);
  const [etfB, setEtfB] = createSignal<EtfEntry | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  createEffect(() => {
    const a = etfA();
    const b = etfB();
    if (a && b && canvasRef) {
      drawComparison(canvasRef, a, b);
    }
  });

  onMount(() => {
    const observer = new ResizeObserver(() => {
      const a = etfA();
      const b = etfB();
      if (a && b && canvasRef) drawComparison(canvasRef, a, b);
    });
    if (canvasRef) observer.observe(canvasRef);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      class="border p-6"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <p class="label mb-4" style={{ color: accentColor() }}>
        PORTFOLIO COMPARISON
      </p>

      {/* Selectors */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <EtfSelector
          label="ETF A"
          database={props.database}
          selected={etfA()}
          onSelect={setEtfA}
          accentColor={accentColor()}
        />
        <EtfSelector
          label="ETF B"
          database={props.database}
          selected={etfB()}
          onSelect={setEtfB}
          accentColor={accentColor()}
        />
      </div>

      {/* Chart */}
      <Show when={etfA() && etfB()}>
        <div
          class="border mb-4"
          style={{
            'border-color': 'var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          <canvas
            ref={canvasRef}
            class="w-full"
            style={{ height: '320px' }}
            role="img"
            aria-label="Sector allocation comparison chart"
          />
        </div>

        {/* Legend */}
        <div
          class="flex items-center gap-6 mb-4 font-mono text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3" style={{ background: accentColor() }} />
            <span>{etfA()?.ticker}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3" style={{ background: '#b388ff' }} />
            <span>{etfB()?.ticker}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="A SECTORS"
            value={`${Object.keys(etfA()?.sector_allocation).length}`}
            accent={accentColor()}
          />
          <SummaryCard
            label="B SECTORS"
            value={`${Object.keys(etfB()?.sector_allocation).length}`}
            accent="#b388ff"
          />
          <SummaryCard label="A TOP SECTOR" value={getTopSector(etfA()!)} accent={accentColor()} />
          <SummaryCard label="B TOP SECTOR" value={getTopSector(etfB()!)} accent="#b388ff" />
        </div>
      </Show>

      <Show when={!etfA() || !etfB()}>
        <div class="text-center py-12 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Select two ETFs to compare their sector allocations
        </div>
      </Show>
    </div>
  );
}

function getTopSector(etf: EtfEntry): string {
  const entries = Object.entries(etf.sector_allocation);
  if (entries.length === 0) return '---';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function SummaryCard(props: { label: string; value: string; accent: string }) {
  return (
    <div
      class="p-3 border"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-secondary)',
      }}
    >
      <p
        class="font-mono text-xs tracking-wider mb-1"
        style={{ color: 'var(--text-secondary)', fontSize: '9px' }}
      >
        {props.label}
      </p>
      <p class="font-mono text-sm font-bold" style={{ color: props.accent }}>
        {props.value}
      </p>
    </div>
  );
}

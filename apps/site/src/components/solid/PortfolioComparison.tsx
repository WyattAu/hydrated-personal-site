import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getPlychart } from '../../lib/plychart-loader';
import { getThemeColors } from '../../lib/theme-colors';
import type { EtfEntry } from '../../lib/types';

interface PortfolioComparisonProps {
  database: EtfEntry[];
}

const H = 320;
const CANVAS_A = 'pf-compare-a';
const CANVAS_B = 'pf-compare-b';

function toBar(v: number) {
  return { time: 0, open: 0, high: 0, low: 0, close: v, volume: 0 };
}

// Sorted descending by weight (same ordering the manual draw used)
function sectorRows(etf: EtfEntry): [string, number][] {
  return Object.entries(etf.sector_allocation).sort((a, b) => b[1] - a[1]);
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
  const [wasmReady, setWasmReady] = createSignal(false);

  const accentColor = () => {
    return getThemeColors().accent || '#00e5ff';
  };

  async function initWasm() {
    try {
      await getPlychart();
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const a = etfA();
    const b = etfB();
    const ready = wasmReady();
    if (!a || !b || !ready) return;
    getPlychart().then((p) => {
      const canvasA = document.getElementById(CANVAS_A) as HTMLCanvasElement | null;
      const canvasB = document.getElementById(CANVAS_B) as HTMLCanvasElement | null;
      if (canvasA) {
        const w = canvasA.clientWidth || 600;
        p.create_chart(CANVAS_A, w, H);
        p.update_bar(CANVAS_A, JSON.stringify(sectorRows(a).map(([, v]) => toBar(v))), '');
      }
      if (canvasB) {
        const w = canvasB.clientWidth || 600;
        p.create_chart(CANVAS_B, w, H);
        p.update_bar(CANVAS_B, JSON.stringify(sectorRows(b).map(([, v]) => toBar(v))), '');
      }
    });
  });

  onMount(() => {
    initWasm();
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

      {/* Charts */}
      <Show
        when={etfA() && etfB() ? ([etfA(), etfB()] as [EtfEntry, EtfEntry] | null) : null}
        keyed
      >
        {([a, b]) => (
          <>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div
                class="border"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <canvas
                  id={CANVAS_A}
                  class="w-full"
                  style={{ height: `${H}px` }}
                  role="img"
                  aria-label={`${a.ticker} sector allocation chart`}
                />
              </div>
              <div
                class="border"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <canvas
                  id={CANVAS_B}
                  class="w-full"
                  style={{ height: `${H}px` }}
                  role="img"
                  aria-label={`${b.ticker} sector allocation chart`}
                />
              </div>
            </div>

            {/* Legend */}
            <div
              class="flex items-center gap-6 mb-4 font-mono text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div class="flex items-center gap-2">
                <span class="inline-block w-3 h-3" style={{ background: accentColor() }} />
                <span>{a.ticker}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-3 h-3" style={{ background: '#b388ff' }} />
                <span>{b.ticker}</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                label="A SECTORS"
                value={`${Object.keys(a.sector_allocation).length}`}
                accent={accentColor()}
              />
              <SummaryCard
                label="B SECTORS"
                value={`${Object.keys(b.sector_allocation).length}`}
                accent="#b388ff"
              />
              <SummaryCard label="A TOP SECTOR" value={getTopSector(a)} accent={accentColor()} />
              <SummaryCard label="B TOP SECTOR" value={getTopSector(b)} accent="#b388ff" />
            </div>
          </>
        )}
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
        style={{ color: 'var(--text-secondary)', 'font-size': '9px' }}
      >
        {props.label}
      </p>
      <p class="font-mono text-sm font-bold" style={{ color: props.accent }}>
        {props.value}
      </p>
    </div>
  );
}

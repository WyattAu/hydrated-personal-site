import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getPlychart } from '../../../lib/plychart-loader';

interface Series {
  code: string;
  label: string;
  values: number[];
}

const SERIES = [
  { code: 'CPIAUCSL', label: 'CPI' },
  { code: 'UNRATE', label: 'UNEMP' },
  { code: 'FEDFUNDS', label: 'FEDFUNDS' },
  { code: 'M2SL', label: 'M2' },
  { code: 'T10Y2Y', label: '10Y-2Y' },
  { code: 'ICSA', label: 'CLAIMS' },
  { code: 'UMCSENT', label: 'SENT' },
  { code: 'INDPRO', label: 'INDPRO' },
];

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  if (a >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

export default function FredSparklines() {
  const [series, setSeries] = createSignal<Series[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/fred-sparklines`);
      if (!res.ok) throw new Error('API');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!Array.isArray(data) || data.length === 0) throw new Error('No FRED data');
      setSeries(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const plychart = await getPlychart();
      const list = series();
      for (let i = 0; i < SERIES.length; i++) {
        const id = `fred-sparkline-${i}`;
        const canvas = document.getElementById(id) as HTMLCanvasElement | null;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          plychart.create_chart(id, Math.round(rect.width), 100);
        }
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const list = series();
    const ready = wasmReady();
    if (list.length === 0 || !ready) return;

    getPlychart().then((p) => {
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const up = s.values[s.values.length - 1] >= s.values[0];
        const color = up ? '#22c55e' : '#ef4444';
        p.update_sparkline(`fred-sparkline-${i}`, JSON.stringify(s.values), color, '');
      }
    });
  });

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    const list = series();
    if (list.length > 0 && !wasmReady()) {
      initWasm();
    }
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        FRED SPARKLINES
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading FRED series...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <Show when={series().length > 0}>
        <div class="grid grid-cols-4 gap-2" style={{ height: '360px' }}>
          <For each={series()}>
            {(s, i) => {
              const up = s.values[s.values.length - 1] >= s.values[0];
              const stroke = up ? '#22c55e' : '#ef4444';
              return (
                <div class="flex flex-col">
                  <div
                    class="flex items-center justify-between px-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span class="font-mono text-[9px]">{s.label}</span>
                    <span class="font-mono text-[9px]" style={{ color: stroke }}>
                      {fmt(s.values[s.values.length - 1])}
                    </span>
                  </div>
                  <canvas
                    id={`fred-sparkline-${i()}`}
                    class="w-full flex-1"
                    style={{ height: '100px' }}
                  />
                </div>
              );
            }}
          </For>
        </div>
      </Show>
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        8 macro series | last 30 obs | green = latest higher than first
      </p>
    </div>
  );
}

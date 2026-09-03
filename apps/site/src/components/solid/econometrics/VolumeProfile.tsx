import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { onAssetChanged } from '../../../lib/asset-events';
import { activeAsset } from '../../../lib/asset-store';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const BINS = 25;
const H = 300;
const CANVAS_ID = 'volume-profile';

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

  onMount(() => {
    loadData();
  });

  onAssetChanged(() => loadData());

  function renderChart() {
    const p = profile();
    if (!p) return;
    const bars = p.buckets.map((v) => ({
      time: 0,
      open: 0,
      high: 0,
      low: 0,
      close: v,
      volume: 0,
    }));
    renderPlychart(CANVAS_ID, 'update_bar', JSON.stringify(bars), '');
  }

  createEffect(() => {
    profile();
    renderChart();
  });

  usePlychartAuto(() => CANVAS_ID, renderChart);

  const curPct = () => {
    const p = profile();
    if (!p) return 50;
    const span = p.maxP - p.minP || 1;
    return Math.min(97, Math.max(3, (1 - (p.current - p.minP) / span) * 100));
  };

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
        <div class="relative">
          <canvas id={CANVAS_ID} class="w-full" style={{ height: `${H}px` }} />
          <Show when={profile()}>
            {(p) => (
              <div
                class="absolute left-0 right-0 border-t border-dashed pointer-events-none z-10"
                style={{
                  top: `${curPct()}%`,
                  'border-color': 'var(--accent)',
                }}
              >
                <span
                  class="absolute right-1 -translate-y-full font-mono text-[9px]"
                  style={{ color: 'var(--accent)' }}
                >
                  cur {p().current.toFixed(2)}
                </span>
              </div>
            )}
          </Show>
        </div>
        <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          3M daily | Price-binned volume | POC = Point of Control (highest volume node)
        </p>
        <Show when={profile()}>
          {(p) => (
            <p class="font-mono text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: '#ffc107' }}>
                POC {(p().minP + (p().pocIdx + 0.5) * p().step).toFixed(2)}
              </span>
              {` | peak ${fmtVol(Math.max(...p().buckets))} vol`}
            </p>
          )}
        </Show>
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

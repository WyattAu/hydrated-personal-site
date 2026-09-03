import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const H = 220;

const BINS = [
  { label: 'M0-1', min: 0, max: 1 },
  { label: 'M1-2', min: 1, max: 2 },
  { label: 'M2-3', min: 2, max: 3 },
  { label: 'M3-4', min: 3, max: 4 },
  { label: 'M4-5', min: 4, max: 5 },
  { label: 'M5-6', min: 5, max: 6 },
  { label: 'M6+', min: 6, max: Number.POSITIVE_INFINITY },
];

export default function EarthquakeHistogram() {
  const [counts, setCounts] = createSignal<number[] | null>(null);
  const [mags, setMags] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/earthquakes`);
      if (!res.ok) throw new Error('API');
      const raw = await res.json();
      const features: Array<{ properties: { mag: number | null } }> =
        (raw.data || raw).features || [];
      const allMags = features
        .map((f) => f.properties.mag ?? 0)
        .filter((m) => m != null && !Number.isNaN(m) && m > 0);
      setMags(allMags);
      const out = BINS.map(
        (b) =>
          features.filter(
            (f) => (f.properties.mag ?? 0) >= b.min && (f.properties.mag ?? 0) < b.max,
          ).length,
      );
      setCounts(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const dataMags = mags();
    const c = counts();
    if (!c) return;
    // plychart histogram handles linear Y only (original was log scale Gutenberg-Richter).
    // Use raw magnitudes with 7 bins for linear histogram.
    // Fallback to counts if mags empty (e.g. API gave no mags)
    const dataJson = dataMags.length > 0 ? JSON.stringify(dataMags) : JSON.stringify(c);
    const binCount = 7;
    // update_histogram(canvas_id, data_json, bin_count, theme_json)
    renderPlychart('quake-hist', 'update_histogram', dataJson, String(binCount), '');
  }

  createEffect(() => {
    mags();
    counts();
    renderChart();
  });

  usePlychartAuto(() => 'quake-hist', renderChart);

  onMount(() => {
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        EARTHQUAKE MAGNITUDE HISTOGRAM
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading USGS feed...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas id="quake-hist" class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        USGS 24h feed | binned by magnitude | plychart linear Y (original log scale
        Gutenberg-Richter)
      </p>
      <Show when={counts()}>
        {(c) => (
          <p class="font-mono text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            counts: {c().join(' / ')} | bins: {BINS.map((b) => b.label).join(', ')}
          </p>
        )}
      </Show>
    </div>
  );
}

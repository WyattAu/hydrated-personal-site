import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const H = 260;

interface StressData {
  quakeCount: number;
  kp: number;
  fear: number;
  vix: number;
  quakeStress: number;
  kpStress: number;
  fearStress: number;
  vixStress: number;
  total: number;
}

function stressColor(total: number): string {
  if (total < 30) return '#22c55e';
  if (total < 60) return '#eab308';
  if (total < 80) return '#f97316';
  return '#ef4444';
}

export default function GlobalStressGauge() {
  const [data, setData] = createSignal<StressData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const [eqRes, kpRes, fgRes, vixRes] = await Promise.all([
        fetch(`${apiBase()}/api/earthquakes`),
        fetch(`${apiBase()}/api/kp-index`),
        fetch(`${apiBase()}/api/fear-greed`),
        fetch(`${apiBase()}/api/stock-quote?symbols=%5EVIX`),
      ]);

      let quakeCount = 0;
      if (eqRes.ok) {
        const eqRaw = await eqRes.json();
        const features: Array<{ properties: { mag: number | null } }> =
          (eqRaw.data || eqRaw).features || [];
        quakeCount = features.filter((f) => (f.properties.mag ?? 0) >= 4.5).length;
      }

      let kp = 0;
      if (kpRes.ok) {
        const kpRaw = await kpRes.json();
        const arr = kpRaw.data || kpRaw;
        if (Array.isArray(arr) && arr.length > 0) {
          const latest = arr[arr.length - 1];
          kp = Number(Array.isArray(latest) ? latest[1] : latest.kp_index) || 0;
        }
      }

      let fear = 50;
      if (fgRes.ok) {
        const fgRaw = await fgRes.json();
        const f0 = fgRaw.data?.[0] ?? (Array.isArray(fgRaw) ? fgRaw[0] : null);
        if (f0) fear = Number(f0.value) || 50;
      }

      let vix = 20;
      if (vixRes.ok) {
        const vRaw = await vixRes.json();
        const items: Array<{ symbol?: string; price?: number }> = Array.isArray(vRaw)
          ? vRaw
          : vRaw.data || [];
        const v = items.find((x) => x.symbol === '^VIX');
        if (v) vix = Number(v.price) || 20;
      }

      const quakeStress = Math.min(quakeCount / 300, 1) * 25;
      const kpStress = Math.min(kp / 9, 1) * 25;
      const fearStress = ((100 - fear) / 100) * 25;
      const vixStress = Math.min(vix / 40, 1) * 25;
      setData({
        quakeCount,
        kp,
        fear,
        vix,
        quakeStress,
        kpStress,
        fearStress,
        vixStress,
        total: quakeStress + kpStress + fearStress + vixStress,
      });
      setChartMetaState('stress-gauge', { freshAt: Date.now(), error: null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
      setChartMetaState('stress-gauge', {
        error: e instanceof Error ? e.message : 'Failed',
      });
    } finally {
      setLoading(false);
    }
  }

  function renderChart() {
    const d = data();
    if (!d) return;
    renderPlychart(
      'stress-gauge',
      'update_gauge_zoned',
      String(d.total),
      '100',
      stressColor(d.total),
      JSON.stringify([30, 60, 80]),
      '',
    );
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'stress-gauge', renderChart);

  onMount(() => {
    attachChartMeta('stress-gauge', {
      source: 'USGS · NOAA SWPC · Yahoo · Alt.me',
      detail: 'composite 0-100',
    });
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        GLOBAL STRESS GAUGE
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing stress signal...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas id="stress-gauge" class="w-full" style={{ height: `${H}px` }} />
      <Show when={data()} keyed>
        {(d) => (
          <>
            <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              geophysical + markets + sentiment composite | arc 0-100
            </p>
            <div
              class="font-mono text-[10px] mt-2 grid grid-cols-2 gap-x-4 gap-y-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>
                QUAKE {d.quakeStress.toFixed(1)} (M4.5+ {d.quakeCount})
              </span>
              <span>
                KP {d.kpStress.toFixed(1)} ({d.kp.toFixed(1)})
              </span>
              <span>
                FEAR {d.fearStress.toFixed(1)} ({Math.round(d.fear)})
              </span>
              <span>
                VIX {d.vixStress.toFixed(1)} ({d.vix.toFixed(1)})
              </span>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}

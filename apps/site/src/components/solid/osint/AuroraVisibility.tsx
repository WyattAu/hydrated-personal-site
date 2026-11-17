import { For, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

/**
 * AuroraVisibility — NOAA OVATION aurora probability near a coordinate,
 * via the site's filtered /api/aurora worker endpoint (grid-side filtering
 * keeps the client payload ~1 KB instead of the 65k-cell upstream grid).
 */

interface AuroraPayload {
  latitude: number;
  longitude: number;
  probability: number;
  matched_cells: number;
  observation_time: string;
  forecast_time: string;
}

interface HistoryPoint {
  ts: number;
  prob: number;
}

const PLACES: { label: string; lat: number; lon: number }[] = [
  { label: 'LONDON', lat: 51.5, lon: -0.12 },
  { label: 'EDINBURGH', lat: 55.95, lon: -3.19 },
  { label: 'REYKJAVIK', lat: 64.15, lon: -21.9 },
  { label: 'TROMSØ', lat: 69.65, lon: 18.96 },
];

function level(prob: number): { label: string; color: string } {
  if (prob >= 50) return { label: 'STRONG', color: 'var(--positive, #34d399)' };
  if (prob >= 15) return { label: 'VISIBLE', color: 'var(--accent-warm, #ff9800)' };
  if (prob >= 5) return { label: 'FAINT', color: 'var(--accent)' };
  return { label: 'UNLIKELY', color: 'var(--text-secondary)' };
}

/**
 * Moon phase from synodic-month math (deterministic, no API).
 * Epoch: known new moon 2000-01-06 18:14 UTC. Illumination uses the
 * sine approximation — good to a few percent, fine for a darkness verdict.
 */
const SYNODIC = 29.530588853;
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14); // ms

function moonState(now: number): { illumination: number; phase: string; dark: boolean } {
  const age = ((now - NEW_MOON_EPOCH) / 86400000) % SYNODIC;
  const fraction = age / SYNODIC; // 0 new, 0.5 full, 1 new
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * fraction)) / 2) * 100);
  let phase: string;
  if (fraction < 0.03 || fraction > 0.97) phase = 'new';
  else if (fraction < 0.22) phase = 'waxing crescent';
  else if (fraction < 0.28) phase = 'first quarter';
  else if (fraction < 0.47) phase = 'waxing gibbous';
  else if (fraction < 0.53) phase = 'full';
  else if (fraction < 0.72) phase = 'waning gibbous';
  else if (fraction < 0.78) phase = 'last quarter';
  else phase = 'waning crescent';
  return { illumination, phase, dark: illumination <= 25 };
}

export default function AuroraVisibility() {
  const [place, setPlace] = createSignal(PLACES[1]); // Edinburgh default — highest UK odds
  const [data, setData] = createSignal<AuroraPayload | null>(null);
  const [kp, setKp] = createSignal<number | null>(null);
  const [kpSeries, setKpSeries] = createSignal<{ ts: number; kp: number }[]>([]);
  const [history, setHistory] = createSignal<HistoryPoint[]>([]);
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase()}/api/aurora?lat=${place().lat}&lon=${place().lon}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as AuroraPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OVATION feed unavailable');
    } finally {
      setLoading(false);
    }
  };

  onMount(async () => {
    void load();
    // Kp context: geomagnetic activity drives how far south aurora reaches.
    try {
      const res = await fetch(`${apiBase()}/api/kp-index`);
      if (res.ok) {
        const d = (await res.json()) as { Kp: number; time_tag: string }[];
        if (Array.isArray(d) && d.length > 0) {
          setKp(d[d.length - 1].Kp);
          const windowStart = Date.now() - 24 * 3600 * 1000;
          setKpSeries(
            d
              .map((r) => ({ ts: new Date(`${r.time_tag}Z`).getTime(), kp: r.Kp }))
              .filter((r) => Number.isFinite(r.ts) && r.ts >= windowStart),
          );
        }
      }
    } catch {
      /* Kp chip is best-effort */
    }
    // Activity-index history (30-min KV snapshots, best-effort).
    try {
      const res = await fetch(`${apiBase()}/api/aurora-history`);
      if (res.ok) {
        const d = (await res.json()) as { history?: HistoryPoint[] };
        if (Array.isArray(d.history) && d.history.length >= 2) setHistory(d.history.slice(-48));
      }
    } catch {
      /* history sparkline is best-effort */
    }
  });

  const windowStartTs = (): number => {
    const h = history();
    return h.length > 0 ? h[0].ts : Date.now() - 24 * 3600 * 1000;
  };
  const lv = () => level(data()?.probability ?? 0);
  const obs = () => `${(data()?.observation_time ?? '').slice(11, 16)}Z`;
  const fct = () => `${(data()?.forecast_time ?? '').slice(11, 16)}Z`;
  const moon = moonState(Date.now());

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          AURORA
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'OVATION'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="flex items-baseline justify-between mb-3">
        <span
          class="font-mono text-2xl font-bold"
          style={{ color: data()?.probability ? lv().color : 'var(--text-primary)' }}
        >
          {loading() ? '…' : `${data()?.probability ?? 0}%`}
        </span>
        <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          {data()?.probability ? lv().label : '—'} · {place().label}
        </span>
      </div>
      {kp() !== null && (
        <p class="font-mono text-[9px] mb-2" style={{ color: 'var(--text-secondary)' }}>
          KP {kp()?.toFixed(2)} ·{' '}
          {(kp() ?? 0) >= 5
            ? 'storm levels — visible far south of usual'
            : (kp() ?? 0) >= 4
              ? 'elevated — high-latitudes only'
              : 'quiet — high-latitudes only'}
        </p>
      )}
      <p class="font-mono text-[9px] mb-2" style={{ color: 'var(--text-secondary)' }}>
        MOON {moon.illumination}% {moon.phase} ·{' '}
        <span
          style={{ color: moon.dark ? 'var(--positive, #34d399)' : 'var(--accent-warm, #ff9800)' }}
        >
          {moon.dark ? 'dark skies favor visibility' : 'bright skies — poor contrast'}
        </span>
      </p>
      {history().length >= 2 && (
        <svg
          viewBox="0 0 300 44"
          class="w-full mb-2"
          role="img"
          aria-label="Aurora activity index (solid, percent) vs planetary K-index x11 (dashed) over the last 24 hours"
        >
          {kpSeries().length >= 2 && (
            <polyline
              points={kpSeries()
                .map((r) => {
                  const x = ((r.ts - windowStartTs()) / 86400000) * 300;
                  const y = 42 - (Math.min(r.kp, 9) / 9) * 38;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="var(--accent-warm, #ff9800)"
              stroke-width="1"
              stroke-dasharray="2 3"
              opacity="0.8"
            />
          )}
          <polyline
            points={history()
              .map((p) => {
                const x = ((p.ts - windowStartTs()) / 86400000) * 300;
                const y = 42 - (Math.min(p.prob, 100) / 100) * 38;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="var(--accent)"
            stroke-width="1.5"
          />
        </svg>
      )}
      {history().length >= 2 && (
        <p class="font-mono text-[9px] mb-2" style={{ color: 'var(--text-secondary)' }}>
          24h overlay — <span style={{ color: 'var(--accent)' }}>aurora index %</span> vs{' '}
          <span style={{ color: 'var(--accent-warm, #ff9800)' }}>Kp ×11</span>
        </p>
      )}
      <div class="grid grid-cols-4 gap-1 mb-2">
        <For each={PLACES}>
          {(p) => (
            <button
              type="button"
              class="border py-1 font-mono text-[9px] transition-colors"
              style={{
                'border-color': place().label === p.label ? 'var(--accent)' : 'var(--border)',
                color: place().label === p.label ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onClick={() => {
                setPlace(p);
                void load();
              }}
            >
              {p.label}
            </button>
          )}
        </For>
      </div>
      <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
        OVATION 30-min model · obs {data() ? obs() : '—'} → fc {data() ? fct() : '—'} ·{' '}
        {data()?.matched_cells ?? 0} grid cells
      </p>
    </div>
  );
}

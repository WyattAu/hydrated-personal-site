import { For, createSignal, onMount } from 'solid-js';

/**
 * SwpcForecast — NOAA SWPC 3-day geomagnetic forecast (Kp breakdown table
 * parsed from the public text product). Adds predictive OSINT: expected Kp
 * per 3-hour block for today + 2 days, with G-scale severity coloring.
 */

interface ForecastDay {
  date: string;
  slots: { window: string; kp: number; scale: string }[];
}

const DAY_RE =
  /\s{2,}([A-Z][a-z]{2}\s+\d{2})\s+([A-Z][a-z]{2}\s+\d{2})\s+([A-Z][a-z]{2}\s+\d{2})\s*$/;
const ROW_RE = /^(\d{2}-\d{2})UT\s+(.*)$/;
const CELL_RE = /(\d+\.?\d*)\s*(?:\(G(\d)\))?/g;

function parseForecast(text: string): ForecastDay[] {
  const lines = text.split('\n');
  let dates: string[] | null = null;
  const days: ForecastDay[] = [];

  for (const line of lines) {
    if (!dates) {
      const m = DAY_RE.exec(line);
      if (m) dates = [m[1], m[2], m[3]];
      continue;
    }
    const row = ROW_RE.exec(line);
    if (!row) continue;
    const cells = [...row[2].matchAll(CELL_RE)];
    if (cells.length < 3) continue;
    for (let d = 0; d < 3; d++) {
      if (!days[d]) days[d] = { date: dates?.[d] ?? '', slots: [] };
      days[d]?.slots.push({
        window: row[1] ?? '',
        kp: Number.parseFloat(cells[d]?.[1] ?? '0'),
        scale: cells[d]?.[2] ?? '',
      });
    }
  }
  return days.filter((d) => d.slots.length >= 6);
}

function kpColor(kp: number, scale: string): string {
  if (scale || kp >= 5) return 'var(--negative, #ef4444)';
  if (kp >= 4) return 'var(--accent-warm, #ff9800)';
  return 'var(--accent)';
}

export default function SwpcForecast() {
  const [days, setDays] = createSignal<ForecastDay[]>([]);
  const [error, setError] = createSignal('');
  const [issued, setIssued] = createSignal('');

  onMount(async () => {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/text/3-day-forecast.txt');
      if (!res.ok) throw new Error(`SWPC ${res.status}`);
      const text = await res.text();
      const parsed = parseForecast(text);
      if (parsed.length === 0) throw new Error('parse: no Kp table');
      setDays(parsed);
      const m = /:Issued:\s+(.*)/.exec(text);
      if (m?.[1]) setIssued(m[1].trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SWPC forecast unavailable');
    }
  });

  const peak = () => Math.max(...days().flatMap((d) => d.slots.map((s) => s.kp)), 0);

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          3-DAY FORECAST
        </p>
        <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {error() ? 'OFFLINE' : 'SWPC'}
        </span>
      </div>
      {error() && (
        <p class="font-mono text-xs p-2" style={{ color: 'var(--accent-warm, #ff9800)' }}>
          {error()}
        </p>
      )}
      <div class="overflow-x-auto">
        <table class="w-full font-mono text-[9px] border-collapse">
          <thead>
            <tr>
              <th class="text-left pr-2 pb-1" style={{ color: 'var(--text-secondary)' }} />
              <For each={days()}>
                {(day) => (
                  <th class="px-1 pb-1 font-normal" style={{ color: 'var(--text-primary)' }}>
                    {day.date}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={days()[0]?.slots ?? []}>
              {(slot, i) => (
                <tr>
                  <td class="pr-2 py-[1px]" style={{ color: 'var(--text-secondary)' }}>
                    {slot.window}
                  </td>
                  <For each={days()}>
                    {(day) => {
                      const s = day.slots[i()];
                      return (
                        <td
                          class="px-1 text-center"
                          style={{ color: s ? kpColor(s.kp, s.scale) : 'var(--text-secondary)' }}
                        >
                          {s ? s.kp.toFixed(1) : '—'}
                        </td>
                      );
                    }}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        peak expected Kp {days().length > 0 ? peak().toFixed(1) : '—'} · colored ≥4 (G1+)
        {issued() && ` · issued ${issued()}`}
      </p>
    </div>
  );
}

import { For, Show, createMemo, createSignal, onMount } from 'solid-js';

interface Fund {
  ticker: string;
  name: string;
  category: string;
  sector_allocation: Record<string, number>;
}

interface FundSector {
  sector: string;
  weight: number;
}

function sectorsOf(fund: Fund): FundSector[] {
  return Object.entries(fund.sector_allocation ?? {})
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight);
}

function hhi(sectors: FundSector[]): number {
  return sectors.reduce((acc, s) => acc + s.weight * s.weight, 0) / 10_000;
}

function effectiveN(sectors: FundSector[]): number {
  return hhi(sectors) > 0 ? 1 / hhi(sectors) : 0;
}

export default function ConcentrationExplorer() {
  const [funds, setFunds] = createSignal<Fund[]>([]);
  const [selA, setSelA] = createSignal<string>('VOO');
  const [selB, setSelB] = createSignal<string>('');
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch('/data/etf-database.json');
      const data = (await res.json()) as Fund[];
      setFunds(data);
      // default B: a fund with a different profile than VOO if present
      const spread = data.find((f) => f.ticker !== 'VOO');
      if (spread) setSelB(spread.ticker);
    } catch {
      setError('Failed to load dataset');
    }
  });

  const fundA = createMemo(() => funds().find((f) => f.ticker === selA()));
  const fundB = createMemo(() => funds().find((f) => f.ticker === selB()));

  const sectA = createMemo(() => (fundA() ? sectorsOf(fundA()) : []));
  const sectB = createMemo(() => (fundB() ? sectorsOf(fundB()) : []));

  const allSectors = createMemo(() => {
    const set = new Set<string>();
    for (const s of sectA()) set.add(s.sector);
    for (const s of sectB()) set.add(s.sector);
    return [...set];
  });

  const weightOf = (sectors: FundSector[], sector: string): number =>
    sectors.find((s) => s.sector === sector)?.weight ?? 0;

  return (
    <div class="space-y-8">
      <Show
        when={!error()}
        fallback={
          <p class="text-sm" style="color: var(--text-secondary);">
            {error()}
          </p>
        }
      >
        <Show when={funds().length > 0}>
          {/* selectors */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="block">
              <span
                class="text-xs font-semibold uppercase tracking-wide"
                style="color: var(--text-secondary);"
              >
                Fund A
              </span>
              <select
                class="mt-1 w-full border p-2 text-sm"
                style="border-color: var(--border); background: var(--bg-card); color: var(--text-primary);"
                value={selA()}
                onChange={(e) => setSelA(e.currentTarget.value)}
              >
                {funds().map((f) => (
                  <option value={f.ticker}>
                    {f.ticker} — {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="block">
              <span
                class="text-xs font-semibold uppercase tracking-wide"
                style="color: var(--text-secondary);"
              >
                Fund B (compare)
              </span>
              <select
                class="mt-1 w-full border p-2 text-sm"
                style="border-color: var(--border); background: var(--bg-card); color: var(--text-primary);"
                value={selB()}
                onChange={(e) => setSelB(e.currentTarget.value)}
              >
                <option value="">None</option>
                {funds().map((f) => (
                  <option value={f.ticker}>
                    {f.ticker} — {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* metrics */}
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Show when={fundA()}>
              <div class="border p-4 text-center" style="border-color: var(--border);">
                <p class="text-2xl font-bold" style="color: var(--accent);">
                  {hhi(sectA()).toFixed(3)}
                </p>
                <p class="text-xs mt-1" style="color: var(--text-secondary);">
                  HHI — {fundA()!.ticker}
                </p>
              </div>
              <div class="border p-4 text-center" style="border-color: var(--border);">
                <p class="text-2xl font-bold" style="color: var(--accent);">
                  {effectiveN(sectA()).toFixed(1)}
                </p>
                <p class="text-xs mt-1" style="color: var(--text-secondary);">
                  Effective # sectors — {fundA()!.ticker}
                </p>
              </div>
              <Show when={fundB()}>
                <div class="border p-4 text-center" style="border-color: var(--border);">
                  <p class="text-2xl font-bold" style="color: var(--accent);">
                    {hhi(sectB()).toFixed(3)}
                  </p>
                  <p class="text-xs mt-1" style="color: var(--text-secondary);">
                    HHI — {fundB()!.ticker}
                  </p>
                </div>
                <div class="border p-4 text-center" style="border-color: var(--border);">
                  <p class="text-2xl font-bold" style="color: var(--accent);">
                    {effectiveN(sectB()).toFixed(1)}
                  </p>
                  <p class="text-xs mt-1" style="color: var(--text-secondary);">
                    Effective # sectors — {fundB()!.ticker}
                  </p>
                </div>
              </Show>
            </Show>
          </div>

          {/* sector bars A (+B overlay) */}
          <div class="space-y-3" role="table" aria-label="Sector allocation comparison">
            <For each={allSectors()}>
              {(sector) => {
                const wa = weightOf(sectA(), sector);
                const wb = selB() ? weightOf(sectB(), sector) : null;
                return (
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span style="color: var(--text-primary);">{sector}</span>
                      <span class="font-mono" style="color: var(--text-secondary);">
                        {wa.toFixed(1)}%{wb !== null ? ` / ${wb.toFixed(1)}%` : ''}
                      </span>
                    </div>
                    <div
                      class="h-3 bg-[var(--bg-secondary)] overflow-hidden"
                      style="border-radius: 2px;"
                    >
                      <div
                        class="h-full"
                        style={`width: ${wa}%; background: var(--accent);`}
                        role="meter"
                        aria-valuenow={wa}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label={`${sector} allocation ${wa.toFixed(1)} percent`}
                      />
                    </div>
                    <Show when={wb !== null}>
                      <div
                        class="h-1 mt-0.5 bg-[var(--bg-secondary)] overflow-hidden"
                        style="border-radius: 1px;"
                      >
                        <div
                          class="h-full opacity-60"
                          style={`width: ${wb ?? 0}%; background: var(--text-secondary);`}
                        />
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
          <p class="text-xs" style="color: var(--text-secondary);">
            Bars: fund A (solid, {selA()}); thin bar: fund B (compare). Values from the keyless
            89-fund dataset, recomputed client-side on every change.
          </p>
        </Show>
      </Show>
    </div>
  );
}

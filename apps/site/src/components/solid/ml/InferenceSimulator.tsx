import { createEffect, createMemo, createSignal } from 'solid-js';
import { attachChartMeta, setChartMetaState } from '../../../lib/chart-meta';
import { setChartLabels } from '../../../lib/plychart-render';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';

const QUANTS = [
  { key: 'FP32', bytes: 4 },
  { key: 'FP16', bytes: 2 },
  { key: 'INT8', bytes: 1 },
  { key: 'INT4', bytes: 0.5 },
] as const;

function formatFlops(f: number): string {
  const a = Math.abs(f);
  if (a >= 1e15) return `${(f / 1e15).toFixed(2)} PFLOP`;
  if (a >= 1e12) return `${(f / 1e12).toFixed(2)} TFLOP`;
  if (a >= 1e9) return `${(f / 1e9).toFixed(2)} GFLOP`;
  if (a >= 1e6) return `${(f / 1e6).toFixed(2)} MFLOP`;
  return `${f.toFixed(0)} FLOP`;
}

export default function InferenceSimulator() {
  const [params, setParams] = createSignal(70);
  const [batch, setBatch] = createSignal(1);
  const [seq, setSeq] = createSignal(2048);
  const [quant, setQuant] = createSignal<string>('FP16');
  const [bandwidth, setBandwidth] = createSignal(900);

  const bpp = createMemo(() => QUANTS.find((q) => q.key === quant())?.bytes ?? 2);

  const out = createMemo(() => {
    const p = params();
    const b = bpp();
    const bw = bandwidth();
    const bs = batch();
    const sl = seq();
    const modelMemoryGB = p * b;
    const flopsPerToken = 2 * p * 1e9;
    const maxTokS = bw / (2 * p * b);
    const totalCompute = flopsPerToken * sl * bs;
    return { modelMemoryGB, flopsPerToken, maxTokS, totalCompute };
  });

  function renderChart() {
    attachChartMeta('inference-bars', {
      source: 'synthetic',
      detail: 'tokens/s by quant · no external data',
    });
    setChartLabels('inference-bars', { yUnit: 'tok/s' });
    setChartMetaState('inference-bars', { freshAt: Date.now() });
    const p = params();
    const bw = bandwidth();
    const vals = QUANTS.map((q) => bw / (2 * p * q.bytes));
    const data = vals.map((v) => ({ time: 0, open: 0, high: 0, low: 0, close: v, volume: 0 }));
    renderPlychart('inference-bars', 'update_bar', JSON.stringify(data), '');
  }

  createEffect(() => {
    params();
    bandwidth();
    // depend on quant as well so selection change triggers update (even though bars show all quants, highlight handling is via WASM theme if needed)
    quant();
    renderChart();
  });

  usePlychartAuto(() => 'inference-bars', renderChart);

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        INFERENCE SIMULATOR
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>PARAMETERS</span>
            <span style={{ color: 'var(--accent)' }}>{params().toFixed(0)}B</span>
          </span>
          <input
            type="range"
            min="1"
            max="450"
            step="1"
            value={params()}
            onInput={(e) => setParams(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>BATCH SIZE</span>
            <span style={{ color: 'var(--accent)' }}>{batch()}</span>
          </span>
          <input
            type="range"
            min="1"
            max="256"
            step="1"
            value={batch()}
            onInput={(e) => setBatch(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>SEQUENCE LENGTH</span>
            <span style={{ color: 'var(--accent)' }}>{seq()}</span>
          </span>
          <input
            type="range"
            min="128"
            max="32768"
            step="128"
            value={seq()}
            onInput={(e) => setSeq(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] flex justify-between"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>MEMORY BANDWIDTH</span>
            <span style={{ color: 'var(--accent)' }}>{bandwidth()} GB/s</span>
          </span>
          <input
            type="range"
            min="100"
            max="3350"
            step="50"
            value={bandwidth()}
            onInput={(e) => setBandwidth(Number(e.currentTarget.value))}
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            QUANTIZATION
          </span>
          <select
            class="font-mono text-[10px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={quant()}
            onChange={(e) => setQuant(e.currentTarget.value)}
          >
            {QUANTS.map((q) => (
              // biome-ignore lint/correctness/useJsxKeyInIterable: SolidJS has no key reconciliation; QUANTS is a static list
              <option value={q.key}>
                {q.key} ({q.bytes} byte{q.bytes === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatCard
          label="MODEL MEMORY"
          value={`${out().modelMemoryGB.toFixed(1)} GB`}
          hint={`${params().toFixed(0)}B × ${bpp()} bytes`}
        />
        <StatCard
          label="FLOPs / TOKEN"
          value={formatFlops(out().flopsPerToken)}
          hint="2 × params"
        />
        <StatCard
          label="PEAK tok/s"
          value={`${out().maxTokS.toFixed(2)}`}
          hint="bandwidth / (2·p·bpp)"
          accent
        />
        <StatCard
          label="SEQUENCE COMPUTE"
          value={formatFlops(out().totalCompute)}
          hint={`× ${seq()} seq · ${batch()} batch`}
        />
      </div>

      <canvas id="inference-bars" class="w-full" style={{ height: '200px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Roofline estimate | memory-bound decode | bars scale with params &amp; bandwidth |
        FP32/FP16/INT8/INT4 via plychart
      </p>
    </div>
  );
}

function StatCard(props: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div
      class="p-2 border"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <p
        class="font-mono text-[9px] uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        {props.label}
      </p>
      <p
        class="font-mono text-sm font-bold"
        style={{ color: props.accent ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {props.value}
      </p>
      <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
        {props.hint}
      </p>
    </div>
  );
}

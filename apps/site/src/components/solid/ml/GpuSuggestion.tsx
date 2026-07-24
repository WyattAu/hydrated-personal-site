import { For, Show, createSignal } from 'solid-js';

interface GpuSpec {
  name: string;
  vendor: string;
  vram: number; // GB
  bandwidth: number; // GB/s
  tdp: number; // watts
  msrp: number; // USD
  category: 'datacenter' | 'workstation' | 'consumer';
  fp16Tflops: number;
}

const GPU_DATABASE: GpuSpec[] = [
  // Datacenter
  {
    name: 'H100 SXM5',
    vendor: 'NVIDIA',
    vram: 80,
    bandwidth: 3350,
    tdp: 700,
    msrp: 30000,
    category: 'datacenter',
    fp16Tflops: 1979,
  },
  {
    name: 'H100 PCIe',
    vendor: 'NVIDIA',
    vram: 80,
    bandwidth: 2039,
    tdp: 350,
    msrp: 25000,
    category: 'datacenter',
    fp16Tflops: 1513,
  },
  {
    name: 'A100 80GB SXM4',
    vendor: 'NVIDIA',
    vram: 80,
    bandwidth: 2039,
    tdp: 400,
    msrp: 15000,
    category: 'datacenter',
    fp16Tflops: 624,
  },
  {
    name: 'A100 40GB SXM4',
    vendor: 'NVIDIA',
    vram: 40,
    bandwidth: 1555,
    tdp: 400,
    msrp: 10000,
    category: 'datacenter',
    fp16Tflops: 624,
  },
  {
    name: 'L40S',
    vendor: 'NVIDIA',
    vram: 48,
    bandwidth: 864,
    tdp: 350,
    msrp: 8000,
    category: 'datacenter',
    fp16Tflops: 366,
  },
  {
    name: 'A30',
    vendor: 'NVIDIA',
    vram: 24,
    bandwidth: 933,
    tdp: 165,
    msrp: 4500,
    category: 'datacenter',
    fp16Tflops: 165,
  },
  // Workstation
  {
    name: 'RTX 6000 Ada',
    vendor: 'NVIDIA',
    vram: 48,
    bandwidth: 960,
    tdp: 300,
    msrp: 6800,
    category: 'workstation',
    fp16Tflops: 362,
  },
  {
    name: 'RTX A6000',
    vendor: 'NVIDIA',
    vram: 48,
    bandwidth: 768,
    tdp: 300,
    msrp: 4500,
    category: 'workstation',
    fp16Tflops: 155,
  },
  {
    name: 'RTX 5000 Ada',
    vendor: 'NVIDIA',
    vram: 32,
    bandwidth: 576,
    tdp: 250,
    msrp: 4000,
    category: 'workstation',
    fp16Tflops: 265,
  },
  // Consumer
  {
    name: 'RTX 4090',
    vendor: 'NVIDIA',
    vram: 24,
    bandwidth: 1008,
    tdp: 450,
    msrp: 1599,
    category: 'consumer',
    fp16Tflops: 330,
  },
  {
    name: 'RTX 4080 Super',
    vendor: 'NVIDIA',
    vram: 16,
    bandwidth: 736,
    tdp: 320,
    msrp: 999,
    category: 'consumer',
    fp16Tflops: 168,
  },
  {
    name: 'RTX 3090',
    vendor: 'NVIDIA',
    vram: 24,
    bandwidth: 936,
    tdp: 350,
    msrp: 1499,
    category: 'consumer',
    fp16Tflops: 142,
  },
  {
    name: 'RTX 4070 Ti Super',
    vendor: 'NVIDIA',
    vram: 16,
    bandwidth: 672,
    tdp: 285,
    msrp: 799,
    category: 'consumer',
    fp16Tflops: 132,
  },
  {
    name: 'RX 7900 XTX',
    vendor: 'AMD',
    vram: 24,
    bandwidth: 960,
    tdp: 355,
    msrp: 999,
    category: 'consumer',
    fp16Tflops: 122,
  },
];

const QUANTIZATION_BYTES: Record<string, number> = {
  FP32: 4,
  FP16: 2,
  BF16: 2,
  INT8: 1,
  INT4: 0.5,
};

const ENGINE_EFFICIENCY: Record<string, number> = {
  vLLM: 0.85,
  TGI: 0.75,
  'TensorRT-LLM': 0.92,
  'llama.cpp': 0.65,
  Ollama: 0.6,
  Custom: 0.7,
};

const CATEGORY_LABELS: Record<string, string> = {
  datacenter: 'DATACENTER',
  workstation: 'WORKSTATION',
  consumer: 'CONSUMER',
};

function formatBytes(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
}

function formatPrice(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  return `$${usd}`;
}

export default function GpuSuggestion() {
  const [params, setParams] = createSignal(7); // billions
  const [quant, setQuant] = createSignal('FP16');
  const [engine, setEngine] = createSignal('vLLM');
  const [batchSize, setBatchSize] = createSignal(1);
  const [contextLen, setContextLen] = createSignal(4096);
  const [maxBudget, setMaxBudget] = createSignal(0); // 0 = no limit

  const bytesPerParam = () => QUANTIZATION_BYTES[quant()] ?? 2;
  const efficiency = () => ENGINE_EFFICIENCY[engine()] ?? 0.7;

  // Model weights memory (GB)
  const modelMemory = () => (params() * 1e9 * bytesPerParam()) / 1e9;

  // KV cache per token = 2 * n_layers * hidden_dim * 2 * bytes_per_param
  // Approximation: KV cache ~ 0.5 * params * context_len * bytes_per_param * batch
  // More precise: kv_per_token = 2 * n_layers * 2 * d_model * bytes
  // For a 7B model: n_layers~32, d_model~4096, so kv/token ~ 2 * 32 * 2 * 4096 * 2 = 1MB/token
  // General: kv_per_token ~ params * 0.3 * bytes_per_param (rough scaling)
  const kvCachePerToken = () => {
    // Formula: 2 (K+V) * n_layers * d_model * 2 (bytes for fp16) / 1e9 per token
    // Approximate n_layers ~ params^0.5 * 4, d_model ~ params^0.5 * 15
    const n = params() * 1e9;
    const nLayers = Math.round(4 * params() ** 0.5);
    const dModel = Math.round(n / (nLayers * 12288)); // approximation
    const kvBytes = 2 * nLayers * 2 * dModel * bytesPerParam();
    return kvBytes / 1e9; // GB per token
  };

  const kvCacheTotal = () => kvCachePerToken() * contextLen() * batchSize();

  // Total VRAM needed
  const totalVram = () => modelMemory() + kvCacheTotal() + modelMemory() * 0.1; // 10% overhead

  // Theoretical tokens/sec (memory-bound)
  // Formula: tok/s = bandwidth * efficiency / (2 * params * bytes_per_param)
  const tokPerSec = (gpu: GpuSpec) => {
    const memBound =
      ((gpu.bandwidth * 1e9 * efficiency()) / (2 * params() * 1e9 * bytesPerParam() * 1e9)) * 1e9;
    return Math.min(memBound, (gpu.fp16Tflops * 1e12 * efficiency()) / (2 * params() * 1e9));
  };

  // Filter GPUs that can fit the model
  const compatibleGpus = () => {
    const needed = totalVram();
    return GPU_DATABASE.filter((g) => g.vram >= needed)
      .filter((g) => maxBudget() === 0 || g.msrp <= maxBudget())
      .map((g) => ({ ...g, estTps: tokPerSec(g) }))
      .sort((a, b) => b.estTps - a.estTps);
  };

  const allCategories = () => {
    const gpus = compatibleGpus();
    return ['datacenter', 'workstation', 'consumer'].filter((cat) =>
      gpus.some((g) => g.category === cat),
    );
  };

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        GPU REQUIREMENT CALCULATOR
      </p>

      {/* Input controls */}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label
            class="font-mono text-[9px] uppercase tracking-wider block mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Parameters (B)
          </label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={params()}
            onInput={(e) => setParams(Math.max(0.5, Number(e.currentTarget.value) || 7))}
            class="font-mono text-xs px-2 py-1 border w-full"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label
            class="font-mono text-[9px] uppercase tracking-wider block mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Quantization
          </label>
          <select
            class="font-mono text-xs px-2 py-1 border w-full"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={quant()}
            onChange={(e) => setQuant(e.currentTarget.value)}
          >
            <For each={Object.keys(QUANTIZATION_BYTES)}>
              {(q) => <option value={q}>{q}</option>}
            </For>
          </select>
        </div>
        <div>
          <label
            class="font-mono text-[9px] uppercase tracking-wider block mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Serving Engine
          </label>
          <select
            class="font-mono text-xs px-2 py-1 border w-full"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            value={engine()}
            onChange={(e) => setEngine(e.currentTarget.value)}
          >
            <For each={Object.keys(ENGINE_EFFICIENCY)}>{(e) => <option value={e}>{e}</option>}</For>
          </select>
        </div>
        <div>
          <label
            class="font-mono text-[9px] uppercase tracking-wider block mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Batch Size
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={batchSize()}
            onInput={(e) => setBatchSize(Math.max(1, Number(e.currentTarget.value) || 1))}
            class="font-mono text-xs px-2 py-1 border w-full"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label
            class="font-mono text-[9px] uppercase tracking-wider block mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Context Length
          </label>
          <input
            type="number"
            min="512"
            step="512"
            value={contextLen()}
            onInput={(e) => setContextLen(Math.max(512, Number(e.currentTarget.value) || 4096))}
            class="font-mono text-xs px-2 py-1 border w-full"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label
            class="font-mono text-[9px] uppercase tracking-wider block mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Max Budget ($)
          </label>
          <input
            type="number"
            min="0"
            step="500"
            placeholder="0 = no limit"
            value={maxBudget() || ''}
            onInput={(e) => setMaxBudget(Math.max(0, Number(e.currentTarget.value) || 0))}
            class="font-mono text-xs px-2 py-1 border w-full"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Requirements summary */}
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="p-2 border text-center" style={{ 'border-color': 'var(--border)' }}>
          <p
            class="font-mono text-[8px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Model VRAM
          </p>
          <p class="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
            {formatBytes(modelMemory())}
          </p>
        </div>
        <div class="p-2 border text-center" style={{ 'border-color': 'var(--border)' }}>
          <p
            class="font-mono text-[8px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            KV Cache ({contextLen()} ctx x {batchSize()} batch)
          </p>
          <p class="font-mono text-sm font-bold" style={{ color: '#ffab40' }}>
            {formatBytes(kvCacheTotal())}
          </p>
        </div>
        <div class="p-2 border text-center" style={{ 'border-color': 'var(--border)' }}>
          <p
            class="font-mono text-[8px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Total Required
          </p>
          <p class="font-mono text-sm font-bold" style={{ color: '#ff5252' }}>
            {formatBytes(totalVram())}
          </p>
        </div>
      </div>

      {/* GPU recommendations */}
      <Show
        when={compatibleGpus().length > 0}
        fallback={
          <div
            class="p-4 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
          >
            <p class="font-mono text-xs" style={{ color: 'var(--accent-warm)' }}>
              No single GPU can fit this configuration ({formatBytes(totalVram())} needed). Consider
              multi-GPU tensor parallelism.
            </p>
          </div>
        }
      >
        <For each={allCategories()}>
          {(cat) => (
            <div class="mb-3">
              <p
                class="font-mono text-[9px] font-bold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                {CATEGORY_LABELS[cat]}
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <For each={compatibleGpus().filter((g) => g.category === cat)}>
                  {(gpu, idx) => (
                    <div
                      class="p-2 border"
                      style={{
                        'border-color':
                          idx() === 0 && cat === 'datacenter' ? 'var(--accent)' : 'var(--border)',
                        background:
                          idx() === 0 && cat === 'datacenter'
                            ? 'var(--bg-secondary)'
                            : 'var(--bg-card)',
                      }}
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span
                          class="font-mono text-[10px] font-bold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {gpu.name}
                        </span>
                        <Show when={idx() === 0 && cat === 'datacenter'}>
                          <span
                            class="font-mono text-[7px] font-bold px-1 py-0.5"
                            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
                          >
                            BEST
                          </span>
                        </Show>
                      </div>
                      <div
                        class="grid grid-cols-2 gap-1 font-mono text-[9px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span>
                          VRAM:{' '}
                          <span
                            style={{
                              color:
                                gpu.vram >= totalVram() * 1.3 ? '#4caf50' : 'var(--text-primary)',
                            }}
                          >
                            {gpu.vram}GB
                          </span>
                        </span>
                        <span>BW: {gpu.bandwidth}GB/s</span>
                        <span>FP16: {gpu.fp16Tflops}TF</span>
                        <span>TDP: {gpu.tdp}W</span>
                        <span>~{gpu.estTps.toFixed(0)} tok/s</span>
                        <span>{formatPrice(gpu.msrp)}</span>
                      </div>
                      <div
                        class="mt-1 font-mono text-[8px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Headroom: {formatBytes(gpu.vram - totalVram())} free
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </Show>

      <p class="font-mono text-[9px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        VRAM = weights + KV cache ({contextLen()} tokens x {batchSize()} batch) + 10% overhead |
        tok/s = min(bandwidth-bound, compute-bound) x {engine()} efficiency (
        {(efficiency() * 100).toFixed(0)}%) | Estimates exclude CUDA graphs and continuous batching
      </p>
    </div>
  );
}

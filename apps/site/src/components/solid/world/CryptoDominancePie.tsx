import { Show, createEffect, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';
import { getPlychart } from '../../../lib/plychart-loader';

const H = 280;

interface Slice {
  label: string;
  pct: number;
}

function volOf(t: {
  quoteVolume?: string | number;
  volume?: string | number;
  quote_volume?: number;
}): number {
  const v = t.quoteVolume ?? t.volume ?? t.quote_volume ?? 0;
  return Number(v) || 0;
}

export default function CryptoDominancePie() {
  const [slices, setSlices] = createSignal<Slice[] | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  const [wasmReady, setWasmReady] = createSignal(false);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/api/crypto-ticker`);
      if (!res.ok) throw new Error('API');
      const raw = await res.json();
      const items: Array<{
        symbol: string;
        quoteVolume?: string | number;
        volume?: string | number;
      }> = Array.isArray(raw) ? raw : raw.data || [];
      const withVol = items
        .map((t) => ({ symbol: t.symbol.toUpperCase(), vol: volOf(t) }))
        .filter((t) => t.vol > 0);
      withVol.sort((a, b) => b.vol - a.vol);
      const top = withVol.slice(0, 50);
      const total = top.reduce((s, t) => s + t.vol, 0) || 1;

      const btc = top.find((t) => t.symbol === 'BTCUSDT')?.vol ?? 0;
      const eth = top.find((t) => t.symbol === 'ETHUSDT')?.vol ?? 0;
      const alts = top.filter((t) => t.symbol !== 'BTCUSDT' && t.symbol !== 'ETHUSDT');
      const top10 = alts.slice(0, 10).reduce((s, t) => s + t.vol, 0);
      const rest = total - btc - eth - top10;

      const out: Slice[] = [
        { label: 'BTC', pct: (btc / total) * 100 },
        { label: 'ETH', pct: (eth / total) * 100 },
        { label: 'TOP10 ALT', pct: (top10 / total) * 100 },
        { label: 'REST', pct: (rest / total) * 100 },
      ].filter((s) => s.pct > 0.01);
      if (out.length === 0) throw new Error('No volume');
      setSlices(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function initWasm() {
    try {
      const plychart = await getPlychart();
      if (canvasRef) {
        const rect = canvasRef.getBoundingClientRect();
        plychart.create_chart('crypto-pie', Math.round(rect.width), H);
      }
      setWasmReady(true);
    } catch (e) {
      console.error('plychart init failed:', e);
    }
  }

  createEffect(() => {
    const sl = slices();
    const ready = wasmReady();
    if (!sl || !ready || !canvasRef) return;

    const data = sl.map((s) => [s.label, s.pct] as [string, number]);
    getPlychart().then((p) => {
      p.update_pie('crypto-pie', JSON.stringify(data), '');
    });
  });

  onMount(() => {
    initWasm();
    loadData();
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        CRYPTO DOMINANCE
      </p>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading crypto ticker...
        </p>
      </Show>
      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>
      <canvas ref={canvasRef} id="crypto-pie" class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        top 50 by 24h volume | BTC + ETH + top 10 alts + rest
      </p>
    </div>
  );
}

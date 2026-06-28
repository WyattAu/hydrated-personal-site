import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

const H = 280;

interface Slice {
  label: string;
  pct: number;
  color: string;
}

const PALETTE = ['#00e5ff', '#ff6b35', '#a855f7', '#22c55e', '#eab308', '#f97316', '#ec4899'];

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
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/crypto-ticker');
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
        { label: 'BTC', pct: (btc / total) * 100, color: PALETTE[0] },
        { label: 'ETH', pct: (eth / total) * 100, color: PALETTE[1] },
        { label: 'TOP10 ALT', pct: (top10 / total) * 100, color: PALETTE[2] },
        { label: 'REST', pct: (rest / total) * 100, color: PALETTE[3] },
      ].filter((s) => s.pct > 0.01);
      if (out.length === 0) throw new Error('No volume');
      setSlices(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const sl = slices();
    if (!canvas || !sl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, H);

    const cx = Math.min(w / 2 - 60, H / 2 + 20);
    const cy = H / 2;
    const radius = Math.max(40, Math.min(cx - 20, H / 2 - 30));
    const inner = radius * 0.55;

    let start = -Math.PI / 2;
    for (const s of sl) {
      const ang = (s.pct / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + ang, false);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      start += ang;
    }

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.textPrimary || '#fff';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MKT', cx, cy - 8);
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('DOMINANCE', cx, cy + 10);

    // Legend
    const lx = cx + radius + 20;
    let ly = cy - (sl.length * 18) / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const s of sl) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, ly - 5, 10, 10);
      ctx.fillStyle = colors.textPrimary || '#fff';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${s.label}`, lx + 16, ly);
      ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.6)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.pct.toFixed(1)}%`, lx + 110, ly);
      ctx.textAlign = 'left';
      ly += 18;
    }
  }

  onMount(() => loadData());
  createEffect(() => {
    const v = slices();
    if (v) draw();
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
      <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        top 50 by 24h volume | BTC + ETH + top 10 alts + rest
      </p>
    </div>
  );
}

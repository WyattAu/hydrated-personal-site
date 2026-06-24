import { Show, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

export default function CorrelationNetwork() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;
  let positions: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    label: string;
    vol: number;
    ret: number;
  }> = [];
  let edges: Array<{ a: number; b: number; weight: number; sign: number }> = [];
  let rafId = 0;

  async function loadData() {
    setLoading(true);
    try {
      const assets = [
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'BNBUSDT',
        'XRPUSDT',
        'ADAUSDT',
        'DOGEUSDT',
        'AVAXUSDT',
        'LINKUSDT',
        'DOTUSDT',
      ];
      const allReturns: number[][] = [];
      const lastRets: number[] = [];
      const vols: number[] = [];

      for (const sym of assets) {
        const res = await fetch(`/api/binance-klines?symbol=${sym}&interval=1d&limit=60`);
        if (!res.ok) continue;
        const klines = await res.json();
        const closes = klines.map((k: (string | number)[]) => Number.parseFloat(k[4] as string));
        if (closes.length < 20) continue;
        const rets = closes.slice(1).map((c: number, i: number) => Math.log(c / closes[i]));
        allReturns.push(rets);
        lastRets.push((closes[closes.length - 1] / closes[closes.length - 2] - 1) * 100);
        const mean = rets.reduce((a: number, b: number) => a + b, 0) / rets.length;
        vols.push(
          Math.sqrt(rets.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / rets.length) *
            Math.sqrt(252) *
            100,
        );
      }

      const n = allReturns.length;
      if (n < 3) throw new Error('insufficient data');

      // Compute correlation matrix
      const means = allReturns.map((r) => r.reduce((a, b) => a + b, 0) / r.length);
      const corr: number[][] = [];
      for (let i = 0; i < n; i++) {
        corr.push([]);
        for (let j = 0; j < n; j++) {
          if (i === j) {
            corr[i][j] = 1;
            continue;
          }
          let cov = 0;
          let vi = 0;
          let vj = 0;
          const len = Math.min(allReturns[i].length, allReturns[j].length);
          for (let t = 0; t < len; t++) {
            const di = allReturns[i][t] - means[i];
            const dj = allReturns[j][t] - means[j];
            cov += di * dj;
            vi += di * di;
            vj += dj * dj;
          }
          corr[i][j] = vi === 0 || vj === 0 ? 0 : cov / Math.sqrt(vi * vj);
        }
      }

      // Build edges for significant correlations
      edges = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const c = corr[i][j];
          if (Math.abs(c) > 0.3) {
            edges.push({ a: i, b: j, weight: Math.abs(c), sign: c >= 0 ? 1 : -1 });
          }
        }
      }

      // Initialize node positions
      const labels = [
        'BTC',
        'ETH',
        'SOL',
        'BNB',
        'XRP',
        'ADA',
        'DOGE',
        'AVAX',
        'LINK',
        'DOT',
      ].slice(0, n);
      positions = labels.map((label, i) => ({
        x: Math.cos((i / n) * Math.PI * 2) * 100,
        y: Math.sin((i / n) * Math.PI * 2) * 100,
        vx: 0,
        vy: 0,
        label,
        vol: vols[i] || 50,
        ret: lastRets[i] || 0,
      }));

      setLoading(false);
      animate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setLoading(false);
    }
  }

  function simulate() {
    const n = positions.length;
    // Repulsive force (all pairs)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const force = 2000 / (dist * dist);
        positions[i].vx += (dx / dist) * force;
        positions[i].vy += (dy / dist) * force;
      }
    }
    // Attractive force (edges)
    for (const e of edges) {
      const dx = positions[e.b].x - positions[e.a].x;
      const dy = positions[e.b].y - positions[e.a].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const force = e.sign > 0 ? dist * e.weight * 0.005 : -dist * e.weight * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      positions[e.a].vx += fx;
      positions[e.a].vy += fy;
      positions[e.b].vx -= fx;
      positions[e.b].vy -= fy;
    }
    // Update positions with damping
    for (const p of positions) {
      p.vx *= 0.85;
      p.vy *= 0.85;
      p.x += p.vx * 0.5;
      p.y += p.vy * 0.5;
    }
  }

  function animate() {
    const canvas = canvasRef;
    if (!canvas || positions.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = 340 * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = 340;
    const colors = getThemeColors();

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    simulate();

    const cx = w / 2;
    const cy = h / 2;

    // Edges
    for (const e of edges) {
      const a = positions[e.a];
      const b = positions[e.b];
      ctx.strokeStyle =
        e.sign > 0
          ? `rgba(0, 229, 255, ${e.weight * 0.6})`
          : `rgba(255, 64, 129, ${e.weight * 0.6})`;
      ctx.lineWidth = e.weight * 2;
      ctx.beginPath();
      ctx.moveTo(cx + a.x, cy + a.y);
      ctx.lineTo(cx + b.x, cy + b.y);
      ctx.stroke();
    }

    // Nodes
    for (const p of positions) {
      const px = cx + p.x;
      const py = cy + p.y;
      const radius = 6 + (p.vol / 100) * 10;
      ctx.fillStyle =
        p.ret >= 0 ? `${colors.accent || '#00e5ff'}` : `${colors.accentWarm || '#f0883e'}`;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.bgCard || '#0c0c0c';
      ctx.font = `bold ${Math.max(8, radius * 0.7)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, px, py);
    }

    rafId = requestAnimationFrame(animate);
  }

  onMount(() => {
    loadData();
    onMount(() => cancelAnimationFrame(rafId));
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          CORRELATION NETWORK
        </p>
        <Show when={!loading()}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {positions.length} assets | {edges.length} edges
          </span>
        </Show>
      </div>
      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Computing correlations...
        </p>
      </Show>
      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>
      <canvas ref={canvasRef} class="w-full" style={{ height: '340px' }} />
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        60d daily returns | green = positive corr | red = negative corr | size = volatility
      </p>
    </div>
  );
}

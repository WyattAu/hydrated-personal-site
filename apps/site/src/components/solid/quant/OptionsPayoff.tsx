import { createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';

interface Leg {
  type: 'call' | 'put';
  strike: number;
  premium: number;
  qty: number;
  action: 'buy' | 'sell';
}

export default function OptionsPayoff() {
  const [legs, setLegs] = createSignal<Leg[]>([
    { type: 'call', strike: 100000, premium: 5000, qty: 1, action: 'buy' },
  ]);
  const [spot, _setSpot] = createSignal(100000);
  const [_loading, _setLoading] = createSignal(false);
  let canvasRef: HTMLCanvasElement | undefined;

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 280;
    const colors = getThemeColors();
    const pad = { l: 60, r: 16, t: 16, b: 28 };
    const cW = w - pad.l - pad.r;
    const cH = h - pad.t - pad.b;

    ctx.fillStyle = colors.bgCard || '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    const s = spot();
    const allLegs = legs();
    const spotMin = s * 0.5;
    const spotMax = s * 1.5;
    const steps = 200;
    const points: Array<{ x: number; y: number }> = [];

    let maxY = 0;
    let minY = 0;
    for (let i = 0; i <= steps; i++) {
      const price = spotMin + (spotMax - spotMin) * (i / steps);
      let pnl = 0;
      for (const leg of allLegs) {
        const intrinsic =
          leg.type === 'call' ? Math.max(0, price - leg.strike) : Math.max(0, leg.strike - price);
        const cost = leg.premium * leg.qty;
        pnl += (leg.action === 'buy' ? 1 : -1) * (intrinsic * leg.qty - cost);
      }
      points.push({ x: price, y: pnl });
      maxY = Math.max(maxY, pnl);
      minY = Math.min(minY, pnl);
    }

    const range = maxY - minY || 1;
    const padding = range * 0.1;
    const toX = (v: number) => pad.l + ((v - spotMin) / (spotMax - spotMin)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - minY + padding) / (range + 2 * padding)) * cH;

    // Zero line
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.1)';
    const zeroY = toY(0);
    ctx.beginPath();
    ctx.moveTo(pad.l, zeroY);
    ctx.lineTo(w - pad.r, zeroY);
    ctx.stroke();

    // Profit zone (green fill above zero)
    ctx.fillStyle = 'rgba(76, 175, 80, 0.08)';
    ctx.fillRect(pad.l, pad.t, cW, zeroY - pad.t);
    // Loss zone (red fill below zero)
    ctx.fillStyle = 'rgba(255, 64, 129, 0.08)';
    ctx.fillRect(pad.l, zeroY, cW, pad.t + cH - zeroY);

    // Payoff curve
    ctx.strokeStyle = colors.accent || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y));
    });
    ctx.stroke();

    // Current spot line
    const spotX = toX(s);
    ctx.strokeStyle = colors.accentWarm || '#f0883e';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(spotX, pad.t);
    ctx.lineTo(spotX, pad.t + cH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid + labels
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.04)';
    ctx.fillStyle = colors.canvasText || 'rgba(255,255,255,0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      const val = maxY + padding - ((range + 2 * padding) * i) / 4;
      ctx.textAlign = 'right';
      ctx.fillText(`${val >= 0 ? '+' : ''}${formatNum(val)}`, pad.l - 5, y + 3);
    }
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const price = spotMin + ((spotMax - spotMin) * i) / 4;
      ctx.fillText(formatNum(price), pad.l + (cW * i) / 4, h - 8);
    }
  }

  onMount(() => {
    setTimeout(draw, 10);
  });

  return (
    <div>
      <p class="label mb-3" style={{ color: 'var(--accent)' }}>
        OPTIONS PAYOFF DIAGRAM
      </p>
      <canvas ref={canvasRef} class="w-full" style={{ height: '280px' }} />
      <div class="flex flex-wrap gap-2 mt-3">
        {legs().map((leg, i) => (
          <span
            class="font-mono text-[10px] px-2 py-1 border"
            style={{ 'border-color': 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {leg.action} {leg.qty}x {leg.type} K={formatNum(leg.strike)} @ {formatNum(leg.premium)}
            <button
              type="button"
              class="ml-2 opacity-50 hover:opacity-100"
              onClick={() => {
                setLegs(legs().filter((_, idx) => idx !== i));
                setTimeout(draw, 10);
              }}
            >
              x
            </button>
          </span>
        ))}
        <button
          type="button"
          class="font-mono text-[10px] px-2 py-1 border"
          style={{ 'border-color': 'var(--accent)', color: 'var(--accent)' }}
          onClick={() => {
            const lastLeg = legs()[legs().length - 1];
            setLegs([
              ...legs(),
              {
                type: 'put',
                strike: lastLeg?.strike || spot(),
                premium: 3000,
                qty: 1,
                action: 'buy',
              },
            ]);
            setTimeout(draw, 10);
          }}
        >
          + ADD LEG
        </button>
      </div>
      <p class="font-mono text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
        Green = profit zone | Red = loss zone | Orange line = current spot
      </p>
    </div>
  );
}

function formatNum(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  return v.toFixed(1);
}

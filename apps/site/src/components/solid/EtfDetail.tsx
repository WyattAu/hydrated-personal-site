import { For, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { EtfEntry } from '../../lib/types';

interface EtfDetailProps {
  etf: EtfEntry;
}

const CHART_COLORS = [
  '#00e5ff',
  '#69f0ae',
  '#b388ff',
  '#ff6b35',
  '#ff4081',
  '#ffd740',
  '#64ffda',
  '#ff8a80',
  '#82b1ff',
  '#ccff90',
  '#ea80fc',
  '#84ffff',
  '#f4ff81',
  '#ff9e80',
  '#a7ffeb',
];

function drawBarChart(canvas: HTMLCanvasElement, data: Record<string, number>) {
  const dpr = window.devicePixelRatio || 1;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 280;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const bg =
    getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#0c0c0c';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const padLeft = 130;
  const padRight = 40;
  const padTop = 12;
  const padBottom = 12;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const barH = Math.min(22, chartH / entries.length - 4);
  const maxVal = Math.max(...entries.map((e) => e[1]), 1);

  entries.forEach(([label, val], i) => {
    const y = padTop + i * (chartH / entries.length) + (chartH / entries.length - barH) / 2;
    const barW = (val / maxVal) * chartW;

    ctx.fillStyle = `${CHART_COLORS[i % CHART_COLORS.length]}33`;
    ctx.fillRect(padLeft, y, barW, barH);
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(padLeft, y, barW, barH);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, padLeft - 8, y + barH / 2 + 3);

    ctx.textAlign = 'left';
    ctx.fillText(`${val.toFixed(1)}%`, padLeft + barW + 6, y + barH / 2 + 3);
  });
}

function drawDonutChart(canvas: HTMLCanvasElement, data: Record<string, number>) {
  const dpr = window.devicePixelRatio || 1;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 280;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const bg =
    getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#0c0c0c';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const total = entries.reduce((s, e) => s + e[1], 0);
  if (total === 0) return;

  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 20;
  const innerR = outerR * 0.55;
  let startAngle = -Math.PI / 2;

  entries.forEach(([_label, val], i) => {
    const sliceAngle = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#fff';
  ctx.fillStyle = textColor;
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${entries.length}`, cx, cy - 8);
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('REGIONS', cx, cy + 8);
}

export default function EtfDetail(props: EtfDetailProps) {
  let sectorCanvas: HTMLCanvasElement | undefined;
  let regionCanvas: HTMLCanvasElement | undefined;

  const [price, setPrice] = createSignal((Math.random() * 400 + 50).toFixed(2));
  const [change, setChange] = createSignal(((Math.random() - 0.45) * 6).toFixed(2));

  createEffect(() => {
    props.etf;
    setPrice((Math.random() * 400 + 50).toFixed(2));
    setChange(((Math.random() - 0.45) * 6).toFixed(2));
    queueMicrotask(() => {
      if (sectorCanvas) drawBarChart(sectorCanvas, props.etf.sector_allocation);
      if (regionCanvas) drawDonutChart(regionCanvas, props.etf.region_allocation);
    });
  });

  onMount(() => {
    if (sectorCanvas) drawBarChart(sectorCanvas, props.etf.sector_allocation);
    if (regionCanvas) drawDonutChart(regionCanvas, props.etf.region_allocation);

    const observer = new ResizeObserver(() => {
      if (sectorCanvas) drawBarChart(sectorCanvas, props.etf.sector_allocation);
      if (regionCanvas) drawDonutChart(regionCanvas, props.etf.region_allocation);
    });
    if (sectorCanvas) observer.observe(sectorCanvas);
    if (regionCanvas) observer.observe(regionCanvas);
    onCleanup(() => observer.disconnect());
  });

  const accentColor = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#00e5ff';
  };

  return (
    <div
      class="border p-6"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      {/* Header */}
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-2xl font-bold font-mono" style={{ color: accentColor() }}>
              {props.etf.ticker}
            </h2>
            <span
              class="font-mono text-xs px-2 py-0.5"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {props.etf.category}
            </span>
          </div>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {props.etf.name}
          </p>
        </div>
        <div class="mt-3 md:mt-0 flex items-baseline gap-3">
          <span class="text-3xl font-mono font-bold">${price()}</span>
          <span
            class="font-mono text-sm font-bold"
            style={{
              color: Number.parseFloat(change()) >= 0 ? '#69f0ae' : '#f44336',
            }}
          >
            {Number.parseFloat(change()) >= 0 ? '+' : ''}
            {change()}%
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sector Allocation */}
        <div>
          <p class="label mb-3" style={{ color: accentColor() }}>
            SECTOR ALLOCATION
          </p>
          <div
            class="border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <canvas
              ref={sectorCanvas}
              class="w-full"
              style={{ height: '280px' }}
              role="img"
              aria-label={`${props.etf.ticker} sector allocation chart`}
            />
          </div>
        </div>

        {/* Region Allocation */}
        <div>
          <p class="label mb-3" style={{ color: accentColor() }}>
            REGION ALLOCATION
          </p>
          <div
            class="border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <canvas
              ref={regionCanvas}
              class="w-full"
              style={{ height: '280px' }}
              role="img"
              aria-label={`${props.etf.ticker} region allocation donut chart`}
            />
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      <div>
        <p class="label mb-3" style={{ color: accentColor() }}>
          TOP 10 HOLDINGS
        </p>
        <div
          class="border overflow-hidden"
          style={{
            'border-color': 'var(--border)',
          }}
        >
          <table class="w-full text-sm font-mono">
            <thead>
              <tr
                class="border-b text-left"
                style={{
                  'border-color': 'var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <th class="px-4 py-2 text-xs tracking-wider">TICKER</th>
                <th class="px-4 py-2 text-xs tracking-wider">NAME</th>
                <th class="px-4 py-2 text-xs tracking-wider text-right">WEIGHT</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.etf.top_holdings}>
                {(h, i) => (
                  <tr
                    class="border-b transition-colors"
                    style={{
                      'border-color': 'var(--border)',
                      background: i() % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <td class="px-4 py-2 font-bold" style={{ color: accentColor() }}>
                      {h.ticker}
                    </td>
                    <td class="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {h.name}
                    </td>
                    <td class="px-4 py-2 text-right font-bold">{h.weight.toFixed(1)}%</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

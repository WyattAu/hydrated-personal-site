export interface ChartTheme {
  bgCard: string;
  bgCanvas: string;
  text: string;
  textMuted: string;
  grid: string;
  primary: string;
  secondary: string;
  positive: string;
  negative: string;
}

export function getChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  return {
    bgCard: style.getPropertyValue('--z-bg-card') || '#1a1b26',
    bgCanvas: style.getPropertyValue('--z-bg-canvas') || '#16161e',
    text: style.getPropertyValue('--z-text') || '#c0caf5',
    textMuted: style.getPropertyValue('--z-text-muted') || '#565f89',
    grid: style.getPropertyValue('--z-grid') || '#292e42',
    primary: style.getPropertyValue('--z-primary') || '#7aa2f7',
    secondary: style.getPropertyValue('--z-secondary') || '#bb9af7',
    positive: style.getPropertyValue('--z-positive') || '#9ece6a',
    negative: style.getPropertyValue('--z-negative') || '#f7768e',
  };
}

export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  theme?: ChartTheme,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');
  ctx.scale(dpr, dpr);
  if (theme) {
    ctx.fillStyle = theme.bgCard;
    ctx.fillRect(0, 0, width, height);
  }
  return ctx;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: ChartTheme,
  padding = { top: 20, right: 20, bottom: 30, left: 50 },
): void {
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 0.5;
  const rows = 5;
  for (let i = 0; i <= rows; i++) {
    const y = padding.top + ((h - padding.top - padding.bottom) / rows) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string,
  lineWidth = 1.5,
): void {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

export function drawArea(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  baseline: number,
  color: string,
): void {
  if (points.length < 2) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, baseline);
  for (const p of points) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(points[points.length - 1].x, baseline);
  ctx.closePath();
  ctx.fill();
}

export function formatNumber(n: number, decimals = 2): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(decimals);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { getThemeColors } from '../../../lib/theme-colors';
import { recordFetch } from '../StaleIndicator';

interface CategoryScore {
  category: string;
  issues: number;
  warnings: number;
  passed: number;
}

interface AuditSummary {
  pagesCrawled: number;
  totalIssues: number;
  totalWarnings: number;
  totalPassed: number;
  categories: CategoryScore[];
  overallScore: number;
  lastRun: string;
}

const _CATEGORIES = ['SEO', 'Security', 'Accessibility', 'Performance', 'Content', 'Links'];
const CATEGORY_COLORS: Record<string, string> = {
  SEO: '#00e5ff',
  Security: '#f44336',
  Accessibility: '#a855f7',
  Performance: '#ff6b35',
  Content: '#22c55e',
  Links: '#eab308',
};

const H = 200;

function scoreColor(score: number): string {
  if (score >= 80) return '#69f0ae';
  if (score >= 50) return '#eab308';
  return '#f44336';
}

export default function SeoAuditReport() {
  const [data, setData] = createSignal<AuditSummary | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/data/seo-audit.json');
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setData(json);
      recordFetch('seo-audit');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }

  function draw() {
    const canvas = canvasRef;
    const d = data();
    if (!canvas || !d) return;
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

    const cats = d.categories;
    if (cats.length === 0) return;

    const padLeft = 40;
    const padRight = 20;
    const padTop = 10;
    const padBottom = 30;
    const chartW = w - padLeft - padRight;
    const chartH = H - padTop - padBottom;
    const barW = Math.min(50, (chartW / cats.length) * 0.6);
    const gap = (chartW - barW * cats.length) / (cats.length + 1);

    const maxVal = Math.max(...cats.map((c) => c.issues + c.warnings + c.passed), 1);

    // Grid lines
    ctx.strokeStyle = colors.canvasGrid || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }

    // Bars
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      const x = padLeft + gap + i * (barW + gap);
      const _total = c.issues + c.warnings + c.passed;

      // Stacked bar: passed (bottom) -> warnings -> issues (top)
      const passedH = (c.passed / maxVal) * chartH;
      const warningsH = (c.warnings / maxVal) * chartH;
      const issuesH = (c.issues / maxVal) * chartH;

      let y = padTop + chartH;

      // Passed
      ctx.fillStyle = CATEGORY_COLORS[c.category] || '#00e5ff';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x, y - passedH, barW, passedH);
      y -= passedH;

      // Warnings
      ctx.fillStyle = '#eab308';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x, y - warningsH, barW, warningsH);
      y -= warningsH;

      // Issues
      ctx.fillStyle = '#f44336';
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y - issuesH, barW, issuesH);
      ctx.globalAlpha = 1;

      // Category label
      ctx.fillStyle = colors.textSecondary || '#888';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.category.slice(0, 6).toUpperCase(), x + barW / 2, padTop + chartH + 16);

      // Issue count on top
      if (c.issues > 0) {
        ctx.fillStyle = CATEGORY_COLORS[c.category] || '#00e5ff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(
          String(c.issues),
          x + barW / 2,
          padTop + chartH - issuesH - warningsH - passedH - 4,
        );
      }
    }

    // Y-axis labels
    ctx.fillStyle = colors.textSecondary || '#888';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxVal / 4) * (4 - i));
      const y = padTop + (chartH / 4) * i;
      ctx.fillText(String(val), padLeft - 6, y + 3);
    }

    // Legend
    const legendY = H - 4;
    const legendItems = [
      { label: 'Issues', color: '#f44336' },
      { label: 'Warnings', color: '#eab308' },
      { label: 'Passed', color: CATEGORY_COLORS.SEO || '#00e5ff' },
    ];
    let lx = padLeft;
    ctx.textAlign = 'left';
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, legendY - 6, 8, 8);
      ctx.fillStyle = colors.textSecondary || '#888';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(item.label, lx + 12, legendY + 1);
      lx += ctx.measureText(item.label).width + 24;
    }
  }

  onMount(() => loadData());
  createEffect(() => {
    const d = data();
    if (d) requestAnimationFrame(draw);
  });

  return (
    <div
      class="border p-4"
      style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          SITE AUDIT SCORE
        </p>
        <Show when={data()}>
          <span class="font-mono text-xs" style={{ color: scoreColor(data()?.overallScore ?? 0) }}>
            {data()?.overallScore ?? 0}/100
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading audit data...
        </p>
      </Show>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <Show when={data()}>
        <div class="grid grid-cols-3 gap-2 mb-3">
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              PAGES
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {data()?.pagesCrawled ?? 0}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              ISSUES
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: '#f44336' }}>
              {data()?.totalIssues ?? 0}
            </p>
          </div>
          <div
            class="p-2 border text-center"
            style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <p class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
              WARNINGS
            </p>
            <p class="font-mono text-lg font-bold" style={{ color: '#eab308' }}>
              {data()?.totalWarnings ?? 0}
            </p>
          </div>
        </div>

        <canvas ref={canvasRef} class="w-full" style={{ height: `${H}px` }} />

        <div class="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          <For each={data()?.categories ?? []}>
            {(cat) => (
              <div
                class="p-2 border flex items-center justify-between"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <span
                  class="font-mono text-[9px] font-bold"
                  style={{ color: CATEGORY_COLORS[cat.category] || 'var(--text-primary)' }}
                >
                  {cat.category.toUpperCase()}
                </span>
                <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                  {cat.passed}✓ {cat.warnings}⚠ {cat.issues}✗
                </span>
              </div>
            )}
          </For>
        </div>

        <p class="font-mono text-[10px] mt-3" style={{ color: 'var(--text-secondary)' }}>
          Last scan: {data()?.lastRun ?? 'N/A'}
        </p>
      </Show>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

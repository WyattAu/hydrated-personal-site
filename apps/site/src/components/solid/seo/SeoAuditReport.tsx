import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { renderPlychart, usePlychartAuto } from '../../../lib/plychart-render';
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

  function renderChart() {
    const d = data();
    if (!d) return;
    const matrix = d.categories.map((c) => [c.issues, c.warnings, c.passed]);
    const labels = d.categories.map((c) => c.category);
    renderPlychart(
      'seo-audit',
      'update_stacked_bar',
      JSON.stringify(matrix),
      JSON.stringify(labels),
      '',
    );
  }

  createEffect(() => {
    data();
    renderChart();
  });

  usePlychartAuto(() => 'seo-audit', renderChart);

  onMount(() => {
    loadData();
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

        <canvas id="seo-audit" class="w-full" style={{ height: `${H}px` }} />

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

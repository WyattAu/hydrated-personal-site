import { For, Show, createSignal, onMount } from 'solid-js';
import { recordFetch } from '../StaleIndicator';

interface Recommendation {
  code: string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  count?: number;
}

interface AuditData {
  recommendations: Recommendation[];
}

function severityBadgeColor(severity: string): string {
  if (severity === 'error') return '#f44336';
  if (severity === 'warning') return '#eab308';
  return '#00e5ff';
}

function severityLabel(severity: string): string {
  if (severity === 'error') return 'CRITICAL';
  if (severity === 'warning') return 'IMPORTANT';
  return 'INFO';
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    SEO: '#00e5ff',
    Security: '#f44336',
    Accessibility: '#a855f7',
    Performance: '#ff6b35',
    Content: '#22c55e',
    Links: '#eab308',
  };
  return map[category] || 'var(--text-secondary)';
}

export default function SeoRecommendations() {
  const [data, setData] = createSignal<AuditData | null>(null);
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
      setErr(e instanceof Error ? e.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }

  const criticals = () => data()?.recommendations.filter((r) => r.severity === 'error') ?? [];
  const warnings = () => data()?.recommendations.filter((r) => r.severity === 'warning') ?? [];
  const infos = () => data()?.recommendations.filter((r) => r.severity === 'info') ?? [];

  onMount(() => loadData());

  return (
    <div
      class="border p-4"
      style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          SEO RECOMMENDATIONS
        </p>
        <Show when={data()}>
          <span class="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data()?.recommendations.length ?? 0} findings
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading recommendations...
        </p>
      </Show>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <Show when={data()}>
        {/* Critical */}
        <Show when={criticals().length > 0}>
          <div class="mb-4">
            <p
              class="font-mono text-[9px] font-bold tracking-wider mb-2"
              style={{ color: '#f44336' }}
            >
              CRITICAL ({criticals().length})
            </p>
            <For each={criticals()}>
              {(rec) => (
                <div
                  class="p-3 border mb-2"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="font-mono text-[9px] font-bold px-1.5 py-0.5 border"
                      style={{
                        color: severityBadgeColor(rec.severity),
                        'border-color': severityBadgeColor(rec.severity),
                      }}
                    >
                      {severityLabel(rec.severity)}
                    </span>
                    <span
                      class="font-mono text-[9px] font-bold"
                      style={{ color: categoryColor(rec.category) }}
                    >
                      {rec.category.toUpperCase()}
                    </span>
                    <Show when={rec.count !== undefined && rec.count > 1}>
                      <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                        ×{rec.count}
                      </span>
                    </Show>
                  </div>
                  <p
                    class="font-mono text-xs font-bold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {rec.code}: {rec.title}
                  </p>
                  <p
                    class="font-mono text-[10px]"
                    style={{ color: 'var(--text-secondary)', 'line-height': '1.4' }}
                  >
                    {rec.description}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Warnings */}
        <Show when={warnings().length > 0}>
          <div class="mb-4">
            <p
              class="font-mono text-[9px] font-bold tracking-wider mb-2"
              style={{ color: '#eab308' }}
            >
              IMPORTANT ({warnings().length})
            </p>
            <For each={warnings()}>
              {(rec) => (
                <div
                  class="p-3 border mb-2"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="font-mono text-[9px] font-bold px-1.5 py-0.5 border"
                      style={{
                        color: severityBadgeColor(rec.severity),
                        'border-color': severityBadgeColor(rec.severity),
                      }}
                    >
                      {severityLabel(rec.severity)}
                    </span>
                    <span
                      class="font-mono text-[9px] font-bold"
                      style={{ color: categoryColor(rec.category) }}
                    >
                      {rec.category.toUpperCase()}
                    </span>
                    <Show when={rec.count !== undefined && rec.count > 1}>
                      <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                        ×{rec.count}
                      </span>
                    </Show>
                  </div>
                  <p
                    class="font-mono text-xs font-bold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {rec.code}: {rec.title}
                  </p>
                  <p
                    class="font-mono text-[10px]"
                    style={{ color: 'var(--text-secondary)', 'line-height': '1.4' }}
                  >
                    {rec.description}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Info */}
        <Show when={infos().length > 0}>
          <div class="mb-4">
            <p
              class="font-mono text-[9px] font-bold tracking-wider mb-2"
              style={{ color: 'var(--accent)' }}
            >
              INFO ({infos().length})
            </p>
            <For each={infos()}>
              {(rec) => (
                <div
                  class="p-3 border mb-2"
                  style={{ 'border-color': 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="font-mono text-[9px] font-bold px-1.5 py-0.5 border"
                      style={{
                        color: severityBadgeColor(rec.severity),
                        'border-color': severityBadgeColor(rec.severity),
                      }}
                    >
                      {severityLabel(rec.severity)}
                    </span>
                    <span
                      class="font-mono text-[9px] font-bold"
                      style={{ color: categoryColor(rec.category) }}
                    >
                      {rec.category.toUpperCase()}
                    </span>
                    <Show when={rec.count !== undefined && rec.count > 1}>
                      <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                        ×{rec.count}
                      </span>
                    </Show>
                  </div>
                  <p
                    class="font-mono text-xs font-bold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {rec.code}: {rec.title}
                  </p>
                  <p
                    class="font-mono text-[10px]"
                    style={{ color: 'var(--text-secondary)', 'line-height': '1.4' }}
                  >
                    {rec.description}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={criticals().length === 0 && warnings().length === 0 && infos().length === 0}>
          <div class="py-8 text-center">
            <p class="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              No recommendations — all checks passed
            </p>
          </div>
        </Show>
      </Show>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

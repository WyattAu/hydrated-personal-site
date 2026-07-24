import { For, Show, createSignal, onMount } from 'solid-js';
import { apiBase } from '../../../lib/api-base';

interface Paper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  link: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'cs.AI': '#00e5ff',
  'cs.LG': '#69f0ae',
  'cs.CL': '#ffab40',
  'cs.CV': '#ff4081',
  'cs.NE': '#7c4dff',
  'stat.ML': '#fff176',
};

export default function ArxivPapers() {
  const [papers, setPapers] = createSignal<Paper[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [expanded, setExpanded] = createSignal<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/arxiv-papers`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setPapers(data);
      } else {
        throw new Error('No papers');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  onMount(() => loadData());

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function catColor(cat: string): string {
    return CATEGORY_COLORS[cat] || '#888';
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="label" style={{ color: 'var(--accent)' }}>
          LATEST ARXIV PAPERS
        </p>
        <Show when={!loading() && papers().length > 0}>
          <span class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {papers().length} papers | updated hourly
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Fetching latest AI/ML papers from ArXiv...
        </p>
      </Show>

      <Show when={error()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {error()}
        </p>
      </Show>

      <Show when={!loading() && papers().length > 0}>
        <div class="space-y-2">
          <For each={papers().slice(0, 20)}>
            {(paper) => (
              <div
                class="p-3 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="font-mono text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5"
                        style={{
                          background: `${catColor(paper.category)}20`,
                          color: catColor(paper.category),
                          border: `1px solid ${catColor(paper.category)}40`,
                        }}
                      >
                        {paper.category}
                      </span>
                      <span class="font-mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(paper.published)}
                      </span>
                    </div>
                    <a
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-mono text-xs font-bold block transition-opacity hover:opacity-80"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {paper.title}
                    </a>
                    <p
                      class="font-mono text-[10px] mt-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {paper.authors.join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="font-mono text-[9px] px-2 py-1 border shrink-0"
                    style={{
                      'border-color': expanded() === paper.id ? 'var(--accent)' : 'var(--border)',
                      color: expanded() === paper.id ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                    onClick={() => setExpanded(expanded() === paper.id ? null : paper.id)}
                  >
                    {expanded() === paper.id ? 'HIDE' : 'ABSTRACT'}
                  </button>
                </div>
                <Show when={expanded() === paper.id}>
                  <p
                    class="font-mono text-[10px] mt-2 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {paper.summary}
                  </p>
                  <a
                    href={paper.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-mono text-[9px] mt-2 inline-block"
                    style={{ color: 'var(--accent)' }}
                  >
                    Read full paper →
                  </a>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

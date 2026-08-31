import { For, Show, createSignal } from 'solid-js';

interface SeoResult {
  url: string;
  title: string;
  title_length: number;
  description: string;
  description_length: number;
  canonical: string | null;
  has_lang: boolean;
  lang: string;
  heading_counts: number[];
  h1_count: number;
  h2_count: number;
  image_count: number;
  images_missing_alt: number;
  internal_links: number;
  external_links: number;
  word_count: number;
  readability_score: number;
  has_og_title: boolean;
  has_og_description: boolean;
  has_og_image: boolean;
  has_twitter_card: boolean;
  has_structured_data: boolean;
  issues: { severity: string; code: string; title: string; description: string }[];
  score: number;
}

interface Issue {
  severity: string;
  code: string;
  title: string;
  description: string;
}

export default function SeoAnalyzer() {
  const [url, setUrl] = createSignal('https://wyattau.com');
  const [result, setResult] = createSignal<SeoResult | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [expandedIssue, setExpandedIssue] = createSignal<number | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Fetch the page
      const res = await fetch(url());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Load WASM and analyze
      const _w = '/wasm/seo_wasm.js';
      const mod = await import(_w);
      await mod.default();
      const json = mod.analyze_seo(html, url());
      const parsed: SeoResult = JSON.parse(json);
      setResult(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  }

  function severityColor(sev: string): string {
    if (sev === 'error') return '#ff5252';
    if (sev === 'warning') return '#ffab40';
    return 'var(--text-secondary)';
  }

  function severityBg(sev: string): string {
    if (sev === 'error') return 'rgba(255,82,82,0.1)';
    if (sev === 'warning') return 'rgba(255,171,64,0.1)';
    return 'transparent';
  }

  return (
    <div>
      {/* Input */}
      <div class="flex gap-2 mb-6">
        <input
          type="url"
          placeholder="https://example.com"
          class="flex-1 px-3 py-2 font-mono text-xs border"
          style={{
            'border-color': 'var(--accent)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
          }}
          value={url()}
          onInput={(e) => setUrl(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') analyze();
          }}
        />
        <button
          type="button"
          class="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider border"
          style={{
            'border-color': 'var(--accent)',
            background: 'var(--accent)',
            color: 'var(--bg-primary)',
          }}
          onClick={analyze}
          disabled={loading()}
        >
          {loading() ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      <Show when={error()}>
        <p
          class="font-mono text-xs p-3 mb-4"
          style={{
            color: 'var(--accent-warm)',
            background: 'rgba(255,82,82,0.1)',
            border: '1px solid var(--border)',
          }}
        >
          {error()}
        </p>
      </Show>

      <Show when={result()}>
        {(r) => (
          <div>
            {/* Score */}
            <div
              class="p-4 border mb-4 text-center"
              style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
            >
              <p
                class="font-mono text-4xl font-bold"
                style={{
                  color: r().score >= 80 ? '#4caf50' : r().score >= 50 ? '#ffab40' : '#ff5252',
                }}
              >
                {r().score}
              </p>
              <p
                class="font-mono text-[10px] uppercase tracking-wider mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                SEO Score (0-100)
              </p>
            </div>

            {/* Key Metrics */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div
                class="p-3 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Title
                </p>
                <p
                  class="font-mono text-sm"
                  style={{ color: r().title_length >= 30 ? '#4caf50' : '#ff5252' }}
                >
                  {r().title_length} chars
                </p>
              </div>
              <div
                class="p-3 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Description
                </p>
                <p
                  class="font-mono text-sm"
                  style={{ color: r().description_length >= 120 ? '#4caf50' : '#ff5252' }}
                >
                  {r().description_length} chars
                </p>
              </div>
              <div
                class="p-3 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Words
                </p>
                <p
                  class="font-mono text-sm"
                  style={{ color: r().word_count >= 300 ? '#4caf50' : '#ffab40' }}
                >
                  {r().word_count}
                </p>
              </div>
              <div
                class="p-3 border"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[9px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Links
                </p>
                <p class="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                  {r().internal_links} in / {r().external_links} ext
                </p>
              </div>
            </div>

            {/* Meta Tags */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div
                class="p-2 border text-center"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[8px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Lang
                </p>
                <p
                  class="font-mono text-sm font-bold"
                  style={{ color: r().has_lang ? '#4caf50' : '#ff5252' }}
                >
                  {r().has_lang ? r().lang || 'Yes' : 'MISSING'}
                </p>
              </div>
              <div
                class="p-2 border text-center"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[8px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  H1 / H2
                </p>
                <p
                  class="font-mono text-sm font-bold"
                  style={{ color: r().h1_count === 1 ? '#4caf50' : '#ff5252' }}
                >
                  {r().h1_count} / {r().h2_count}
                </p>
              </div>
              <div
                class="p-2 border text-center"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[8px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  OG Tags
                </p>
                <p
                  class="font-mono text-sm font-bold"
                  style={{ color: r().has_og_title && r().has_og_image ? '#4caf50' : '#ffab40' }}
                >
                  {r().has_og_title ? 'Yes' : 'No'} / {r().has_og_image ? 'Yes' : 'No'}
                </p>
              </div>
              <div
                class="p-2 border text-center"
                style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p
                  class="font-mono text-[8px] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Images
                </p>
                <p
                  class="font-mono text-sm font-bold"
                  style={{ color: r().images_missing_alt > 0 ? '#ff5252' : '#4caf50' }}
                >
                  {r().image_count} ({r().images_missing_alt} missing alt)
                </p>
              </div>
            </div>

            {/* Issues */}
            <Show when={r().issues.length > 0}>
              <div class="mt-4">
                <p
                  class="font-mono text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--accent)' }}
                >
                  Issues ({r().issues.filter((i: Issue) => i.severity === 'error').length} errors,{' '}
                  {r().issues.filter((i: Issue) => i.severity === 'warning').length} warnings)
                </p>
                <For each={r().issues}>
                  {(issue, idx) => (
                    <button
                      type="button"
                      class="p-3 mb-1 border cursor-pointer transition-colors w-full text-left"
                      style={{
                        'border-color': severityColor(issue.severity),
                        background: severityBg(issue.severity),
                      }}
                      onClick={() => setExpandedIssue(expandedIssue() === idx() ? null : idx())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setExpandedIssue(expandedIssue() === idx() ? null : idx());
                        }
                      }}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span
                            class="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5"
                            style={{
                              background: severityColor(issue.severity),
                              color: '#fff',
                            }}
                          >
                            {issue.severity}
                          </span>
                          <span
                            class="font-mono text-xs font-bold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {issue.title}
                          </span>
                        </div>
                        <span
                          class="font-mono text-[9px]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {issue.code}
                        </span>
                      </div>
                      <Show when={expandedIssue() === idx()}>
                        <p
                          class="font-mono text-[10px] mt-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {issue.description}
                        </p>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}

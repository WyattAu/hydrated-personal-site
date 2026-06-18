import { For, createSignal, onMount } from 'solid-js';
import type { GitHubRepo, HNStory } from '../../lib/types';
import { useLlmData } from '../../lib/llm-data';

function useGithubTrending() {
  const [repos, setRepos] = createSignal<GitHubRepo[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch('/api/github-trending');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const items = raw?.items ?? (Array.isArray(raw) ? raw : []);
      setRepos(items.slice(0, 15));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    setLoading(false);
  });

  return { repos, loading, error };
}

function useHackerNews() {
  const [stories, setStories] = createSignal<HNStory[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch('/api/hacker-news');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStories(data.slice(0, 15));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    setLoading(false);
  });

  return { stories, loading, error };
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PanelSkeleton() {
  return (
    <div class="p-4 border" style="border-color: var(--border); background: var(--bg-card);">
      <div
        class="h-3 w-24 mb-4"
        style="background: var(--border); animation: pulse 1.5s infinite;"
      />
      <For each={[1, 2, 3, 4, 5]}>
        {() => (
          <div class="mb-3">
            <div
              class="h-2 w-full mb-1"
              style="background: var(--border); animation: pulse 1.5s infinite;"
            />
            <div
              class="h-2 w-2/3"
              style="background: var(--border); animation: pulse 1.5s infinite;"
            />
          </div>
        )}
      </For>
    </div>
  );
}

function PanelHeader(props: { title: string; count?: number }) {
  return (
    <div class="flex items-center justify-between mb-3">
      <p class="label" style="color: var(--accent);">
        {props.title}
      </p>
      {props.count !== undefined && (
        <span class="code-text" style="color: var(--text-secondary);">
          {props.count} items
        </span>
      )}
    </div>
  );
}

function LlmPanel() {
  const { data, loading } = useLlmData();

  return (
    <div class="p-4 border h-full" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
      ) : (
        <>
          <PanelHeader title="LLM BENCHMARKS" count={data().length} />
          {data().length === 0 ? (
            <div class="py-8 text-center">
              <p class="code-text" style="color: var(--text-secondary);">
                No benchmark data available
              </p>
              <p class="text-xs mt-1" style="color: var(--text-secondary);">
                Data source may be temporarily unavailable
              </p>
            </div>
          ) : (
            <div class="overflow-y-auto" style="max-height: 400px;">
              <For each={data()}>
                {(m) => (
                  <div class="py-2 border-b" style="border-color: var(--border);">
                    <div class="flex justify-between items-baseline mb-1">
                      <span class="font-mono text-xs font-bold" style="color: var(--text-primary);">
                        {m.model}
                      </span>
                      <span class="code-text" style="color: var(--accent);">
                        {m.average_score.toFixed(1)}
                      </span>
                    </div>
                    <div class="flex gap-3 text-xs" style="color: var(--text-secondary);">
                      <span>MMLU: {m.mmlu.toFixed(1)}</span>
                      <span>HE: {m.humaneval.toFixed(1)}</span>
                      <span>GSM8K: {m.gsm8k.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GithubPanel() {
  const { repos, loading, error } = useGithubTrending();

  return (
    <div class="p-4 border h-full" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
      ) : error() ? (
        <div class="py-8 text-center">
          <p class="code-text" style="color: var(--accent-warm);">
            DATA ERROR
          </p>
          <p class="text-xs mt-1" style="color: var(--text-secondary);">
            {error()}
          </p>
        </div>
      ) : (
        <>
          <PanelHeader title="GITHUB TRENDING" count={repos().length} />
          <div class="overflow-y-auto" style="max-height: 400px;">
            <For each={repos()}>
              {(r) => (
                <a
                  href={r.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block py-2 border-b transition-colors"
                  style="border-color: var(--border);"
                >
                  <div class="flex justify-between items-baseline mb-1">
                    <span class="font-mono text-xs font-bold" style="color: var(--text-primary);">
                      {r.full_name}
                    </span>
                    <span class="code-text" style="color: var(--accent);">
                      ★ {r.stargazers_count.toLocaleString()}
                    </span>
                  </div>
                  {r.description && (
                    <p class="text-xs mb-1" style="color: var(--text-secondary); line-height: 1.4;">
                      {r.description.length > 80
                        ? `${r.description.slice(0, 80)}...`
                        : r.description}
                    </p>
                  )}
                  {r.language && (
                    <span class="code-text" style="color: var(--accent);">
                      {r.language}
                    </span>
                  )}
                </a>
              )}
            </For>
          </div>
        </>
      )}
    </div>
  );
}

function HnPanel() {
  const { stories, loading, error } = useHackerNews();

  return (
    <div class="p-4 border h-full" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
      ) : error() ? (
        <div class="py-8 text-center">
          <p class="code-text" style="color: var(--accent-warm);">
            DATA ERROR
          </p>
          <p class="text-xs mt-1" style="color: var(--text-secondary);">
            {error()}
          </p>
        </div>
      ) : (
        <>
          <PanelHeader title="HACKER NEWS" count={stories().length} />
          <div class="overflow-y-auto" style="max-height: 400px;">
            <For each={stories()}>
              {(s) => (
                <a
                  href={s.url || `https://news.ycombinator.com/item?id=${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block py-2 border-b transition-colors"
                  style="border-color: var(--border);"
                >
                  <div class="flex justify-between items-baseline mb-1">
                    <span class="font-mono text-xs font-bold" style="color: var(--text-primary);">
                      {s.title}
                    </span>
                    <span class="code-text" style="color: var(--accent);">
                      ▲ {s.score}
                    </span>
                  </div>
                  <div class="flex gap-3 text-xs" style="color: var(--text-secondary);">
                    <span>{s.author}</span>
                    <span>{timeAgo(s.time)}</span>
                    <span>{s.comments} comments</span>
                  </div>
                </a>
              )}
            </For>
          </div>
        </>
      )}
    </div>
  );
}

export default function DataPanels() {
  return (
    <div>
      <p class="label mb-3" style="color: var(--accent);">
        DATA PANELS
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <LlmPanel />
        <GithubPanel />
        <HnPanel />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

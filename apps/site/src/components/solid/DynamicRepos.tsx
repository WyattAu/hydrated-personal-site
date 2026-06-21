import { For, createSignal, onMount } from 'solid-js';

interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  topics: string[];
  updated_at: string;
}

const LANG_COLORS: Record<string, string> = {
  Rust: '#dea584',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Dart: '#00B4AB',
  C: '#555555',
  'C++': '#f34b7d',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Nix: '#7e7eff',
  Lean: '#0066aa',
  Ruby: '#701516',
  Java: '#b07219',
  Haskell: '#5e5086',
};

export default function DynamicRepos() {
  const [repos, setRepos] = createSignal<Repo[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch(
        'https://api.github.com/search/repositories?q=user:WyattAu&sort=updated&per_page=12',
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
        },
      );
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      setRepos(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load repos');
    } finally {
      setLoading(false);
    }
  });

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  return (
    <div>
      {loading() && (
        <div class="flex items-center gap-2 mb-4">
          <span
            class="block w-2 h-2 rounded-full animate-pulse"
            style="background: var(--accent);"
          />
          <span class="font-mono text-xs" style="color: var(--text-secondary);">
            SYNCING
          </span>
        </div>
      )}

      {error() && (
        <p class="font-mono text-xs" style="color: var(--accent-warm);">
          {error()}
        </p>
      )}

      {!loading() && !error() && repos().length === 0 && (
        <p class="font-mono text-xs" style="color: var(--text-secondary);">
          No repos found.
        </p>
      )}

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <For each={repos()}>
          {(repo) => (
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              class="amoebic-morph block p-4 border transition-colors"
              style="border-color: var(--border); background: var(--bg-card); text-decoration: none;"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-mono text-sm font-bold truncate" style="color: var(--accent);">
                  {repo.name}
                </h3>
                <span
                  class="font-mono text-[10px] shrink-0 ml-2"
                  style="color: var(--text-secondary);"
                >
                  Stars: {repo.stargazers_count}
                </span>
              </div>
              <p class="text-xs mb-2 line-clamp-2" style="color: var(--text-secondary);">
                {repo.description || 'No description'}
              </p>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                  {repo.language && (
                    <>
                      <span
                        class="block w-2 h-2 rounded-full"
                        style={{ background: LANG_COLORS[repo.language] || '#888' }}
                      />
                      <span class="font-mono text-[10px]" style="color: var(--text-secondary);">
                        {repo.language}
                      </span>
                    </>
                  )}
                </div>
                <span class="font-mono text-[10px]" style="color: var(--text-secondary);">
                  {timeAgo(repo.updated_at)}
                </span>
              </div>
              {repo.topics.length > 0 && (
                <div class="flex flex-wrap gap-1 mt-2">
                  <For each={repo.topics.slice(0, 4)}>
                    {(topic) => (
                      <span
                        class="font-mono text-[9px] px-1.5 py-0.5"
                        style="border: 1px solid var(--border); color: var(--text-secondary);"
                      >
                        {topic}
                      </span>
                    )}
                  </For>
                </div>
              )}
            </a>
          )}
        </For>
      </div>
    </div>
  );
}

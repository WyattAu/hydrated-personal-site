import { For, Show, createSignal, onMount } from 'solid-js';
import { recordFetch } from '../StaleIndicator';

interface PageData {
  url: string;
  status: number;
  titleLength: number;
  descriptionLength: number;
  h1Count: number;
  wordCount: number;
  fetchTimeMs: number;
  issues: number;
}

type SortKey = keyof PageData;
type SortDir = 'asc' | 'desc';

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return '#69f0ae';
  if (status >= 300 && status < 400) return '#eab308';
  return '#f44336';
}

function issueColor(count: number): string {
  if (count === 0) return '#69f0ae';
  if (count <= 3) return '#eab308';
  return '#f44336';
}

function titleLenColor(len: number): string {
  if (len >= 30 && len <= 60) return '#69f0ae';
  if (len > 0) return '#eab308';
  return '#f44336';
}

function descLenColor(len: number): string {
  if (len >= 120 && len <= 160) return '#69f0ae';
  if (len > 0) return '#eab308';
  return '#f44336';
}

function h1Color(count: number): string {
  if (count === 1) return '#69f0ae';
  if (count > 0) return '#eab308';
  return '#f44336';
}

function wordColor(count: number): string {
  if (count >= 300) return '#69f0ae';
  if (count >= 100) return '#eab308';
  return '#f44336';
}

function fetchTimeColor(ms: number): string {
  if (ms < 500) return '#69f0ae';
  if (ms < 2000) return '#eab308';
  return '#f44336';
}

export default function SeoPageList() {
  const [pages, setPages] = createSignal<PageData[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey>('issues');
  const [sortDir, setSortDir] = createSignal<SortDir>('desc');

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/data/seo-pages.json');
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setPages(Array.isArray(json) ? json : json.pages || []);
      recordFetch('seo-pages');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load page data');
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey() === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedPages = () => {
    const key = sortKey();
    const dir = sortDir();
    const sorted = [...pages()].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'string' && typeof bv === 'string') {
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return sorted;
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey() !== key) return '';
    return sortDir() === 'asc' ? ' ▲' : ' ▼';
  };

  onMount(() => loadData());

  return (
    <div
      class="border p-4"
      style={{ 'border-color': 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div class="flex items-center justify-between mb-3">
        <p class="label" style={{ color: 'var(--accent)' }}>
          PAGE ANALYSIS
        </p>
        <Show when={!loading() && pages().length > 0}>
          <span class="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            {pages().length} pages
          </span>
        </Show>
      </div>

      <Show when={loading()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--text-secondary)' }}>
          Loading page data...
        </p>
      </Show>

      <Show when={err()}>
        <p class="font-mono text-xs p-4" style={{ color: 'var(--accent-warm)' }}>
          {err()}
        </p>
      </Show>

      <Show when={!loading() && !err()}>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse" style={{ 'min-width': '900px' }}>
            <thead>
              <tr>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('url')}
                >
                  Page{sortIndicator('url')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('status')}
                >
                  Status{sortIndicator('status')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('titleLength')}
                >
                  Title Len{sortIndicator('titleLength')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('descriptionLength')}
                >
                  Desc Len{sortIndicator('descriptionLength')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('h1Count')}
                >
                  H1{sortIndicator('h1Count')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('wordCount')}
                >
                  Words{sortIndicator('wordCount')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('fetchTimeMs')}
                >
                  Fetch{sortIndicator('fetchTimeMs')}
                </th>
                <th
                  class="p-2 text-left font-mono text-[9px] font-bold cursor-pointer select-none border-b"
                  style={{ 'border-color': 'var(--border)', color: 'var(--accent)' }}
                  onClick={() => toggleSort('issues')}
                >
                  Issues{sortIndicator('issues')}
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={sortedPages()}>
                {(page) => (
                  <tr class="border-b" style={{ 'border-color': 'var(--border)' }}>
                    <td
                      class="p-2 font-mono text-[10px] max-w-[200px] truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {page.url}
                    </td>
                    <td
                      class="p-2 font-mono text-[10px] font-bold"
                      style={{ color: statusColor(page.status) }}
                    >
                      {page.status}
                    </td>
                    <td
                      class="p-2 font-mono text-[10px]"
                      style={{ color: titleLenColor(page.titleLength) }}
                    >
                      {page.titleLength}
                    </td>
                    <td
                      class="p-2 font-mono text-[10px]"
                      style={{ color: descLenColor(page.descriptionLength) }}
                    >
                      {page.descriptionLength}
                    </td>
                    <td class="p-2 font-mono text-[10px]" style={{ color: h1Color(page.h1Count) }}>
                      {page.h1Count}
                    </td>
                    <td
                      class="p-2 font-mono text-[10px]"
                      style={{ color: wordColor(page.wordCount) }}
                    >
                      {page.wordCount.toLocaleString()}
                    </td>
                    <td
                      class="p-2 font-mono text-[10px]"
                      style={{ color: fetchTimeColor(page.fetchTimeMs) }}
                    >
                      {page.fetchTimeMs < 1000
                        ? `${page.fetchTimeMs}ms`
                        : `${(page.fetchTimeMs / 1000).toFixed(1)}s`}
                    </td>
                    <td
                      class="p-2 font-mono text-[10px] font-bold"
                      style={{ color: issueColor(page.issues) }}
                    >
                      {page.issues}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <Show when={!loading() && !err() && pages().length === 0}>
        <p class="font-mono text-xs p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
          No page data available
        </p>
      </Show>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

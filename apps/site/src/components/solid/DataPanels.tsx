import { For, createSignal, onMount } from 'solid-js';
import { useLlmData } from '../../lib/llm-data';
import type { GitHubRepo, HNStory } from '../../lib/types';
import { recordFetch } from './StaleIndicator';

// ─── Data Hooks ─────────────────────────────────────────────────────

function useGithubTrending() {
  const [repos, setRepos] = createSignal<GitHubRepo[]>([]);
  const [loading, setLoading] = createSignal(true);
  onMount(async () => {
    try {
      const res = await fetch('/api/github-trending');
      if (res.ok) {
        const raw = await res.json();
        setRepos((raw?.items ?? (Array.isArray(raw) ? raw : [])).slice(0, 15));
        recordFetch('github-trending');
      }
    } catch {}
    setLoading(false);
  });
  return { repos, loading };
}

function useHackerNews() {
  const [stories, setStories] = createSignal<HNStory[]>([]);
  const [loading, setLoading] = createSignal(true);
  onMount(async () => {
    try {
      const res = await fetch('/api/hacker-news');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStories(data.slice(0, 15));
          recordFetch('hacker-news');
        }
      }
    } catch {}
    setLoading(false);
  });
  return { stories, loading };
}

function useExchangeRates() {
  const [rates, setRates] = createSignal<Record<string, number>>({});
  const [loading, setLoading] = createSignal(true);
  onMount(async () => {
    try {
      const res = await fetch('/api/exchange-rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || {});
        recordFetch('exchange-rates');
      }
    } catch {}
    setLoading(false);
  });
  return { rates, loading };
}

function useCryptoTicker() {
  const [prices, setPrices] = createSignal<Record<string, number>>({});
  const [loading, setLoading] = createSignal(true);
  onMount(async () => {
    try {
      const res = await fetch('/api/crypto-ticker');
      if (res.ok) {
        const data = await res.json();
        const items: Array<{ symbol: string; lastPrice?: string; price?: number }> = Array.isArray(
          data,
        )
          ? data
          : data.data || [];
        const p: Record<string, number> = {};
        for (const e of items) {
          const base = e.symbol.replace('USDT', '');
          const price = e.price ?? Number.parseFloat(e.lastPrice || '0');
          if (price > 0) p[base] = price;
        }
        p.USDT = 1;
        p.USDC = 1;
        setPrices(p);
        recordFetch('crypto-ticker');
      }
    } catch {}
    setLoading(false);
  });
  return { prices, loading };
}

// ─── Formatting ─────────────────────────────────────────────────────

function formatFiatRate(r: number): string {
  if (r >= 100) return r.toFixed(1);
  if (r >= 1) return r.toFixed(4);
  return r.toFixed(6);
}

function formatCryptoRate(r: number): string {
  if (r >= 10000) return r.toFixed(0);
  if (r >= 100) return r.toFixed(2);
  if (r >= 1) return r.toFixed(4);
  if (r >= 0.001) return r.toFixed(6);
  return r.toFixed(8);
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Shared Components ──────────────────────────────────────────────

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

function PanelHeader(props: { title: string; subtitle?: string; count?: number | string }) {
  return (
    <div class="flex items-center justify-between mb-3">
      <div>
        <p class="label" style="color: var(--accent);">
          {props.title}
        </p>
        {props.subtitle && (
          <p class="font-mono text-[9px] mt-0.5" style="color: var(--text-secondary);">
            {props.subtitle}
          </p>
        )}
      </div>
      {props.count !== undefined && (
        <span class="code-text" style="color: var(--text-secondary);">
          {props.count}
        </span>
      )}
    </div>
  );
}

// ─── Fiat Cross-Rates Matrix ────────────────────────────────────────

const FIAT_CURRENCIES = [
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'USD',
  'ZAR',
];

function FiatMatrixPanel() {
  const { rates, loading } = useExchangeRates();

  return (
    <div class="p-4 border" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
      ) : (
        <>
          <PanelHeader
            title="FIAT CROSS-RATES"
            subtitle="BASE: USD · LIVE"
            count={`${FIAT_CURRENCIES.length}×${FIAT_CURRENCIES.length}`}
          />
          <div class="overflow-x-auto" style="max-height: 400px; overflow-y: auto;">
            <table class="w-full border-collapse" style="min-width: 800px;">
              <thead>
                <tr>
                  <th
                    class="sticky left-0 z-10 p-1 text-left font-mono text-[9px]"
                    style="background: var(--bg-card); color: var(--text-secondary);"
                  />
                  <For each={FIAT_CURRENCIES}>
                    {(code) => (
                      <th
                        class="p-1 font-mono text-[9px] font-bold text-center"
                        style={{ color: 'var(--accent)', 'min-width': '48px' }}
                      >
                        {code}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={FIAT_CURRENCIES}>
                  {(rowCode) => (
                    <tr>
                      <td
                        class="sticky left-0 z-10 p-1 font-mono text-[9px] font-bold whitespace-nowrap"
                        style={{ background: 'var(--bg-card)', color: 'var(--accent)' }}
                      >
                        {rowCode}
                      </td>
                      <For each={FIAT_CURRENCIES}>
                        {(colCode) => {
                          const isDiag = rowCode === colCode;
                          const rate = () => {
                            if (isDiag) return 1;
                            const fromRate = rates()[rowCode] || 1;
                            const toRate = rates()[colCode] || 1;
                            return rowCode === 'USD' ? 1 / toRate : toRate / fromRate;
                          };
                          return (
                            <td
                              class="p-1 text-center font-mono text-[9px] border"
                              style={{
                                'border-color': 'var(--border)',
                                color: isDiag ? 'var(--text-secondary)' : 'var(--text-primary)',
                                background: isDiag ? 'var(--bg-secondary)' : 'transparent',
                                'font-weight': isDiag ? '700' : '400',
                              }}
                            >
                              {rates()[rowCode] && rates()[colCode] ? formatFiatRate(rate()) : '--'}
                            </td>
                          );
                        }}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Crypto Swap Rates Matrix ───────────────────────────────────────

const CRYPTO_PAIRS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK'];

function CryptoMatrixPanel() {
  const { prices, loading } = useCryptoTicker();

  return (
    <div class="p-4 border" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
      ) : (
        <>
          <PanelHeader
            title="CRYPTO SWAP RATES"
            subtitle="BINANCE · 24H TICKER"
            count={`${CRYPTO_PAIRS.length}×${CRYPTO_PAIRS.length}`}
          />
          <div class="overflow-x-auto" style="max-height: 350px; overflow-y: auto;">
            <table class="w-full border-collapse" style="min-width: 500px;">
              <thead>
                <tr>
                  <th
                    class="sticky left-0 z-10 p-1 text-left font-mono text-[9px]"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  />
                  <For each={CRYPTO_PAIRS}>
                    {(sym) => (
                      <th
                        class="p-1 font-mono text-[9px] font-bold text-center"
                        style={{ color: 'var(--accent)', 'min-width': '52px' }}
                      >
                        {sym}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={CRYPTO_PAIRS}>
                  {(rowSym) => (
                    <tr>
                      <td
                        class="sticky left-0 z-10 p-1 font-mono text-[9px] font-bold whitespace-nowrap"
                        style={{ background: 'var(--bg-card)', color: 'var(--accent)' }}
                      >
                        {rowSym}
                      </td>
                      <For each={CRYPTO_PAIRS}>
                        {(colSym) => {
                          const isDiag = rowSym === colSym;
                          const rate = () => {
                            if (isDiag) return 1;
                            const fromPrice = prices()[rowSym] || 0;
                            const toPrice = prices()[colSym] || 0;
                            return toPrice > 0 ? fromPrice / toPrice : 0;
                          };
                          return (
                            <td
                              class="p-1 text-center font-mono text-[9px] border"
                              style={{
                                'border-color': 'var(--border)',
                                color: isDiag ? 'var(--text-secondary)' : 'var(--text-primary)',
                                background: isDiag ? 'var(--bg-secondary)' : 'transparent',
                                'font-weight': isDiag ? '700' : '400',
                              }}
                            >
                              {prices()[rowSym] && prices()[colSym]
                                ? formatCryptoRate(rate())
                                : '--'}
                            </td>
                          );
                        }}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── LLM Benchmarks Panel ───────────────────────────────────────────

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
                No data available
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
                    <div class="flex flex-wrap gap-3 text-xs" style="color: var(--text-secondary);">
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

// ─── GitHub Trending Panel ──────────────────────────────────────────

function GithubPanel() {
  const { repos, loading } = useGithubTrending();
  return (
    <div class="p-4 border h-full" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
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
                      Stars: {r.stargazers_count.toLocaleString()}
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

// ─── Hacker News Panel ──────────────────────────────────────────────

function HnPanel() {
  const { stories, loading } = useHackerNews();
  return (
    <div class="p-4 border h-full" style="border-color: var(--border); background: var(--bg-card);">
      {loading() ? (
        <PanelSkeleton />
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

// ─── Main Export ────────────────────────────────────────────────────

export default function DataPanels() {
  return (
    <div>
      {/* Matrix tables */}
      <div class="grid grid-cols-1 gap-4 mb-4">
        <FiatMatrixPanel />
        <CryptoMatrixPanel />
      </div>

      {/* Info panels */}
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

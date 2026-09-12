/**
 * Chart meta — data rigor captions for canvas widgets.
 *
 * Every data-driven chart declares what it is showing: the source, when it
 * was fetched, and — critically — when it is NOT showing live data. The
 * caption renders directly under the canvas in mono microtext.
 *
 * Usage:
 *   attachChartMeta('portfolio-backtest', { source: 'Yahoo Finance', detail: '2y daily' });
 *   setChartMetaState('portfolio-backtest', { fallback: true });   // sample-data disclosure
 *   setChartMetaState('portfolio-backtest', { error: 'API 503' }); // visible failure
 */

interface ChartMetaOptions {
  /** Data source, e.g. "Binance WS", "Yahoo Finance", "USGS". */
  source: string;
  /** Short qualifier, e.g. "2y daily", "perp chains". */
  detail?: string;
  /** Shown when the widget is rendering synthetic/fallback data. */
  fallbackLabel?: string;
}

interface ChartMetaState {
  fallback?: boolean;
  error?: string | null;
  freshAt?: number | null;
}

const registry = new Map<string, { opts: ChartMetaOptions; state: ChartMetaState }>();

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

function render(canvasId: string): void {
  const entry = registry.get(canvasId);
  if (!entry) return;
  const { opts, state } = entry;

  const el = document.getElementById(canvasId);
  if (!el) return;
  let box = document.querySelector<HTMLElement>(`[data-chart-meta-for="${canvasId}"]`);
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('data-chart-meta-for', canvasId);
    box.className = 'font-mono text-[9px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5';
    box.style.color = 'var(--text-secondary)';
    el.insertAdjacentElement('afterend', box);
  }

  const parts: string[] = [`SRC: ${opts.source}`];
  if (opts.detail) parts.push(opts.detail);
  if (state.freshAt) parts.push(`updated ${fmtTime(state.freshAt)}`);

  let html = '';
  for (const p of parts) {
    html += `<span>${p}</span>`;
  }
  if (state.fallback && opts.fallbackLabel) {
    html += `<span style="color: var(--accent-warm);" title="Live feed unavailable — showing representative sample data">SAMPLE DATA</span>`;
  }
  if (state.error) {
    html += `<span style="color: #ff5252;">ERROR: ${state.error.replace(/</g, '&lt;')}</span>`;
  }
  box.innerHTML = html;
}

/** Declare + render the meta caption for a canvas. Idempotent. */
export function attachChartMeta(canvasId: string, opts: ChartMetaOptions): void {
  const existing = registry.get(canvasId);
  registry.set(canvasId, { opts: { ...existing?.opts, ...opts }, state: existing?.state ?? {} });
  render(canvasId);
}

/** Update the live state (fallback/error/freshness) of a chart caption. */
export function setChartMetaState(canvasId: string, state: ChartMetaState): void {
  const entry = registry.get(canvasId);
  if (!entry) return;
  entry.state = { ...entry.state, ...state };
  if (state.error === null) delete entry.state.error;
  if (state.freshAt === null) delete entry.state.freshAt;
  render(canvasId);
}

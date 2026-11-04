/**
 * plychart render + interaction helpers.
 *
 * renderPlychart: sizes the chart to the canvas element's CSS box and
 *   re-creates it when the box changes, so charts always fill their
 *   container and survive window resizes.
 * usePlychartAuto: Solid hook that re-renders on container resize.
 * attachPlychartTooltip: hover tooltip backed by the WASM
 *   get_tooltip_data export (single- and multi-series aware).
 */
import { onCleanup, onMount } from 'solid-js';
import { getPlychart } from './plychart-loader';

const sizeCache = new WeakMap<Element, string>();

/** Per-canvas render context for zoom/pan re-slicing. */
interface RenderCtx {
  updateFn: string;
  dataJson: string;
  extraArgs: string[];
}

const renderCtx = new WeakMap<Element, RenderCtx>();
const zoomWired = new WeakSet<Element>();

/** Last applied viewport window per canvas. Persisted across data
 *  re-renders: live updates call renderPlychart with the FULL dataset,
 *  which would otherwise wipe the zoomed view between wheel events
 *  (zoom-out then looked like a no-op — the chart had already sprung
 *  back to full range). */
const viewports = new WeakMap<Element, { start: number; count: number }>();

/** The JSON actually rendered last (post-zoom slice) — tooltip lookups
 *  must index into this, not the full dataset. */
const lastRendered = new WeakMap<Element, string>();

/** Per-canvas axis labels, consumed by the theme JSON at render time. */
const chartLabels = new Map<string, { title?: string; y_unit?: string; x_unit?: string }>();

/** Declare axis labels / title for a chart (rendered by plychart). */
export function setChartLabels(
  canvasId: string,
  labels: { title?: string; yUnit?: string; xUnit?: string },
): void {
  chartLabels.set(canvasId, {
    title: labels.title,
    y_unit: labels.yUnit,
    x_unit: labels.xUnit,
  });
}

/** Read a CSS custom property off the document element (theme-aware). */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

let themeCache: Record<string, string> | null = null;
let themeCacheAt = 0;

/** Theme colors from the active site theme, cached for 5s. */
function cssTheme(): Record<string, string> {
  const now = Date.now();
  if (themeCache && now - themeCacheAt < 5000) return themeCache;
  themeCache = {
    bg: cssVar('--bg-primary', '#0a0a0a'),
    text: cssVar('--text-primary', '#e0e0e0'),
    text_muted: cssVar('--text-secondary', '#666666'),
    grid: cssVar('--border', '#1a1a1a'),
    accent: cssVar('--accent', '#00e5ff'),
  };
  themeCacheAt = now;
  return themeCache;
}

/** Build the theme JSON passed to plychart update fns: theme colors plus
 *  any registered labels. Empty-string themes become theme-aware. */
function buildThemeJson(canvasId: string, currentThemeArg: string): string {
  const labels = chartLabels.get(canvasId);
  if (!currentThemeArg && !labels) return currentThemeArg;
  const base = currentThemeArg ? (JSON.parse(currentThemeArg) as Record<string, unknown>) : {};
  return JSON.stringify({ ...cssTheme(), ...base, ...(labels ?? {}) });
}

/** ?zoomdebug=1 — visible event log overlay for diagnosing wheel zoom
 *  reports (deltas as delivered by the browser + viewport responses). */
let zoomDebugEnabled: boolean | null = null;
function zoomDebug(msg: string): void {
  if (zoomDebugEnabled === null) {
    zoomDebugEnabled = typeof location !== 'undefined' && location.search.includes('zoomdebug');
  }
  if (!zoomDebugEnabled) return;
  let box = document.getElementById('plychart-zoom-debug') as HTMLPreElement | null;
  if (!box) {
    box = document.createElement('pre');
    box.id = 'plychart-zoom-debug';
    box.style.cssText =
      'position:fixed;bottom:8px;left:8px;z-index:9999;max-width:70vw;max-height:40vh;' +
      'overflow:auto;background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;' +
      'padding:8px;margin:0;pointer-events:none;white-space:pre-wrap;';
    document.body.appendChild(box);
  }
  const line = `${new Date().toISOString().slice(11, 23)} ${msg}`;
  box.appendChild(document.createTextNode(`${line}\n`));
  box.scrollTop = box.scrollHeight;
}

/** Update fns whose data is a time-series slice (zoom/pan eligible). */
const PANABLE = new Set(['update_line', 'update_area', 'update_candles', 'update_bar']);

/** Slice a data JSON string to [start, start+count). Handles single-series
 *  arrays and multi-series `{color, data}` envelopes. */
function sliceDataJson(dataJson: string, start: number, count: number): string {
  try {
    const parsed = JSON.parse(dataJson);
    if (Array.isArray(parsed)) {
      // Single series of points, or multi-series envelope?
      if (parsed.length > 0 && Array.isArray(parsed[0])) return dataJson; // pairs — leave
      if (
        parsed.length > 0 &&
        typeof parsed[0] === 'object' &&
        parsed[0] !== null &&
        'data' in parsed[0]
      ) {
        // Multi-series envelope
        return JSON.stringify(
          parsed.map((s: { color: string; data: unknown[] }) => ({
            ...s,
            data: s.data.slice(start, start + count),
          })),
        );
      }
      return JSON.stringify(parsed.slice(start, start + count));
    }
  } catch {
    /* fall through */
  }
  return dataJson;
}

/** Auto-attach wheel-zoom + drag-pan to a pannable canvas (once). */
function wireZoomPan(el: HTMLElement, ctx: RenderCtx): void {
  if (zoomWired.has(el) || !PANABLE.has(ctx.updateFn)) return;
  zoomWired.add(el);

  let dragging = false;
  let lastX = 0;

  const viewCall = async (
    fn: string,
    params: Record<string, number>,
  ): Promise<{ start: number; count: number } | null> => {
    try {
      const p = await getPlychart();
      const f = (p as Record<string, (...a: unknown[]) => string>)[fn];
      if (typeof f !== 'function') return null;
      return JSON.parse(f(canvasIdOf(el), JSON.stringify(params)));
    } catch {
      return null;
    }
  };

  const reupdate = async (start: number, count: number) => {
    // Read the context fresh: renderPlychart replaces it on every data
    // change, but this closure was created at first-wire time.
    const c = renderCtx.get(el);
    if (!c) return;
    viewports.set(el, { start, count });
    zoomDebug(`reapply id=${canvasIdOf(el)} start=${start} count=${count} fn=${c.updateFn}`);
    const p = await getPlychart();
    const fn = (p as Record<string, (...a: unknown[]) => void>)[c.updateFn];
    if (typeof fn === 'function') {
      const sliced = sliceDataJson(c.dataJson, start, count);
      lastRendered.set(el, sliced);
      fn(canvasIdOf(el), sliced, ...c.extraArgs);
    }
  };

  const zoomStep = async (deltaY: number) => {
    const c = renderCtx.get(el);
    if (!c) {
      zoomDebug(`zoomStep skip: no ctx id=${canvasIdOf(el)}`);
      return;
    }
    const len = dataLen(c.dataJson);
    zoomDebug(
      `wheel id=${canvasIdOf(el)} dy=${deltaY} len=${len} fn=${c.updateFn} vp=${JSON.stringify(viewports.get(el))}`,
    );
    if (len < 20) {
      zoomDebug('zoomStep skip: len<20');
      return;
    }
    const vp = await viewCall('view_zoom', { delta_y: deltaY, total: len });
    zoomDebug(`view_zoom -> ${JSON.stringify(vp)}`);
    if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
  };

  el.addEventListener(
    'wheel',
    (e) => {
      const c = renderCtx.get(el);
      if (!c) return;
      // Ignore horizontal-intent gestures entirely: trackpad scrolls drift
      // diagonally, and deltaY=0 must never take the "zoom in" else-branch
      // (this was the "both directions zoom in" bug on Firefox trackpads).
      if (e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        zoomDebug(
          `wheel gated id=${canvasIdOf(el)} dX=${e.deltaX} dY=${e.deltaY} mode=${e.deltaMode}`,
        );
        return;
      }
      e.preventDefault();
      // Firefox reports wheel deltas in lines; normalize to pixels.
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      zoomDebug(
        `wheel accepted id=${canvasIdOf(el)} dX=${e.deltaX} dY=${e.deltaY} mode=${e.deltaMode} dy=${dy}`,
      );
      void zoomStep(dy);
    },
    { passive: false },
  );

  el.addEventListener('mousedown', (e) => {
    const c = renderCtx.get(el);
    if (!c) return;
    dragging = true;
    lastX = e.clientX;
    const len = dataLen(c.dataJson);
    void viewCall('view_pan_start', { x: e.offsetX, y: e.offsetY, total: len });
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    void viewCall('view_pan_move', { x: e.clientX - lastX, total: len }).then((vp) => {
      if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
    });
    lastX = e.clientX;
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    void viewCall('view_pan_end', {});
  });

  el.addEventListener('dblclick', () => {
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    void viewCall('view_reset', { total: len }).then((vp) => {
      viewports.delete(el);
      if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
    });
  });

  // Keyboard zoom: focus the canvas (Tab), then + / = in, - / _ out,
  // 0 or R resets. Mirrors the wheel path.
  if (el.getAttribute('tabindex') === null) el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e) => {
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    if (len < 20) return;
    let dy: number | null = null;
    if (e.key === '+' || e.key === '=') dy = -120;
    else if (e.key === '-' || e.key === '_') dy = 120;
    else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      viewCall('view_reset', { total: len }).then((vp) => {
        viewports.delete(el);
        if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
      });
      return;
    }
    if (dy === null) return;
    e.preventDefault();
    void zoomStep(dy);
  });

  // Hover tooltip on every pannable chart, indexing the last-rendered
  // slice so values stay correct while zoomed/panned.
  bindTooltip(
    el,
    canvasIdOf(el),
    () => lastRendered.get(el) ?? renderCtx.get(el)?.dataJson ?? '[]',
    {},
  );

  attachZoomControls(el);
}

/**
 * Explicit + / - / reset overlay for pannable charts. Wheel zoom depends
 * on trackpad/mouse settings and is undiscoverable; the buttons call the
 * same view_zoom/view_reset path so behavior is identical.
 */
function attachZoomControls(el: HTMLElement): void {
  const parent = el.parentElement;
  if (!parent || parent.querySelector('[data-plychart-zoom]')) return;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  const bar = document.createElement('div');
  bar.setAttribute('data-plychart-zoom', '1');
  bar.style.cssText =
    'position:absolute;top:6px;right:6px;display:flex;gap:4px;z-index:5;opacity:0.9;';
  const mk = (label: string, title: string, onPress: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.style.cssText =
      'font-family:monospace;font-size:11px;line-height:1;padding:3px 8px;cursor:pointer;' +
      'background:var(--bg-secondary);color:var(--accent);border:1px solid var(--border);';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onPress();
    });
    bar.appendChild(b);
    return b;
  };
  const step = (deltaY: number): void => {
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    zoomDebug(`button id=${canvasIdOf(el)} dy=${deltaY} len=${len}`);
    if (len < 20) return;
    getPlychart()
      .then((p) => {
        const f = (p as Record<string, (...a: unknown[]) => string>).view_zoom;
        if (typeof f !== 'function') return null;
        return JSON.parse(f(canvasIdOf(el), JSON.stringify({ delta_y: deltaY, total: len }))) as {
          start: number;
          count: number;
        };
      })
      .then((vp) => {
        if (!vp || vp.count <= 0) return;
        const c2 = renderCtx.get(el);
        if (!c2) return;
        return getPlychart().then((p) => {
          const fn = (p as Record<string, (...a: unknown[]) => void>)[c2.updateFn];
          if (typeof fn === 'function') {
            fn(canvasIdOf(el), sliceDataJson(c2.dataJson, vp.start, vp.count), ...c2.extraArgs);
          }
        });
      })
      .catch(() => {});
  };
  mk('+', 'Zoom in', () => step(-120));
  mk('\u2212', 'Zoom out', () => step(120));
  mk('\u27F2', 'Reset view (also: double-click)', () => {
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    getPlychart()
      .then((p) => {
        const f = (p as Record<string, (...a: unknown[]) => string>).view_reset;
        if (typeof f !== 'function') return null;
        return JSON.parse(f(canvasIdOf(el), JSON.stringify({ total: len }))) as {
          start: number;
          count: number;
        };
      })
      .then((vp) => {
        viewports.delete(el);
        if (!vp || vp.count <= 0) return;
        const c2 = renderCtx.get(el);
        if (!c2) return;
        return getPlychart().then((p) => {
          const fn = (p as Record<string, (...a: unknown[]) => void>)[c2.updateFn];
          if (typeof fn === 'function') {
            fn(canvasIdOf(el), sliceDataJson(c2.dataJson, vp.start, vp.count), ...c2.extraArgs);
          }
        });
      })
      .catch(() => {});
  });
  parent.appendChild(bar);
}

function canvasIdOf(el: HTMLElement): string {
  return el.id;
}

function dataLen(dataJson: string): number {
  try {
    const parsed = JSON.parse(dataJson);
    if (Array.isArray(parsed)) {
      if (
        parsed.length > 0 &&
        typeof parsed[0] === 'object' &&
        parsed[0] !== null &&
        'data' in parsed[0]
      ) {
        const first = parsed[0] as { data: unknown[] };
        return first.data.length;
      }
      return parsed.length;
    }
  } catch {
    /* fall through */
  }
  return 0;
}

/**
 * Render a plychart chart into `canvasId`, sized to its current CSS box.
 * Safe to call on every data change: the backing store is only reset when
 * the box size actually changed, which also resets the DPR transform.
 */
export async function renderPlychart(
  canvasId: string,
  updateFn: string,
  dataJson: string,
  ...extraArgs: string[]
): Promise<void> {
  const el = document.getElementById(canvasId);
  if (!el) return;
  let w = Math.round(el.clientWidth);
  let h = Math.round(el.clientHeight);
  // The canvas may be mid-remount (Show gates toggle it) and briefly report
  // a zero box — in Firefox the first layout-dependent read often lands
  // before style/layout settle. Previously we bailed silently and the chart
  // stayed blank until a resize that never came (the observer held the dead
  // element). Retry across a few frames instead.
  for (let i = 0; (w <= 0 || h <= 0) && i < 20; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    w = Math.round(el.clientWidth);
    h = Math.round(el.clientHeight);
  }
  if (w <= 0 || h <= 0) return;

  const key = `${w}x${h}`;
  const p = await getPlychart();
  if (sizeCache.get(el) !== key) {
    p.create_chart(canvasId, w, h);
    sizeCache.set(el, key);
  }
  // Store render context + auto-wire zoom/pan once per canvas.
  // PANABLE update fns take (id, data, theme): swap an empty theme arg for
  // the CSS-var-derived theme + registered axis labels so every chart
  // follows the active site theme and carries its declared units.
  let effArgs = extraArgs;
  if (PANABLE.has(updateFn) && effArgs.length > 0 && effArgs[0] === '') {
    effArgs = [buildThemeJson(canvasId, effArgs[0]), ...effArgs.slice(1)];
  }
  const ctx = { updateFn, dataJson, extraArgs: effArgs };
  renderCtx.set(el, ctx);
  wireZoomPan(el, ctx);
  const fn = (p as Record<string, (...a: unknown[]) => void>)[updateFn];
  if (typeof fn === 'function') {
    // Re-apply the persisted viewport window: without this, a live data
    // update re-renders the FULL dataset and silently undoes zoom/pan.
    let json = dataJson;
    if (PANABLE.has(updateFn)) {
      const vp = viewports.get(el);
      const len = dataLen(dataJson);
      if (vp && len > 0 && vp.count > 0 && vp.count < len) {
        if (vp.start >= len) {
          viewports.delete(el);
        } else {
          json = sliceDataJson(dataJson, vp.start, Math.min(vp.count, len - vp.start));
        }
      }
    }
    lastRendered.set(el, json);
    fn(canvasId, json, ...effArgs);
  }
}

/**
 * Re-run `render` whenever the canvas element's box resizes.
 * Call inside a component; pair with a createEffect that calls render
 * on data changes.
 */
export function usePlychartAuto(canvasId: () => string, render: () => void) {
  let observer: ResizeObserver | undefined;
  let observedEl: Element | null = null;

  onMount(() => {
    if (typeof ResizeObserver === 'undefined') return;
    // Canvas may be conditionally rendered (Show when=data) and REPLACED
    // on every loading toggle. Keep a slow poll alive: (re)observe the
    // current element whenever it changes, drop the dead one.
    const timer = setInterval(() => {
      const el = document.getElementById(canvasId());
      if (el !== observedEl) {
        observer?.disconnect();
        observedEl = el;
        if (el) {
          observer = new ResizeObserver(() => render());
          observer.observe(el);
        }
      }
    }, 500);
    onCleanup(() => {
      clearInterval(timer);
      observer?.disconnect();
    });
  });

  onCleanup(() => observer?.disconnect());
}

interface TooltipPoint {
  index?: number;
  time?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

/**
 * Attach a hover tooltip to a plychart canvas.
 * `format` receives the WASM tooltip payload and returns HTML;
 * defaults to OHLC readout. Returns a cleanup fn.
 */
export function attachPlychartTooltip(
  canvasId: string,
  getDataJson: () => string,
  options: { seriesIndex?: number; format?: (d: TooltipPoint) => string } = {},
): () => void {
  let cleanup: (() => void) | null = null;
  let tries = 0;
  // Canvas may be conditionally rendered (Show when=data) — poll briefly.
  const timer = setInterval(() => {
    tries += 1;
    const el = document.getElementById(canvasId);
    if (el) {
      clearInterval(timer);
      cleanup = bindTooltip(el, canvasId, getDataJson, options);
    } else if (tries > 30) {
      clearInterval(timer);
    }
  }, 100);

  return () => {
    clearInterval(timer);
    cleanup?.();
  };
}

function bindTooltip(
  el: HTMLElement,
  canvasId: string,
  getDataJson: () => string,
  options: { seriesIndex?: number; format?: (d: TooltipPoint) => string },
): () => void {
  const tip = document.createElement('div');
  tip.style.cssText =
    'position:absolute;pointer-events:none;z-index:50;display:none;' +
    'padding:4px 8px;font:10px "JetBrains Mono",monospace;' +
    'background:rgba(10,10,10,0.92);color:#e0e0e0;border:1px solid #333;' +
    'border-radius:2px;white-space:nowrap;';
  const parent = el.parentElement;
  if (parent) {
    const pos = getComputedStyle(parent).position;
    if (pos === 'static') parent.style.position = 'relative';
    parent.appendChild(tip);
  }

  const defaultFormat = (d: TooltipPoint) => {
    if (d.close === undefined) return '';
    const parts = [`#${d.index ?? '?'}`];
    if (d.open !== undefined) parts.push(`O ${d.open.toFixed(2)}`);
    if (d.high !== undefined) parts.push(`H ${d.high.toFixed(2)}`);
    if (d.low !== undefined) parts.push(`L ${d.low.toFixed(2)}`);
    parts.push(`C ${d.close.toFixed(2)}`);
    return parts.join(' | ');
  };

  let raf = 0;
  const onMove = (e: MouseEvent) => {
    cancelAnimationFrame(raf);
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    raf = requestAnimationFrame(() => {
      getPlychart()
        .then((p) => {
          const g = (p as Record<string, (...a: unknown[]) => string>).get_tooltip_data;
          if (typeof g !== 'function') return;
          const raw = g(canvasId, x, y, getDataJson(), options.seriesIndex ?? 0);
          const d = JSON.parse(raw) as TooltipPoint;
          const html = options.format ? options.format(d) : defaultFormat(d);
          if (!html) {
            tip.style.display = 'none';
            return;
          }
          tip.innerHTML = html;
          tip.style.display = 'block';
          const px = Math.min(x + 12, rect.width - tip.offsetWidth - 4);
          const py = Math.max(4, y - tip.offsetHeight - 8);
          tip.style.left = `${px}px`;
          tip.style.top = `${py}px`;
        })
        .catch(() => {});
    });
  };
  const onLeave = () => {
    tip.style.display = 'none';
  };

  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);
  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('mousemove', onMove);
    el.removeEventListener('mouseleave', onLeave);
    tip.remove();
  };
}

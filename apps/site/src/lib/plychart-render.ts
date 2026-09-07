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
    ...args: unknown[]
  ): Promise<{ start: number; count: number } | null> => {
    try {
      const p = await getPlychart();
      const f = (p as Record<string, (...a: unknown[]) => string>)[fn];
      if (typeof f !== 'function') return null;
      return JSON.parse(f(canvasIdOf(el), ...args));
    } catch {
      return null;
    }
  };

  const reupdate = async (start: number, count: number) => {
    const p = await getPlychart();
    const fn = (p as Record<string, (...a: unknown[]) => void>)[ctx.updateFn];
    if (typeof fn === 'function') {
      fn(canvasIdOf(el), sliceDataJson(ctx.dataJson, start, count), ...ctx.extraArgs);
    }
  };

  el.addEventListener(
    'wheel',
    (e) => {
      const c = renderCtx.get(el);
      if (!c) return;
      e.preventDefault();
      const len = dataLen(c.dataJson);
      if (len < 20) return;
      void viewCall('view_zoom', canvasIdOf(el), e.deltaY, len).then((vp) => {
        if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
      });
    },
    { passive: false },
  );

  el.addEventListener('mousedown', (e) => {
    const c = renderCtx.get(el);
    if (!c) return;
    dragging = true;
    lastX = e.clientX;
    const len = dataLen(c.dataJson);
    void viewCall('view_pan_start', canvasIdOf(el), e.offsetX, e.offsetY, len);
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    void viewCall('view_pan_move', canvasIdOf(el), e.clientX - lastX, len).then((vp) => {
      if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
    });
    lastX = e.clientX;
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    void viewCall('view_pan_end', canvasIdOf(el));
  });

  el.addEventListener('dblclick', () => {
    const c = renderCtx.get(el);
    if (!c) return;
    const len = dataLen(c.dataJson);
    void viewCall('view_reset', canvasIdOf(el), len).then((vp) => {
      if (vp && vp.count > 0) void reupdate(vp.start, vp.count);
    });
  });
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
  const w = Math.round(el.clientWidth);
  const h = Math.round(el.clientHeight);
  if (w <= 0 || h <= 0) return;

  const key = `${w}x${h}`;
  const p = await getPlychart();
  if (sizeCache.get(el) !== key) {
    p.create_chart(canvasId, w, h);
    sizeCache.set(el, key);
  }
  // Store render context + auto-wire zoom/pan once per canvas.
  renderCtx.set(el, { updateFn, dataJson, extraArgs });
  wireZoomPan(el, renderCtx.get(el)!);
  const fn = (p as Record<string, (...a: unknown[]) => void>)[updateFn];
  if (typeof fn === 'function') {
    fn(canvasId, dataJson, ...extraArgs);
  }
}

/**
 * Re-run `render` whenever the canvas element's box resizes.
 * Call inside a component; pair with a createEffect that calls render
 * on data changes.
 */
export function usePlychartAuto(canvasId: () => string, render: () => void) {
  let observer: ResizeObserver | undefined;

  onMount(() => {
    if (typeof ResizeObserver === 'undefined') return;
    let tries = 0;
    // Canvas may be conditionally rendered (Show when=data) — poll briefly.
    const timer = setInterval(() => {
      tries += 1;
      const el = document.getElementById(canvasId());
      if (el) {
        clearInterval(timer);
        observer = new ResizeObserver(() => render());
        observer.observe(el);
      } else if (tries > 30) {
        clearInterval(timer);
      }
    }, 100);
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

// Dogfooded from WyattAu/solid-fx (Components/Counter/Counter) — single-file
// copy, biome-adapted. Dependency-free animated counter.
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { For } from 'solid-js';

export interface CounterProps {
  value?: number;
  locale?: string | string[];
  format?: Intl.NumberFormatOptions;
  decimals?: number;
  minDigits?: number;
  prefix?: JSX.Element;
  suffix?: JSX.Element;
  direction?: 'auto' | 'up' | 'down' | 'shortest';
  duration?: number;
  bounce?: number;
  stagger?: number;
  motionBlur?: boolean;
  intro?: boolean;
  fade?: number;
  fontSize?: number | string;
  fontWeight?: JSX.CSSProperties['font-weight'];
  textColor?: string;
  gap?: number;
  padding?: number;
  tabular?: boolean;
  digitStyle?: JSX.CSSProperties;
  className?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

interface Slot {
  key: string;
  kind: 'digit' | 'symbol';
  digit: number;
  text: string;
  rank: number;
}

interface ListSlot extends Slot {
  start: number;
}

interface Item {
  kind: 'digit' | 'symbol';
  rank: number;
  pos: number;
  vel: number;
  target: number;
  shown: number;
  shownVel: number;
  shownTarget: number;
  wait: number;
  exiting: boolean;
  natural: number;
  el: HTMLElement | null;
  numerals: HTMLElement[] | null;
  strip: HTMLElement | null;
  blur: SVGFEGaussianBlurElement | null;
  filter: string;
  blurred: boolean;
}

interface Engine {
  items: Map<string, Item>;
  raf: number;
  last: number;
  ready: boolean;
  value: number;
  widths: number[];
  em: number;
}

const ROOT =
  'relative inline-flex items-baseline leading-none whitespace-nowrap [direction:ltr] [unicode-bidi:isolate]';
const SR =
  'absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip-path:inset(50%)]';
const ROW = 'mx-[calc(var(--counter-gap,0px)/-2)] inline-flex items-baseline select-none';
const AFFIX =
  'mx-[calc(var(--counter-gap,0px)/2*var(--counter-shown,1))] opacity-[var(--counter-shown,1)] whitespace-pre';
const DIGIT =
  'relative box-content inline-block mx-[calc(var(--counter-gap,0px)/2*var(--counter-shown,1))] opacity-[var(--counter-shown,1)] text-center leading-[calc(1em_+_var(--counter-padding,0px))]';
const SIZER = 'invisible';
const WINDOW =
  'pointer-events-none absolute top-[calc(var(--counter-fade,0em)*-1)] right-0 bottom-[calc(var(--counter-fade,0em)*-1)] left-0 overflow-hidden';
const STRIP = 'absolute inset-0';
const NUMERAL = 'absolute inset-0 flex items-center justify-center will-change-transform';
const SYMBOL =
  'relative inline-flex justify-center mx-[calc(var(--counter-gap,0px)/2*var(--counter-shown,1))] opacity-[var(--counter-shown,1)] [clip-path:inset(-0.5em_0)]';
const SYMBOL_TEXT = 'inline-block whitespace-pre';
const BLUR = 'absolute h-0 w-0 overflow-hidden';
const MEASURE =
  'pointer-events-none invisible absolute top-0 left-0 h-0 overflow-hidden whitespace-nowrap *:inline-block';

const TAU = Math.PI * 2;
const NUMERIC = new Set(['integer', 'group', 'decimal', 'fraction']);
const DIRECTIONS = ['auto', 'up', 'down', 'shortest'];
const MASK =
  'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0, rgba(0, 0, 0, 0.0355) calc(var(--counter-fade, 0em) * 0.1667), rgba(0, 0, 0, 0.2099) calc(var(--counter-fade, 0em) * 0.3333), rgba(0, 0, 0, 0.5) calc(var(--counter-fade, 0em) * 0.5), rgba(0, 0, 0, 0.7901) calc(var(--counter-fade, 0em) * 0.6667), rgba(0, 0, 0, 0.9645) calc(var(--counter-fade, 0em) * 0.8333), #000 var(--counter-fade, 0em), #000 calc(100% - var(--counter-fade, 0em)), rgba(0, 0, 0, 0.9645) calc(100% - var(--counter-fade, 0em) * 0.8333), rgba(0, 0, 0, 0.7901) calc(100% - var(--counter-fade, 0em) * 0.6667), rgba(0, 0, 0, 0.5) calc(100% - var(--counter-fade, 0em) * 0.5), rgba(0, 0, 0, 0.2099) calc(100% - var(--counter-fade, 0em) * 0.3333), rgba(0, 0, 0, 0.0355) calc(100% - var(--counter-fade, 0em) * 0.1667), rgba(0, 0, 0, 0) 100%)';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const mod = (value: number, base: number) => ((value % base) + base) % base;

const wrap = (offset: number) => mod(offset + 5, 10) - 5;

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

const stepBetween = (from: number, to: number, direction: string) => {
  const up = mod(to - from, 10);
  if (direction === 'up') return up;
  if (direction === 'down') return up === 0 ? 0 : up - 10;
  return up > 5 ? up - 10 : up;
};

const createFormatter = (locale: string | string[], options: Intl.NumberFormatOptions) => {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat('en-US');
  }
};

const digitsFor = (formatter: Intl.NumberFormat) => {
  const { locale, numberingSystem } = formatter.resolvedOptions();
  const plain = createFormatter(locale, { numberingSystem, useGrouping: false });
  return Array.from({ length: 10 }, (_, digit) => plain.format(digit));
};

const slotsFor = (formatter: Intl.NumberFormat, digits: string[], value: number): Slot[] => {
  const parts = formatter.formatToParts(value);
  let first = -1;
  let last = -1;
  let place = 0;
  parts.forEach((part, index) => {
    if (!NUMERIC.has(part.type)) return;
    if (first < 0) first = index;
    last = index;
    if (part.type === 'integer') place += [...part.value].length;
  });
  let fraction = 0;
  const counts: Record<string, number> = {};
  const slots: Slot[] = [];
  parts.forEach((part, index) => {
    if (part.type === 'integer' || part.type === 'fraction') {
      [...part.value].forEach((char) => {
        const digit = Math.max(0, digits.indexOf(char));
        if (part.type === 'integer') {
          place -= 1;
          slots.push({ key: `i${place}`, kind: 'digit', digit, text: '', rank: -2 * place });
        } else {
          slots.push({ key: `f${fraction}`, kind: 'digit', digit, text: '', rank: 1 + fraction });
          fraction += 1;
        }
      });
    } else if (part.type === 'group') {
      slots.push({
        key: `g${place}`,
        kind: 'symbol',
        digit: 0,
        text: part.value,
        rank: 1 - 2 * place,
      });
    } else if (part.type === 'decimal') {
      slots.push({ key: 'd', kind: 'symbol', digit: 0, text: part.value, rank: 0.5 });
    } else {
      const before = first < 0 || index < first;
      const name = `${before ? 'p' : 's'}-${part.type}`;
      counts[name] = (counts[name] || 0) + 1;
      slots.push({
        key: `${name}-${counts[name]}`,
        kind: 'symbol',
        digit: 0,
        text: part.value,
        rank: before ? -10000 - (first - index) : 10000 + (index - last),
      });
    }
  });
  return slots;
};

const makeItem = (slot: Slot, position: number, shown: number): Item => ({
  kind: slot.kind,
  rank: slot.rank,
  pos: position,
  vel: 0,
  target: position,
  shown,
  shownVel: 0,
  shownTarget: shown,
  wait: 0,
  exiting: false,
  natural: 0,
  el: null,
  numerals: null,
  strip: null,
  blur: null,
  filter: '',
  blurred: false,
});

function Counter(props: CounterProps) {
  let rootEl!: HTMLSpanElement;
  let rowEl!: HTMLSpanElement;
  let measureEl!: HTMLSpanElement;
  const blurId = createUniqueId().replace(/[^a-zA-Z0-9_-]/g, '');
  const amount = () => {
    const value = props.value ?? 0;
    return typeof value === 'number' ? (Object.is(value, -0) ? 0 : value) : Number(value);
  };
  const formatKey = () => JSON.stringify(props.format ?? {});

  const formatter = createMemo(() => {
    const options: Intl.NumberFormatOptions = { ...JSON.parse(formatKey()) };
    const decimals = props.decimals;
    const minDigits = props.minDigits ?? 1;
    if (decimals !== undefined) {
      const fixed = clamp(Math.round(decimals), 0, 20);
      options.minimumFractionDigits = fixed;
      options.maximumFractionDigits = fixed;
    }
    if (minDigits > 1) options.minimumIntegerDigits = clamp(Math.round(minDigits), 1, 21);
    return createFormatter(props.locale ?? 'en-US', options);
  });

  const digits = createMemo(() => digitsFor(formatter()));
  const slots = createMemo(() => slotsFor(formatter(), digits(), amount()));
  const label = createMemo(() => formatter().format(amount()));
  const [list, setList] = createSignal<ListSlot[]>(
    slots().map((slot) => ({ ...slot, start: slot.kind === 'digit' ? slot.digit : 0 })),
  );

  const engine: Engine = {
    items: new Map(),
    raf: 0,
    last: 0,
    ready: false,
    value: amount(),
    widths: [],
    em: 16,
  };
  // Upstream kept the latest animation settings in a ref; settings() reads the
  // current props at call time instead.
  const settings = () => ({
    direction: DIRECTIONS.includes(props.direction ?? 'auto')
      ? (props.direction ?? 'auto')
      : 'auto',
    duration: Math.max(0.05, props.duration ?? 0.7),
    bounce: clamp(props.bounce ?? 0.2, 0, 0.9),
    stagger: Math.max(0, props.stagger ?? 0.04),
    motionBlur: props.motionBlur ?? true,
    tabular: props.tabular ?? true,
  });

  const paint = (item: Item) => {
    const el = item.el;
    if (!el) return;
    const e = engine;
    const s = settings();
    const shown = clamp(item.shown, 0, 1);
    const resting = item.pos === item.target && item.vel === 0;
    if (item.kind === 'digit') {
      item.numerals?.forEach((numeral, n) => {
        numeral.style.transform = `translateY(${(wrap(n - item.pos) * 100).toFixed(3)}%)`;
      });
      if (shown >= 1 && (s.tabular || resting)) {
        el.style.width = '';
      } else {
        const at = mod(item.pos, 10);
        const low = Math.floor(at);
        const from = e.widths[low % 10] ?? 0;
        const to = e.widths[(low + 1) % 10] ?? from;
        el.style.width = `${((from + (to - from) * (at - low)) * shown).toFixed(2)}px`;
      }
      if (item.blur && item.strip) {
        const radius = s.motionBlur ? clamp((Math.abs(item.vel) - 3) * 0.006, 0, 0.09) * e.em : 0;
        if (radius > 0.25) {
          item.blur.setAttribute('stdDeviation', `0 ${radius.toFixed(2)}`);
          if (!item.blurred) {
            item.strip.style.filter = `url(#${item.filter})`;
            item.blurred = true;
          }
        } else if (item.blurred) {
          item.strip.style.filter = '';
          item.blurred = false;
        }
      }
    } else {
      el.style.width = shown >= 1 ? '' : `${(item.natural * shown).toFixed(2)}px`;
    }
    el.style.setProperty('--counter-shown', shown >= 1 ? '' : shown.toFixed(3));
  };

  const frame = (now: number) => {
    const e = engine;
    e.raf = 0;
    const s = settings();
    const elapsed = clamp((now - e.last) / 1000, 0, 1 / 20);
    e.last = now;
    const reduced = prefersReduced();
    const omega = TAU / s.duration;
    const zeta = 1 - s.bounce;
    const presence = TAU / (s.duration * 0.85);
    const done: string[] = [];
    let busy = false;
    e.items.forEach((item, key) => {
      if (reduced) {
        item.wait = 0;
        item.pos = item.target;
        item.vel = 0;
        item.shown = item.shownTarget;
        item.shownVel = 0;
      } else {
        let left = elapsed;
        if (item.wait > 0) {
          const used = Math.min(item.wait, left);
          item.wait -= used;
          left -= used;
        }
        if (left > 0) {
          const steps = Math.ceil(left * 240);
          const dt = left / steps;
          for (let i = 0; i < steps; i++) {
            item.vel +=
              (-omega * omega * (item.pos - item.target) - 2 * zeta * omega * item.vel) * dt;
            item.pos += item.vel * dt;
            item.shownVel +=
              (-presence * presence * (item.shown - item.shownTarget) -
                2 * presence * item.shownVel) *
              dt;
            item.shown += item.shownVel * dt;
          }
        }
      }
      const settled =
        item.wait <= 0 &&
        Math.abs(item.pos - item.target) < 0.002 &&
        Math.abs(item.vel) < 0.02 &&
        Math.abs(item.shown - item.shownTarget) < 0.002 &&
        Math.abs(item.shownVel) < 0.02;
      if (settled) {
        item.target = mod(Math.round(item.target), 10);
        item.pos = item.target;
        item.vel = 0;
        item.shown = item.shownTarget;
        item.shownVel = 0;
        if (item.exiting) done.push(key);
      } else {
        busy = true;
      }
      paint(item);
    });
    if (done.length) {
      done.forEach((key) => e.items.delete(key));
      setList((previous) => previous.filter((slot) => !done.includes(slot.key)));
    }
    if (busy) e.raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    const e = engine;
    if (e.raf || typeof window === 'undefined') return;
    e.last = performance.now();
    e.raf = requestAnimationFrame(frame);
  };

  // Upstream deps: [slots] — the value-transition effect.
  createEffect(() => {
    const nextSlots = slots();
    untrack(() => {
      const e = engine;
      const s = settings();
      if (!e.ready) {
        nextSlots.forEach((slot) =>
          e.items.set(slot.key, makeItem(slot, slot.kind === 'digit' ? slot.digit : 0, 1)),
        );
        e.ready = true;
        e.value = amount();
        return;
      }
      const previousValue = e.value;
      e.value = amount();
      const trend =
        s.direction !== 'auto'
          ? s.direction
          : Math.abs(amount()) > Math.abs(previousValue)
            ? 'up'
            : Math.abs(amount()) < Math.abs(previousValue)
              ? 'down'
              : 'shortest';
      const next = new Set(nextSlots.map((slot) => slot.key));
      const moving: Item[] = [];
      nextSlots.forEach((slot) => {
        let item = e.items.get(slot.key);
        if (!item) {
          item = makeItem(slot, 0, 0);
          e.items.set(slot.key, item);
        }
        item.exiting = false;
        item.shownTarget = 1;
        item.rank = slot.rank;
        if (slot.kind !== 'digit') return;
        const step = stepBetween(mod(Math.round(item.target), 10), slot.digit, trend);
        if (step !== 0 || item.shown < 1) {
          item.target += step;
          moving.push(item);
        }
      });
      e.items.forEach((item, key) => {
        if (next.has(key) || item.exiting) return;
        item.exiting = true;
        item.shownTarget = 0;
        if (item.kind !== 'digit') return;
        item.target += stepBetween(mod(Math.round(item.target), 10), 0, trend);
        moving.push(item);
      });
      moving
        .sort((a, b) => b.rank - a.rank)
        .forEach((item, order) => {
          item.wait = order * s.stagger;
        });
      e.items.forEach((item, key) => {
        if (item.kind !== 'symbol' || key[0] !== 'g') return;
        const owner = e.items.get(`i${key.slice(1)}`);
        if (owner && (owner.shown < 1 || owner.shownTarget < 1)) item.wait = owner.wait;
      });
      setList((previous) => {
        const known = new Map(previous.map((slot) => [slot.key, slot]));
        // React keyed rows by slot.key; <For> keys by reference, so unchanged
        // slots keep their previous object and row.
        const merged: ListSlot[] = nextSlots.map((slot) => {
          const prev = known.get(slot.key);
          if (prev && prev.digit === slot.digit && prev.text === slot.text) return prev;
          return { ...slot, start: prev?.start ?? 0 };
        });
        previous.forEach((slot) => {
          if (!next.has(slot.key)) merged.push(slot);
        });
        merged.sort((a, b) => a.rank - b.rank);
        const same =
          merged.length === previous.length &&
          merged.every((slot, index) => slot === previous[index]);
        return same ? previous : merged;
      });
      kick();
    });
  });

  // Upstream deps: [list, motionBlur] — rebind engine items to the row DOM.
  createEffect(() => {
    void list();
    void props.motionBlur;
    untrack(() => {
      const row = rowEl;
      if (!row) return;
      const e = engine;
      row.querySelectorAll<HTMLElement>('[data-slot]').forEach((el) => {
        const item = e.items.get(el.dataset.slot ?? '');
        if (!item) return;
        item.el = el;
        if (item.kind === 'digit') {
          item.numerals = [...el.querySelectorAll<HTMLElement>('[data-numeral]')];
          item.strip = el.querySelector<HTMLElement>('[data-strip]');
          item.blur = el.querySelector('feGaussianBlur');
          item.filter = el.querySelector('filter')?.id ?? '';
          if (!item.blur && item.strip) item.strip.style.filter = '';
          item.blurred = Boolean(item.blur && item.strip?.style.filter);
        } else if (item.shown < 1 || item.shownTarget < 1) {
          item.natural = el.firstElementChild?.getBoundingClientRect().width ?? 0;
        }
        paint(item);
      });
    });
  });

  onMount(() => {
    const row = measureEl;
    const root = rootEl;
    if (!row || !root) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const e = engine;
      e.widths = [...row.children].map((child) => child.getBoundingClientRect().width);
      e.em = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
    };
    measure();
    document.fonts?.ready?.then(measure).catch(() => {});
    if (typeof ResizeObserver === 'undefined') {
      onCleanup(() => {
        alive = false;
      });
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    onCleanup(() => {
      alive = false;
      observer.disconnect();
    });
  });

  // Upstream deps: [intro] — spin the wheels once when scrolled into view.
  createEffect(() => {
    const intro = props.intro ?? true;
    const root = rootEl;
    if (!intro || !root || prefersReduced()) return;
    const spin = () => {
      const e = engine;
      const s = settings();
      const turn = s.direction === 'down' ? -10 : 10;
      [...e.items.values()]
        .filter((item) => item.kind === 'digit' && !item.exiting)
        .sort((a, b) => a.rank - b.rank)
        .forEach((item, order) => {
          item.target += turn;
          item.wait = order * s.stagger;
        });
      kick();
    };
    if (typeof IntersectionObserver === 'undefined') {
      spin();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        spin();
      },
      { threshold: 0.5 },
    );
    observer.observe(root);
    onCleanup(() => observer.disconnect());
  });

  onCleanup(() => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(engine.raf);
  });

  const affix = (node: JSX.Element) =>
    node === undefined || node === null || node === false ? null : (
      <span class={AFFIX}>{node}</span>
    );

  return (
    <span
      ref={rootEl}
      class={[ROOT, props.class, props.className].filter(Boolean).join(' ')}
      style={
        {
          'font-size':
            typeof (props.fontSize ?? 100) === 'number' ? `${props.fontSize}px` : props.fontSize,
          'font-weight': props.fontWeight ?? 'inherit',
          color: props.textColor ?? 'inherit',
          'font-variant-numeric': (props.tabular ?? true) ? 'tabular-nums' : undefined,
          '--counter-fade': `${Math.max(0, props.fade ?? 0.3)}em`,
          '--counter-gap': `${Math.max(0, props.gap ?? 0)}px`,
          '--counter-padding': `${Math.max(0, props.padding ?? 0)}px`,
          ...props.style,
        } as JSX.CSSProperties
      }
    >
      <span class={SR}>
        {props.prefix}
        {label()}
        {props.suffix}
      </span>
      <span ref={rowEl} class={ROW} aria-hidden="true">
        {affix(props.prefix)}
        <For each={list()}>
          {(slot) =>
            slot.kind === 'digit' ? (
              <span data-slot={slot.key} class={DIGIT} style={props.digitStyle}>
                <span class={SIZER}>{digits()[slot.digit]}</span>
                <span class={WINDOW} style={{ 'mask-image': MASK, '-webkit-mask-image': MASK }}>
                  <span class={STRIP} data-strip="">
                    <For each={digits()}>
                      {(char, n) => (
                        <span
                          class={NUMERAL}
                          data-numeral=""
                          style={{ transform: `translateY(${wrap(n() - slot.start) * 100}%)` }}
                        >
                          {char}
                        </span>
                      )}
                    </For>
                  </span>
                </span>
                {(props.motionBlur ?? true) && (
                  <svg class={BLUR} aria-hidden="true">
                    <filter
                      id={`${blurId}-${slot.key}`}
                      x="-10%"
                      y="-50%"
                      width="120%"
                      height="200%"
                      color-interpolation-filters="sRGB"
                    >
                      <feGaussianBlur stdDeviation="0 0" />
                    </filter>
                  </svg>
                )}
              </span>
            ) : (
              <span data-slot={slot.key} class={SYMBOL}>
                <span class={SYMBOL_TEXT}>{slot.text}</span>
              </span>
            )
          }
        </For>
        {affix(props.suffix)}
      </span>
      <span ref={measureEl} class={MEASURE} aria-hidden="true">
        <For each={digits()}>{(char) => <span>{char}</span>}</For>
      </span>
    </span>
  );
}

export default Counter;

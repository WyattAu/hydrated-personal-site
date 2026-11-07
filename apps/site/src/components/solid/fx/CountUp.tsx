import { animate, cubicBezier } from 'motion';
// Dogfooded from WyattAu/solid-fx (TextAnimations/CountUp) via jsrepo-style
// single-file distribution. Upstream: src/content/TextAnimations/CountUp/CountUp.tsx
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';
import type { JSX } from 'solid-js';

type Easing = 'easeOut' | 'linear' | 'expo' | 'spring';

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  class?: string;
  style?: JSX.CSSProperties;
  startWhen?: boolean;
  separator?: string;
  prefix?: string;
  suffix?: string;
  mode?: 'count' | 'roll';
  easing?: Easing;
  decimals?: number;
  format?: 'standard' | 'compact';
  trigger?: 'view' | 'load';
  replayOnHover?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

type Column = {
  slot: number;
  index: number;
  place: number;
  from: number;
  to: number;
  enter: boolean;
  leave: boolean;
  delta: number;
};

type Mark = { char: string; enter?: boolean; leave?: boolean; follow?: number };

type Slot = Column | Mark;

type Roll = { slots: Slot[]; columns: Column[]; label: string };

type Play = { id: number; from: number; to: number; spin: boolean; wait?: boolean };

const CELL = 1.2;
const STAGGER = 0.07;
const UNITS: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];
const OFFSETS = [-1, 0, 1, 2];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const mod10 = (value: number) => ((value % 10) + 10) % 10;

const makeSpring = (overshoot: number) => {
  const log = Math.log(Math.min(0.5, Math.max(0.001, overshoot)));
  const zeta = -log / Math.sqrt(Math.PI * Math.PI + log * log);
  const damped = Math.PI / 0.52;
  const natural = damped / Math.sqrt(1 - zeta * zeta);
  const raw = (t: number) =>
    1 -
    Math.exp(-zeta * natural * t) *
      (Math.cos(damped * t) + ((zeta * natural) / damped) * Math.sin(damped * t));
  const residual = 1 - raw(1);
  return (t: number) => (t >= 1 ? 1 : raw(t) + residual * t * t * t);
};

const EASINGS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  easeOut: cubicBezier(0.33, 1, 0.68, 1),
  expo: (t) => (t >= 1 ? 1 : (1 - 2 ** (-10 * t)) / (1 - 2 ** -10)),
  spring: makeSpring(0.06),
};

const getDecimalPlaces = (num: number): number => {
  const str = num.toString();

  if (str.includes('.')) {
    const decimals = str.split('.')[1];

    if (Number.parseInt(decimals, 10) !== 0) {
      return decimals.length;
    }
  }

  return 0;
};

const unitFor = (value: number): [number, string] =>
  UNITS.find(([size]) => Math.abs(value) >= size * 0.9995) || [1, ''];

const scaleFor = (
  value: number,
  compact: boolean,
  decimals: number | undefined,
  places: number,
) => {
  if (!compact) return { size: 1, label: '', digits: places };
  const [size, label] = unitFor(value);
  const digits = decimals ?? (label ? (Math.abs(value) / size < 100 ? 1 : 0) : places);
  return { size, label, digits };
};

const splitNumber = (value: number, digits: number, size: number) => {
  const fixed = (Math.abs(value) / size).toFixed(digits);
  const [int, frac = ''] = fixed.split('.');
  return { negative: value < 0 && Number(fixed) !== 0, int, frac };
};

const group = (int: string, separator: string) =>
  separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int;

const buildRoll = (
  a: number,
  b: number,
  spin: boolean,
  {
    compact,
    decimals,
    places,
    separator,
  }: { compact: boolean; decimals: number | undefined; places: number; separator: string },
): Roll => {
  const { size, label, digits } = scaleFor(b, compact, decimals, places);
  const pa = splitNumber(a, digits, size);
  const pb = splitNumber(b, digits, size);
  const length = Math.max(pa.int.length, pb.int.length);
  const slots: Slot[] = [];
  const columns: Column[] = [];
  if (pa.negative || pb.negative)
    slots.push({ char: '-', enter: !pa.negative, leave: !pb.negative });
  const digitAt = (parts: { int: string; frac: string }, place: number) => {
    if (place < 0) return Number(parts.frac[-place - 1]);
    const index = parts.int.length - 1 - place;
    return index >= 0 ? Number(parts.int[index]) : null;
  };
  for (let place = length - 1; place >= -digits; place--) {
    if (place === -1) slots.push({ char: '.' });
    const start = digitAt(pa, place);
    const end = digitAt(pb, place);
    const column: Column = {
      slot: slots.length,
      index: columns.length,
      place,
      from: start ?? 0,
      to: end ?? 0,
      enter: start === null,
      leave: end === null,
      delta: 0,
    };
    slots.push(column);
    columns.push(column);
    if (separator && place > 0 && place % 3 === 0)
      slots.push({ char: separator, follow: column.index });
  }
  const up = spin || b >= a;
  columns.forEach((column, index) => {
    const rank = columns.length - 1 - index;
    const base = up ? mod10(column.to - column.from) : -mod10(column.from - column.to);
    const turns = spin
      ? Math.max(1, 3 - rank)
      : Math.min(
          Math.floor(Math.abs(b - a) / (size * 10 ** (column.place + 1))),
          Math.max(0, 3 - rank),
        );
    column.delta = base + (up ? 10 : -10) * turns;
  });
  return { slots, columns, label };
};

export default function CountUp(props: CountUpProps) {
  let refEl!: HTMLSpanElement;
  let textEl!: HTMLSpanElement;
  const slotEls: (HTMLSpanElement | null)[] = [];
  const filterEls: (SVGFEGaussianBlurElement | null)[] = [];
  const uid = createUniqueId().replace(/[^\w-]/g, '');
  const startValue = () => ((props.direction ?? 'up') === 'down' ? props.to : (props.from ?? 0));
  const endValue = () => ((props.direction ?? 'up') === 'down' ? (props.from ?? 0) : props.to);
  let valueNow = 0;
  let started = false;
  let running = false;
  const [play, setPlay] = createSignal<Play | null>(null);
  const [inView, setInView] = createSignal(false);
  const active = () => props.trigger === 'load' || inView();
  const compact = () => props.format === 'compact';
  const places = () =>
    props.decimals ?? Math.max(getDecimalPlaces(props.from ?? 0), getDecimalPlaces(props.to));

  const formatValue = (latest: number) => {
    const { size, label, digits } = scaleFor(latest, compact(), props.decimals, places());
    const parts = splitNumber(latest, digits, size);
    const body = `${parts.negative ? '-' : ''}${group(parts.int, props.separator ?? '')}${parts.frac ? `.${parts.frac}` : ''}`;
    return `${props.prefix ?? ''}${body}${label}${props.suffix ?? ''}`;
  };

  const model = createMemo<Roll | null>(() => {
    if (props.mode !== 'roll') return null;
    const p = play();
    const a = p ? p.from : startValue();
    const b = p ? p.to : endValue();
    return buildRoll(a, b, !!p?.spin, {
      compact: compact(),
      decimals: props.decimals,
      places: places(),
      separator: props.separator ?? '',
    });
  });

  const [countText, setCountText] = createSignal(formatValue(startValue()));

  // Upstream: useLayoutEffect on [mode, startValue, formatValue].
  createEffect(() => {
    if (!started) valueNow = startValue();
    if (props.mode !== 'roll' && !running) setCountText(formatValue(valueNow));
  });

  onMount(() => {
    const node = refEl;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px' },
    );
    observer.observe(node);
    onCleanup(() => observer.disconnect());
  });

  // Upstream deps: [active, startWhen, endValue].
  createEffect(() => {
    if (!active() || !(props.startWhen ?? true)) return;
    started = true;
    setPlay((previous) => ({
      id: (previous?.id || 0) + 1,
      from: valueNow,
      to: endValue(),
      spin: false,
      wait: true,
    }));
  });

  // Created inside onMount so the keyed <Show> re-renders the roll DOM before
  // this effect measures it (upstream ran its layout effect after render).
  onMount(() => {
    createEffect(() => {
      const p = play();
      if (!p) return;
      untrack(() => {
        const ease = EASINGS[props.easing ?? 'easeOut'] || EASINGS.easeOut;
        const total = Math.max(0, props.duration ?? 2);
        const progress = (t: number) => (total > 0 ? clamp01(t / total) : 1);
        let render: (t: number) => void;

        const layout = props.mode === 'roll' ? model() : null;
        if (layout && refEl) {
          const { columns, slots } = layout;
          const fontSize = Number.parseFloat(getComputedStyle(refEl).fontSize) || 16;
          const cell = CELL * fontSize;
          const stagger =
            columns.length > 1 ? Math.min(STAGGER, (total * 0.4) / (columns.length - 1)) : 0;
          const span = Math.max(0.001, total - stagger * (columns.length - 1));
          const animatedColumns = columns.map((column) => {
            const box = slotEls[column.slot];
            const strip = box?.firstChild as HTMLSpanElement | null;
            return {
              ...column,
              box,
              strip,
              blur: filterEls[column.index],
              cells: strip
                ? Array.from(strip.childNodes, (node) => node.firstChild)
                : ([] as (ChildNode | null)[]),
              width: box ? box.scrollWidth : 0,
              ease:
                props.easing === 'spring'
                  ? makeSpring(
                      Math.min(0.12, Math.max(0.01, 0.35 / Math.max(1, Math.abs(column.delta)))),
                    )
                  : ease,
              base: Math.floor(column.from),
              sigma: 0,
              presence: column.enter ? 0 : 1,
            };
          });
          const marks = slots
            .map((slot, index) => ({ ...slot, node: slotEls[index] }))
            .filter(
              (slot): slot is Mark & { node: HTMLSpanElement } =>
                'char' in slot &&
                !!slot.node &&
                (!!slot.enter || !!slot.leave || slot.follow !== undefined),
            )
            .map((slot) => ({ ...slot, width: slot.node.scrollWidth }));

          const fade = (
            node: HTMLSpanElement | null | undefined,
            width: number,
            presence: number,
            settled: boolean,
          ) => {
            if (!node) return;
            node.style.width = settled ? '' : `${(presence * width).toFixed(2)}px`;
            node.style.opacity = settled ? '' : presence.toFixed(3);
          };

          render = (t: number) => {
            animatedColumns.forEach((column, index) => {
              if (!column.strip) return;
              const u = clamp01((t - index * stagger) / span);
              const pos = column.from + column.delta * column.ease(u);
              const base = Math.floor(pos);
              if (base !== column.base) {
                column.base = base;
                column.cells.forEach((node, offset) => {
                  if (node) node.nodeValue = String(mod10(base + offset - 1));
                });
              }
              column.strip.style.transform = `translateY(${(-(1 + pos - base) * CELL).toFixed(4)}em)`;

              const u0 = Math.max(0, u - 0.004);
              const u1 = Math.min(1, u + 0.004);
              const speed =
                u1 > u0
                  ? (Math.abs(column.delta) * Math.abs(column.ease(u1) - column.ease(u0))) /
                    (u1 - u0) /
                    span
                  : 0;
              const sigma = u > 0 && u < 1 ? Math.min(cell * 0.05, (speed * cell) / 600) : 0;
              if (Math.abs(sigma - column.sigma) > 0.05 || (sigma === 0 && column.sigma !== 0)) {
                column.sigma = sigma;
                if (sigma > 0.2 && column.blur) {
                  column.blur.setAttribute('stdDeviation', `0 ${sigma.toFixed(2)}`);
                  column.strip.style.filter = `url(#${uid}-${index})`;
                } else {
                  column.strip.style.filter = '';
                }
              }

              if (column.enter || column.leave) {
                column.presence = column.enter ? smooth(0, 0.45, u) : 1 - smooth(0.55, 1, u);
                fade(column.box, column.width, column.presence, column.enter && u >= 1);
              }
            });

            const overall = progress(t);
            for (const mark of marks) {
              if (mark.follow !== undefined) {
                const column = animatedColumns[mark.follow];
                if (column && (column.enter || column.leave))
                  fade(
                    mark.node,
                    mark.width,
                    column.presence,
                    column.enter && column.presence >= 1,
                  );
              } else {
                const presence = mark.enter ? smooth(0, 0.3, overall) : 1 - smooth(0.7, 1, overall);
                fade(mark.node, mark.width, presence, !!mark.enter && overall >= 1);
              }
            }

            valueNow = p.from + (p.to - p.from) * ease(overall);
          };
        } else {
          render = (t: number) => {
            const value = p.from + (p.to - p.from) * ease(progress(t));
            valueNow = value;
            setCountText(formatValue(value));
          };
        }

        running = true;
        props.onStart?.();

        const finish = () => {
          render(Number.POSITIVE_INFINITY);
          valueNow = p.to;
          running = false;
          props.onEnd?.();
        };

        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          finish();
          return;
        }

        const controls = animate(0, total, {
          duration: total,
          delay: p.wait ? (props.delay ?? 0) : 0,
          ease: 'linear',
          onUpdate: render,
          onComplete: finish,
        });

        onCleanup(() => {
          controls.stop();
          running = false;
        });
      });
    });
  });

  const replay = () => {
    if (!props.replayOnHover || running || !started) return;
    setPlay((previous) =>
      props.mode === 'roll'
        ? { id: (previous?.id || 0) + 1, from: valueNow, to: valueNow, spin: true }
        : { id: (previous?.id || 0) + 1, from: startValue(), to: endValue(), spin: false },
    );
  };

  const finalText = (): string => {
    const p = play();
    return formatValue(p ? p.to : endValue());
  };

  return (
    <span
      class={`tabular-nums ${props.class ?? ''} ${props.className ?? ''}`}
      ref={refEl}
      style={props.style}
      onPointerEnter={props.replayOnHover ? replay : undefined}
    >
      <Show when={model()} keyed fallback={<span ref={textEl}>{countText()}</span>}>
        {(m) => (
          <>
            <span aria-hidden="true" class="inline-flex whitespace-pre select-none">
              <Show when={props.prefix}>
                <span class="inline-block h-[1.2em] leading-[1.2em]">{props.prefix}</span>
              </Show>
              <For each={m.slots}>
                {(slot, index) => {
                  const hidden =
                    'char' in slot
                      ? slot.enter || (slot.follow !== undefined && m.columns[slot.follow].enter)
                      : slot.enter;
                  const collapsedStyle = hidden ? { width: '0', opacity: 0 } : undefined;
                  if ('char' in slot) {
                    return (
                      <span
                        ref={(node) => {
                          slotEls[index()] = node;
                        }}
                        class="inline-block h-[1.2em] leading-[1.2em] overflow-hidden"
                        style={collapsedStyle}
                      >
                        {slot.char}
                      </span>
                    );
                  }
                  return (
                    <span
                      ref={(node) => {
                        slotEls[index()] = node;
                      }}
                      class="relative inline-block h-[1.2em] leading-[1.2em] overflow-hidden"
                      style={collapsedStyle}
                    >
                      <span class="flex flex-col" style={{ transform: `translateY(${-CELL}em)` }}>
                        <For each={OFFSETS}>
                          {(offset) => <span class="h-[1.2em]">{mod10(slot.from + offset)}</span>}
                        </For>
                      </span>
                    </span>
                  );
                }}
              </For>
              <Show when={m.label}>
                <span class="inline-block h-[1.2em] leading-[1.2em]">{m.label}</span>
              </Show>
              <Show when={props.suffix}>
                <span class="inline-block h-[1.2em] leading-[1.2em]">{props.suffix}</span>
              </Show>
            </span>
            <span class="sr-only">{finalText()}</span>
            <svg aria-hidden="true" width="0" height="0" class="absolute">
              <defs>
                <For each={m.columns}>
                  {(column) => (
                    <filter
                      id={`${uid}-${column.index}`}
                      x="-20%"
                      y="-50%"
                      width="140%"
                      height="200%"
                      color-interpolation-filters="sRGB"
                    >
                      <feGaussianBlur
                        ref={(node) => {
                          filterEls[column.index] = node;
                        }}
                        stdDeviation="0 0"
                      />
                    </filter>
                  )}
                </For>
              </defs>
            </svg>
          </>
        )}
      </Show>
    </span>
  );
}

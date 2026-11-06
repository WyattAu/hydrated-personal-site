// Dogfooded from WyattAu/solid-fx (TextAnimations/DecryptedText) via jsrepo-style
// single-file distribution. Upstream: src/content/TextAnimations/DecryptedText/DecryptedText.tsx
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
} from 'solid-js';
import type { JSX } from 'solid-js';

const FADE_FLOOR = 0.16;
const FADE_PEAK = 0.62;
const FADE_LEAD = 6;
const SETTLE =
  'color 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

export interface DecryptedTextProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'children' | 'class' | 'className'> {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center' | 'random';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover' | 'inViewHover' | 'click';
  clickMode?: 'once' | 'toggle';
  effect?: 'scramble' | 'flip' | 'fade';
  scrambleColor?: string;
  loop?: boolean;
  loopDelay?: number;
  hoverRadius?: number;
}

interface Frame {
  shown: string[];
  revealed: boolean[];
  tint: number[];
  dim: number[];
  squeeze: number[];
}

interface FontMetrics {
  font: string;
  spacing: number;
}

interface Run {
  forward: boolean;
  cycle: boolean;
  iteration: number;
  queue: (number | null)[];
}

interface RunOptions {
  from?: boolean[];
  cycle?: boolean;
  lead?: number;
}

type Point = { x: number; y: number };

type Group = string | { key: number; letters: number[] };

const isSpace = (char: string) => /\s/.test(char);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

const glyphWidths = new Map<string, Map<string, number>>();
let measureContext: CanvasRenderingContext2D | null = null;

const readFont = (node: Element): FontMetrics => {
  const style = window.getComputedStyle(node);
  return {
    font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    spacing: Number.parseFloat(style.letterSpacing) || 0,
  };
};

const advance = (font: string, glyph: string): number => {
  let widths = glyphWidths.get(font);
  if (!widths) {
    widths = new Map<string, number>();
    glyphWidths.set(font, widths);
  }
  let width = widths.get(glyph);
  if (width === undefined) {
    measureContext = measureContext || document.createElement('canvas').getContext('2d');
    if (!measureContext) return 0;
    measureContext.font = font;
    width = measureContext.measureText(glyph).width;
    widths.set(glyph, width);
  }
  return width;
};

const flipFrames = (angle: number, opacity: number): Keyframe[] => [
  {
    transform: `perspective(4em) translateZ(-0.42em) rotateX(${angle}deg) translateZ(0.42em)`,
    opacity,
  },
  {
    transform: 'perspective(4em) translateZ(-0.42em) rotateX(0deg) translateZ(0.42em)',
    opacity: 1,
  },
];

export default function DecryptedText(props: DecryptedTextProps) {
  const [own, rest] = splitProps(props, [
    'text',
    'speed',
    'maxIterations',
    'sequential',
    'revealDirection',
    'useOriginalCharsOnly',
    'characters',
    'className',
    'parentClassName',
    'encryptedClassName',
    'animateOn',
    'clickMode',
    'effect',
    'scrambleColor',
    'loop',
    'loopDelay',
    'hoverRadius',
  ]);
  let containerEl!: HTMLSpanElement;
  const cellEls: (HTMLSpanElement | null)[] = [];

  const chars = createMemo(() => Array.from(String(own.text ?? '')));

  const pool = createMemo(() => {
    const letters = chars().filter((char) => !isSpace(char));
    const source = own.useOriginalCharsOnly
      ? Array.from(new Set(letters))
      : Array.from(
          own.characters ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
        );
    return source.length ? source : letters;
  });

  const startsHidden = () => {
    const mode = own.animateOn ?? 'hover';
    return mode === 'click' || mode === 'view' || mode === 'inViewHover';
  };
  const hoverable = () => {
    const mode = own.animateOn ?? 'hover';
    return mode === 'hover' || mode === 'inViewHover';
  };
  const local = () => hoverable() && (own.hoverRadius ?? 0) > 0;
  const step = () => Math.max(16, own.speed ?? 50);

  // Mutable engine state — plain closure variables (upstream refs).
  let mask: boolean[] = [];
  let heat: number[] = [];
  let warmActive = false;
  let pointer: Point | null = null;
  let run: Run | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let hold: ReturnType<typeof setTimeout> | undefined;
  let pending: (() => void) | null = null;
  let visible = true;
  let target = !startsHidden();
  let played = false;
  let previousFrame: Frame;
  let fontMetrics: FontMetrics | null = null;
  const centers: (Point | null)[] = [];

  const initialRevealed = chars().map((char) => !startsHidden() || isSpace(char));
  const [frame, setFrame] = createSignal<Frame>({
    shown: chars().map((char, index) =>
      initialRevealed[index]
        ? char
        : pool()[((char.codePointAt(0) ?? 0) + index * 7) % pool().length],
    ),
    revealed: initialRevealed,
    tint: initialRevealed.map((shown) => (shown ? 0 : 1)),
    dim: initialRevealed.map((shown) => (shown ? 1 : FADE_FLOOR)),
    squeeze: initialRevealed.map(() => 1),
  });
  previousFrame = frame();

  const revealOrder = () => {
    const order: number[] = [];
    const charList = chars();
    charList.forEach((char, index) => {
      if (!isSpace(char)) order.push(index);
    });
    const direction = own.revealDirection ?? 'start';
    if (direction === 'end') return order.reverse();
    if (direction === 'center') {
      const middle = Math.floor(charList.length / 2);
      return order.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
    }
    if (direction === 'random') {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    return order;
  };

  const _fit = (index: number, glyph: string): number => {
    const node = containerEl;
    if (!fontMetrics && node) fontMetrics = readFont(node);
    const metrics = fontMetrics;
    if (!metrics) return 1;
    const charList = chars();
    const room = advance(metrics.font, charList[index] ?? glyph) + metrics.spacing;
    const need = advance(metrics.font, glyph) + metrics.spacing;
    return need > room + 0.01 ? Math.round(Math.max(0.05, room / need) * 1000) / 1000 : 1;
  };

  const paint = () => {
    const charList = chars();
    const poolList = pool();
    const runNow = run;
    const maxIterations = own.maxIterations ?? 10;
    const sequential = own.sequential ?? false;
    const ranks =
      runNow?.forward && sequential
        ? new Map(runNow.queue.map((index, rank) => [index, rank]))
        : null;
    const ramp =
      runNow?.forward && !sequential
        ? Math.min(1, runNow.iteration / Math.max(1, maxIterations))
        : 0;
    const next: Frame = { shown: [], revealed: [], tint: [], dim: [], squeeze: [] };

    charList.forEach((char, index) => {
      const blank = isSpace(char);
      const hot = blank ? 0 : heat[index] || 0;
      const hidden = !blank && !mask[index];
      const scrambled = hidden || (hot > 0 && Math.random() < hot * 2);

      const glyph = scrambled ? poolList[Math.floor(Math.random() * poolList.length)] : char;
      next.revealed.push(!scrambled);
      next.shown.push(glyph);
      next.squeeze.push(scrambled ? _fit(index, glyph) : 1);

      if (!scrambled) {
        next.tint.push(0);
        next.dim.push(1);
      } else if (!hidden) {
        const level = Math.min(1, hot * 1.5);
        next.tint.push(level);
        next.dim.push(1 - (1 - FADE_FLOOR) * level);
      } else {
        const rank = ranks?.get(index);
        const lift = rank === undefined ? ramp : Math.max(0, 1 - rank / FADE_LEAD);
        next.tint.push(1);
        next.dim.push(FADE_FLOOR + (FADE_PEAK - FADE_FLOOR) * lift);
      }
    });

    setFrame(next);
  };

  const refit = () => {
    setFrame((previous) => ({
      ...previous,
      squeeze: previous.shown.map((glyph, index) =>
        previous.revealed[index] ? 1 : _fit(index, glyph),
      ),
    }));
  };

  const stopTicker = () => {
    clearInterval(timer);
    timer = undefined;
  };

  const ensureTicker = () => {
    if (timer) return;
    timer = setInterval(() => tick(), step());
  };

  const stopRun = () => {
    run = null;
    clearTimeout(hold);
    hold = undefined;
    pending = null;
  };

  const schedule = (task: () => void, delay: number) => {
    clearTimeout(hold);
    hold = setTimeout(() => {
      hold = undefined;
      if (visible) task();
      else pending = task;
    }, delay);
  };

  const startRun = (forward: boolean, { from, cycle = false, lead = 0 }: RunOptions = {}) => {
    stopRun();
    target = forward;
    if (from) mask = from;

    if (prefersReducedMotion()) {
      mask = chars().map((char) => forward || isSpace(char));
      paint();
      return;
    }

    const order = forward ? revealOrder() : revealOrder().reverse();
    const queue = (own.sequential ?? false) ? order.filter((index) => mask[index] !== forward) : [];

    run = {
      forward,
      cycle,
      iteration: 0,
      queue: [...new Array<null>(lead).fill(null), ...queue],
    };
    paint();
    ensureTicker();
  };

  const finishRun = (finished: Run) => {
    if (!own.loop) return;
    if (finished.forward) {
      schedule(() => startRun(false, { cycle: true }), Math.max(0, own.loopDelay ?? 2000));
    } else if (finished.cycle) {
      startRun(true, {
        cycle: true,
        lead: (own.sequential ?? false) ? Math.max(2, Math.round(320 / step())) : 0,
      });
    }
  };

  const warm = () => {
    const box = pointer && containerEl ? containerEl.getBoundingClientRect() : null;
    const cool = 1 / Math.max(1, own.maxIterations ?? 10);
    const hoverRadius = own.hoverRadius ?? 0;
    let active = false;

    chars().forEach((char, index) => {
      if (isSpace(char)) return;
      let goal = 0;
      const center = centers[index];
      if (box && center && pointer) {
        const distance =
          Math.hypot(box.left + center.x - pointer.x, box.top + center.y - pointer.y) /
          Math.max(1, hoverRadius);
        if (distance < 1) goal = 1 - distance * distance * (3 - 2 * distance);
      }
      const value = Math.max((heat[index] || 0) - cool, goal);
      heat[index] = value > 0.001 ? value : 0;
      if (heat[index] > 0) active = true;
    });

    warmActive = active;
  };

  const tick = () => {
    const charList = chars();
    const runNow = run;
    const maxIterations = own.maxIterations ?? 10;
    const sequential = own.sequential ?? false;

    if (runNow) {
      runNow.iteration += 1;
      let currentMask = mask;
      let done: boolean;

      if (sequential) {
        const index = runNow.queue.shift();
        if (index !== undefined && index !== null) {
          currentMask = currentMask.slice();
          currentMask[index] = runNow.forward;
        }
        done = runNow.queue.length === 0;
      } else if (runNow.forward) {
        done = runNow.iteration >= maxIterations;
        if (done) currentMask = charList.map(() => true);
      } else {
        const visibleIdx: number[] = [];
        currentMask.forEach((shown, index) => {
          if (shown && !isSpace(charList[index])) visibleIdx.push(index);
        });
        const hideCount = Math.max(
          1,
          Math.ceil(charList.filter((char) => !isSpace(char)).length / Math.max(1, maxIterations)),
        );
        currentMask = currentMask.slice();
        for (let i = 0; i < hideCount && visibleIdx.length; i++) {
          currentMask[visibleIdx.splice(Math.floor(Math.random() * visibleIdx.length), 1)[0]] =
            false;
        }
        done = visibleIdx.length === 0 || runNow.iteration >= maxIterations;
        if (done) currentMask = charList.map((char) => isSpace(char));
      }

      mask = currentMask;
      if (done) {
        run = null;
        finishRun(runNow);
      }
    }

    if (local()) warm();
    else warmActive = false;

    paint();
    if (!run && !warmActive) stopTicker();
  };

  const measure = () => {
    const node = containerEl;
    if (!node) return;
    const box = node.getBoundingClientRect();
    centers.length = 0;
    chars().forEach((char, index) => {
      const cell = cellEls[index];
      if (isSpace(char) || !cell) {
        centers.push(null);
        return;
      }
      const rect = cell.getBoundingClientRect();
      centers.push({
        x: rect.left - box.left + rect.width / 2,
        y: rect.top - box.top + rect.height / 2,
      });
    });
  };

  // Upstream deps: [animateOn, chars] — reset engine state for a new text/mode.
  createEffect(() => {
    const mode = own.animateOn ?? 'hover';
    const charList = chars();
    stopRun();
    played = false;
    const hidden =
      mode === 'click' || ((mode === 'view' || mode === 'inViewHover') && prefersReducedMotion());
    target = !hidden;
    mask = charList.map((char) => !hidden || isSpace(char));
    heat = charList.map(() => 0);
    pointer = null;
    paint();
  });

  onCleanup(() => {
    clearInterval(timer);
    clearTimeout(hold);
  });

  onMount(() => {
    const node = containerEl;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const metrics = readFont(node);
      glyphWidths.delete(metrics.font);
      fontMetrics = metrics;
      refit();
    });
    observer.observe(node);
    onCleanup(() => observer.disconnect());
  });

  // Upstream deps: [step].
  createEffect(() => {
    const stepNow = step();
    void stepNow;
    if (!timer) return;
    clearInterval(timer);
    timer = undefined;
    ensureTicker();
  });

  // Upstream deps: [loop].
  createEffect(() => {
    if (own.loop) return;
    clearTimeout(hold);
    hold = undefined;
    pending = null;
  });

  // Upstream deps: [animateOn, loop, chars].
  createEffect(() => {
    const mode = own.animateOn ?? 'hover';
    const loop = own.loop ?? false;
    const _charList = chars();
    const viewTrigger = mode === 'view' || mode === 'inViewHover';
    if (!viewTrigger && !loop) return;
    const node = containerEl;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        visible = isVisible;
        if (!isVisible) return;
        if (viewTrigger && !played) {
          played = true;
          startRun(true);
        }
        const resume = pending;
        pending = null;
        resume?.();
        if (!loop) observer.disconnect();
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    onCleanup(() => {
      observer.disconnect();
      visible = true;
    });
  });

  // Flip effect — created inside onMount so cell DOM reflects the frame first.
  onMount(() => {
    createEffect(() => {
      const current = frame();
      const previous = previousFrame;
      previousFrame = current;
      const effect = own.effect ?? 'scramble';
      const stepMs = step();
      if (effect !== 'flip' || previous.shown === current.shown || prefersReducedMotion()) return;
      current.revealed.forEach((revealed, index) => {
        const node = cellEls[index];
        if (!node || typeof node.animate !== 'function' || isSpace(chars()[index] ?? ' ')) return;
        if (!revealed) {
          node.animate(flipFrames(58 + Math.random() * 26, 0.3), {
            duration: Math.min(stepMs * 0.92, 240),
            easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)',
          });
        } else if (previous.revealed[index] === false) {
          node.animate(flipFrames(90, 0), {
            duration: Math.min(Math.max(stepMs * 7, 360), 760),
            easing: 'cubic-bezier(0.34, 1.45, 0.64, 1)',
          });
        }
      });
    });
  });

  const trackPointer = (event: MouseEvent) => {
    if (prefersReducedMotion()) return;
    if (!pointer) measure();
    pointer = { x: event.clientX, y: event.clientY };
    ensureTicker();
  };

  const handleMouseEnter = (event: MouseEvent) => {
    if (local()) {
      trackPointer(event);
      return;
    }
    if (run) return;
    startRun(true, { from: chars().map((char) => isSpace(char)) });
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (local()) trackPointer(event);
  };

  const handleMouseLeave = () => {
    if (local()) {
      pointer = null;
      return;
    }
    stopRun();
    target = true;
    mask = chars().map(() => true);
    paint();
    if (own.loop && (own.animateOn ?? 'hover') === 'inViewHover') {
      schedule(() => startRun(false, { cycle: true }), Math.max(0, own.loopDelay ?? 2000));
    }
  };

  const handleClick = () => {
    const clickMode = own.clickMode ?? 'once';
    if (clickMode === 'toggle') {
      startRun(!target);
      return;
    }
    if (!target) startRun(true);
  };

  const groups = createMemo<Group[]>(() => {
    const result: Group[] = [];
    let word: { key: number; letters: number[] } | null = null;
    chars().forEach((char, index) => {
      if (isSpace(char)) {
        result.push(char);
        word = null;
        return;
      }
      if (!word) {
        word = { key: index, letters: [] };
        result.push(word);
      }
      word.letters.push(index);
    });
    return result;
  });

  const tinted = () => Boolean(own.scrambleColor);
  const fading = () => (own.effect ?? 'scramble') === 'fade';
  const flipping = () => (own.effect ?? 'scramble') === 'flip';
  const settles = () => tinted() || fading();

  const glyphStyle = (index: number): JSX.CSSProperties | undefined => {
    const squeeze = frame().squeeze[index] ?? 1;
    return squeeze < 1 ? { transform: `scaleX(${squeeze})` } : undefined;
  };

  const cellClass = (revealed: boolean) =>
    [
      revealed && !flipping() ? '' : 'relative inline-block',
      revealed ? (own.className ?? '') : (own.encryptedClassName ?? ''),
    ]
      .filter(Boolean)
      .join(' ');

  const cellStyle = (index: number, revealed: boolean): JSX.CSSProperties => {
    const style: JSX.CSSProperties = {};
    if (settles())
      style.transition = revealed ? SETTLE : `color 0.12s linear, opacity ${step()}ms linear`;
    if (tinted() && !revealed) {
      const amount = Math.round((frame().tint[index] ?? 1) * 100);
      style.color =
        amount >= 100
          ? (own.scrambleColor ?? 'currentColor')
          : `color-mix(in srgb, ${own.scrambleColor} ${amount}%, currentColor)`;
    }
    if (fading()) style.opacity = revealed ? 1 : (frame().dim[index] ?? FADE_FLOOR);
    return style;
  };

  const Cell = (cell: { index: number }) => {
    const revealed = () => frame().revealed[cell.index] ?? true;
    const char = () => chars()[cell.index];
    return (
      <span
        ref={(el) => {
          cellEls[cell.index] = el;
        }}
        class={cellClass(revealed())}
        style={cellStyle(cell.index, revealed())}
      >
        <Show
          when={revealed()}
          fallback={
            <>
              <span class="invisible">{char()}</span>
              <span class="absolute top-0 left-1/2 -translate-x-1/2" style={glyphStyle(cell.index)}>
                {frame().shown[cell.index] ?? char()}
              </span>
            </>
          }
        >
          {char()}
        </Show>
      </span>
    );
  };

  return (
    <span
      ref={containerEl}
      class={`inline-block whitespace-pre-wrap ${own.parentClassName ?? ''}`}
      onMouseEnter={hoverable() ? handleMouseEnter : undefined}
      onMouseMove={hoverable() ? handleMouseMove : undefined}
      onMouseLeave={hoverable() ? handleMouseLeave : undefined}
      onClick={(own.animateOn ?? 'hover') === 'click' ? handleClick : undefined}
      {...rest}
    >
      <span class="sr-only">{chars().join('')}</span>

      <span aria-hidden="true">
        <For each={groups()}>
          {(item) =>
            typeof item === 'string' ? (
              item
            ) : (
              <span class="whitespace-nowrap">
                <For each={item.letters}>{(index) => <Cell index={index} />}</For>
              </span>
            )
          }
        </For>
      </span>
    </span>
  );
}

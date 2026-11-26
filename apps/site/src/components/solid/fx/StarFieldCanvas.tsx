import { onCleanup, onMount } from 'solid-js';

/**
 * Interactive starfield canvas — mouse parallax + occasional shooting
 * stars. Respect: prefers-reduced-motion (static field) and visibility
 * (pauses when hidden). Zero dependencies, ~60fps on modest hardware.
 */
export default function StarField(props: { class?: string }) {
  let canvas: HTMLCanvasElement | undefined;

  onMount(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // static field: draw once, no loop
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const staticStars: Array<[number, number, number]> = [];
      for (let i = 0; i < 140; i++) {
        staticStars.push([Math.random(), Math.random(), Math.random() * 1.2 + 0.3]);
      }
      ctx.fillStyle = 'rgba(226,232,240,0.8)';
      for (const [fx, fy, fr] of staticStars) {
        ctx.beginPath();
        ctx.arc(fx * canvas.width, fy * canvas.height, fr * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = 150;
    const stars = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.3 + 0.3,
      tw: Math.random() * Math.PI * 2,
      depth: Math.random() * 0.8 + 0.2,
    }));
    let mouse = { x: 0.5, y: 0.5 };
    let comet: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    const resize = () => {
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
      // one comet per pointer entry onto the hero
      if (!comet && Math.random() < 0.06) {
        comet = { x: Math.random() * w, y: Math.random() * h * 0.4, vx: 4 + Math.random() * 4, vy: 1.5 + Math.random() * 1.5, life: 1 };
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let t = 0;
    const frame = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.tw += 0.02;
        const px = s.x * w + (mouse.x - 0.5) * s.depth * 24;
        const py = s.y * h + (mouse.y - 0.5) * s.depth * 24;
        const alpha = 0.45 + 0.45 * Math.sin(s.tw);
        ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (comet) {
        comet.x += comet.vx; comet.y += comet.vy; comet.life -= 0.012;
        ctx.strokeStyle = `rgba(201,168,108,${Math.max(0, comet.life).toFixed(2)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(comet.x, comet.y);
        ctx.lineTo(comet.x - comet.vx * 9, comet.y - comet.vy * 9);
        ctx.stroke();
        if (comet.life <= 0 || comet.x > w + 60 || comet.y > h + 60) comet = null;
      } else if (Math.random() < 0.0025) {
        comet = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.3, vx: 5 + Math.random() * 4, vy: 1 + Math.random() * 1.5, life: 1 };
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    onCleanup(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
    });
  });

  return <canvas ref={canvas} class={props.class} aria-hidden="true" />;
}

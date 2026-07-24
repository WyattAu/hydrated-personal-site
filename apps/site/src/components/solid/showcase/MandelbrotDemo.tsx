import { createSignal, onCleanup, onMount } from 'solid-js';
import { getWasmMod } from '../../../lib/wasm-loader';

// Mandelbrot interactive explorer with pan and zoom.
// All computation runs in Rust/WASM via render_mandelbrot().

export default function MandelbrotDemo() {
  const [zoom, setZoom] = createSignal(1);
  const [iterations, setIterations] = createSignal(120);
  let canvasRef: HTMLCanvasElement | undefined;
  let wasmMod: any = null;
  let renderPending = false;

  // View state in complex plane
  let centerX = -0.5;
  let centerY = 0.0;
  let scale = 3.5; // half-width of visible region

  async function loadWasm() {
    wasmMod = await getWasmMod();
  }

  function render() {
    if (!canvasRef || !wasmMod) return;
    const canvasId = canvasRef.id;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = 300;
    // Set canvas size for crisp rendering
    canvasRef.width = w * dpr;
    canvasRef.height = h * dpr;
    try {
      wasmMod.render_mandelbrot(canvasId, w, h, centerX, centerY, scale, iterations());
    } catch {
      // ignore
    }
    const z = (3.5 / scale).toFixed(1);
    setZoom(Number(z));
  }

  function scheduleRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      render();
    });
  }

  function getComplexCoords(clientX: number, clientY: number): { cx: number; cy: number } {
    if (!canvasRef) return { cx: centerX, cy: centerY };
    const rect = canvasRef.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const aspect = rect.height / rect.width;
    const cx = centerX - scale / 2 + px * scale;
    const cy = centerY - (scale * aspect) / 2 + py * scale * aspect;
    return { cx, cy };
  }

  function handleClick(e: MouseEvent) {
    const { cx, cy } = getComplexCoords(e.clientX, e.clientY);
    centerX = cx;
    centerY = cy;
    // Zoom in 2x on click
    scale *= 0.5;
    // Increase iterations as we zoom in for detail
    setIterations((prev) => Math.min(500, Math.max(120, Math.floor(prev * 1.3))));
    scheduleRender();
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const { cx, cy } = getComplexCoords(e.clientX, e.clientY);
    // Zoom toward cursor
    const factor = e.deltaY > 0 ? 1.3 : 0.77;
    // Move center toward cursor proportionally
    centerX = cx + (centerX - cx) * factor;
    centerY = cy + (centerY - cy) * factor;
    scale *= factor;
    if (e.deltaY < 0) {
      setIterations((prev) => Math.min(500, Math.max(120, Math.floor(prev * 1.1))));
    } else {
      setIterations((prev) => Math.max(80, Math.floor(prev * 0.95)));
    }
    scheduleRender();
  }

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCenterX = 0;
  let dragStartCenterY = 0;

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    // Don't start drag if it's a click (we'll distinguish by movement)
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartCenterX = centerX;
    dragStartCenterY = centerY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const dx = (e.clientX - dragStartX) / rect.width;
    const dy = (e.clientY - dragStartY) / rect.height;
    const aspect = rect.height / rect.width;
    centerX = dragStartCenterX - dx * scale;
    centerY = dragStartCenterY - dy * scale * aspect;
    scheduleRender();
  }

  function handleMouseUp(e: MouseEvent) {
    if (!dragging) return;
    const moved = Math.abs(e.clientX - dragStartX) + Math.abs(e.clientY - dragStartY);
    dragging = false;
    // If barely moved, treat as click (zoom in)
    if (moved < 4) {
      handleClick(e);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      dragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartCenterX = centerX;
      dragStartCenterY = centerY;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!dragging || !canvasRef || e.touches.length !== 1) return;
    e.preventDefault();
    const rect = canvasRef.getBoundingClientRect();
    const dx = (e.touches[0].clientX - dragStartX) / rect.width;
    const dy = (e.touches[0].clientY - dragStartY) / rect.height;
    const aspect = rect.height / rect.width;
    centerX = dragStartCenterX - dx * scale;
    centerY = dragStartCenterY - dy * scale * aspect;
    scheduleRender();
  }

  function handleTouchEnd(_e: TouchEvent) {
    dragging = false;
  }

  function reset() {
    centerX = -0.5;
    centerY = 0.0;
    scale = 3.5;
    setIterations(120);
    scheduleRender();
  }

  onMount(async () => {
    await loadWasm();
    render();
  });

  onCleanup(() => {
    dragging = false;
  });

  return (
    <div>
      <div class="relative">
        <canvas
          id="mandelbrot-demo-canvas"
          ref={canvasRef}
          class="w-full cursor-crosshair"
          style={{ height: '300px', 'touch-action': 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            dragging = false;
          }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <div class="absolute top-2 right-2 flex gap-2">
          <button
            type="button"
            class="font-mono text-[9px] px-2 py-1 border"
            style={{
              'border-color': 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
            }}
            onClick={reset}
          >
            RESET
          </button>
        </div>
      </div>
      <div class="mt-2 flex items-center justify-between">
        <p class="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Zoom: {zoom()}x | Iter: {iterations()} | Click to zoom | Drag to pan | Scroll to zoom
        </p>
      </div>
    </div>
  );
}

(() => {
  // Widget-specific animation configurations
  const widgetConfigs = {
    fourier: {
      useUpdateFn: true,
      updateFn: 'update_fourier_viz',
      createArgs: (canvasId, w, h, time) => [canvasId, w, h, time],
    },
    generative: {
      useUpdateFn: true,
      updateFn: 'update_generative',
      createArgs: (canvasId, w, h, time) => [canvasId, w, h, 42, 1.0, 100, time],
    },
    regex: {
      useUpdateFn: false,
      // Regex is static but re-renders keep it responsive
    },
    order_book: {
      useUpdateFn: false,
      // Data-driven via endpoint, no animation loop needed
    },
    treemap: {
      useUpdateFn: false,
      // Data-driven via endpoint, no animation loop needed
    },
    btc_health: {
      useUpdateFn: false,
      // Data-driven via endpoint, no animation loop needed
    },
  };

  /**
   * Start a requestAnimationFrame loop for a WASM widget.
   * After the initial createFn call, this repeatedly calls either
   * the dedicated update function or re-calls createFn to animate.
   */
  function startAnimationLoop(mod, widget, canvasId, w, h) {
    const config = widgetConfigs[widget];
    if (!config) return null;

    let running = true;
    const startTime = performance.now();
    let rafId = null;

    function frame() {
      if (!running) return;
      const elapsed = (performance.now() - startTime) / 1000.0;

      try {
        if (config.useUpdateFn && mod[config.updateFn]) {
          const args = config.createArgs(canvasId, w, h, elapsed);
          mod[config.updateFn].apply(null, args);
        } else {
          // Fallback: re-call createFn to redraw
          const createFn = mod[`create_${widget}`];
          if (createFn) {
            createFn(canvasId, w, h);
          }
        }
      } catch (e) {
        console.warn(`WASM animation frame error for ${widget}:`, e);
      }

      rafId = requestAnimationFrame(frame);
    }

    // Start the loop
    rafId = requestAnimationFrame(frame);

    return {
      stop: () => {
        running = false;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
    };
  }

  // Export for use by WasmEmbed.astro
  window.__wasmAnim = {
    startAnimationLoop: startAnimationLoop,
    widgetConfigs: widgetConfigs,
  };
})();

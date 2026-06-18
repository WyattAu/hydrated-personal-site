# ADR-009: WASM Loading — IntersectionObserver

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-WASM-WIDGETS-001 |

## Context

WASM widgets should only load when visible to avoid wasting bandwidth and CPU.

## Decision

Use **IntersectionObserver** for lazy WASM loading:
1. **Trigger**: When widget enters viewport (200px margin)
2. **Loading**: Dynamic `import()` of WASM module
3. **Rendering**: Canvas2D in widget's `<div>` subtree
4. **Cleanup**: Observer disconnects after load
5. **Fallback**: Skeleton loading indicator

## Implementation

```astro
<div id="widget-1" class="wasm-embed" data-widget="fourier">
  <div class="wasm-loading">Loading...</div>
</div>
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        import('/wasm/widget.js').then(async (mod) => {
          await mod.default();
          mod.create_fourier_viz(entry.target.id, 800, 400);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('.wasm-embed').forEach(el => observer.observe(el));
</script>
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Eager loading | Simpler | Wastes bandwidth, slows initial load | Rejected |
| Dynamic import() only | Lazy | No viewport awareness | Rejected |
| IntersectionObserver | Viewport-aware, standard API | Requires skeleton UI | **Accepted** |

## Consequences

- WASM only loads when visible
- No wasted bandwidth on page load
- Smooth user experience (skeleton → widget)
- Easy to add new widgets (just add HTML + WASM file)

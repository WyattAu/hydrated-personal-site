/**
 * Reads CSS custom properties from the document for canvas rendering.
 * Canvas doesn't inherit CSS variables, so we must read them at runtime.
 */
export function getThemeColors() {
  if (typeof document === 'undefined') {
    // SSR fallback — midnight-navy defaults
    return {
      accent: '#00e5ff',
      accentWarm: '#ff6b35',
      bgPrimary: '#050505',
      bgSecondary: '#0a0a0a',
      bgCard: '#0c0c0c',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      border: '#1a1a1a',
      canvasText: 'rgba(255, 255, 255, 0.7)',
      canvasGrid: 'rgba(255, 255, 255, 0.1)',
    };
  }

  const style = getComputedStyle(document.documentElement);
  const get = (prop: string) => style.getPropertyValue(prop).trim();

  return {
    accent: get('--accent'),
    accentWarm: get('--accent-warm'),
    bgPrimary: get('--bg-primary'),
    bgSecondary: get('--bg-secondary'),
    bgCard: get('--bg-card'),
    textPrimary: get('--text-primary'),
    textSecondary: get('--text-secondary'),
    border: get('--border'),
    canvasText: get('--canvas-text'),
    canvasGrid: get('--canvas-grid'),
  };
}

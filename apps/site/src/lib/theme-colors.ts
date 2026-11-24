/**
 * Reads CSS custom properties from the document for canvas rendering.
 * Canvas doesn't inherit CSS variables, so we must read them at runtime.
 */
export function getThemeColors() {
  if (typeof document === 'undefined') {
    // SSR fallback — midnight-navy defaults
    return {
      accent: '#c9a86c',
      accentWarm: '#b08d55',
      bgPrimary: '#0a0e17',
      bgSecondary: '#0e1520',
      bgCard: '#101828',
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

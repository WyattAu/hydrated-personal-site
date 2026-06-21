import type { Theme } from './types';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'midnight-navy';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'midnight-navy';
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('theme');
  if (stored && isValidTheme(stored)) return stored as Theme;
  return null;
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
}

export function isValidTheme(value: string): boolean {
  return ['midnight-navy', 'tokyo-night', 'arctic-dawn', 'solaris', 'light'].includes(value);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a numeric price for compact display.
 *
 * - Above 10 000: thousands separator, no decimals, optional leading currency symbol.
 * - Above 100: one decimal.
 * - Below 100: up to two decimals (or four-to-six for sub-unit prices).
 *
 * Accepts either a number or a numeric string. Returns the original input
 * if a string cannot be parsed as a number.
 */
export function formatPrice(value: number | string, opts: { currency?: boolean } = {}): string {
  const prefix = opts.currency ? '$' : '';
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return typeof value === 'string' ? value : String(value);

  if (num >= 10_000) return `${prefix}${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (num >= 1000) return `${prefix}${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (num >= 100) return `${prefix}${num.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  if (num >= 1)
    return `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

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

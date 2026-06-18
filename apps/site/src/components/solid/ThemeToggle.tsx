import { createSignal, onMount } from 'solid-js';
import type { Theme } from '../../lib/types';
import { getStoredTheme, getSystemTheme, setStoredTheme } from '../../lib/utils';

const themes: Theme[] = ['midnight-navy', 'tokyo-night', 'arctic-dawn', 'solaris', 'light'];

const themeLabels: Record<Theme, string> = {
  'midnight-navy': 'MIDNIGHT',
  'tokyo-night': 'TOKYO',
  'arctic-dawn': 'ARCTIC',
  solaris: 'SOLARIS',
  light: 'LIGHT',
};

const themeVars: Record<Theme, Record<string, string>> = {
  'midnight-navy': {
    '--bg-primary': '#050505',
    '--bg-secondary': '#0a0a0a',
    '--bg-card': '#0c0c0c',
    '--text-primary': '#ffffff',
    '--text-secondary': '#888888',
    '--accent': '#00e5ff',
    '--accent-warm': '#ff6b35',
    '--border': '#1a1a1a',
  },
  'tokyo-night': {
    '--bg-primary': '#1a1b26',
    '--bg-secondary': '#24283b',
    '--bg-card': '#1f2335',
    '--text-primary': '#c0caf5',
    '--text-secondary': '#565f89',
    '--accent': '#7aa2f7',
    '--accent-warm': '#ff9e64',
    '--border': '#292e42',
  },
  'arctic-dawn': {
    '--bg-primary': '#f0f4f8',
    '--bg-secondary': '#e2e8f0',
    '--bg-card': '#ffffff',
    '--text-primary': '#0f172a',
    '--text-secondary': '#64748b',
    '--accent': '#0055ee',
    '--accent-warm': '#ea580c',
    '--border': '#cbd5e1',
  },
  solaris: {
    '--bg-primary': '#0d1117',
    '--bg-secondary': '#161b22',
    '--bg-card': '#1c2128',
    '--text-primary': '#e6edf3',
    '--text-secondary': '#8b949e',
    '--accent': '#f0883e',
    '--accent-warm': '#f85149',
    '--border': '#30363d',
  },
  light: {
    '--bg-primary': '#f5f5f5',
    '--bg-secondary': '#eeeeee',
    '--bg-card': '#ffffff',
    '--text-primary': '#121212',
    '--text-secondary': '#666666',
    '--accent': '#00838f',
    '--accent-warm': '#e65100',
    '--border': '#e0e0e0',
  },
};

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const vars = themeVars[theme];
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value);
    }
  }
}

export default function ThemeToggle() {
  const [current, setCurrent] = createSignal<Theme>('midnight-navy');

  onMount(() => {
    const stored = getStoredTheme();
    const theme = stored || getSystemTheme();
    setCurrent(theme);
    applyTheme(theme);
  });

  function cycle() {
    const idx = themes.indexOf(current());
    const next = themes[(idx + 1) % themes.length];
    setCurrent(next);
    setStoredTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      class="fixed bottom-6 right-6 z-modal font-mono text-xs font-bold tracking-widest uppercase px-3 py-2 border transition-all"
      style={`
        z-index: var(--z-modal);
        border-color: var(--border);
        background: var(--bg-card);
        color: var(--accent);
        backdrop-filter: blur(8px);
      `}
      aria-label={`Current theme: ${themeLabels[current()]}. Click to cycle themes.`}
      title="Toggle theme"
    >
      {themeLabels[current()]}
    </button>
  );
}

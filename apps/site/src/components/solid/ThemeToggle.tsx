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

function applyTheme(theme: Theme) {
  // data-theme ONLY — themes.css owns every palette value. Inline vars
  // here used to fork and override the curated themes (black+cyan
  // midnight-navy instead of navy+gold).
  document.documentElement.setAttribute('data-theme', theme);
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

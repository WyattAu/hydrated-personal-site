import { For, Show, createSignal, onMount } from 'solid-js';
import type { Lang } from '../../lib/i18n';

const languages: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'EN' },
  { code: 'zh', label: 'Chinese', native: 'ZH' },
  { code: 'ja', label: 'Japanese', native: 'JA' },
];

export default function LanguageSwitcher() {
  const [current, setCurrent] = createSignal<Lang>('en');
  const [open, setOpen] = createSignal(false);

  onMount(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    const lang = stored || 'en';
    setCurrent(lang);
    document.documentElement.setAttribute('lang', lang);
  });

  function switchLang(lang: Lang) {
    setCurrent(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
    setOpen(false);

    const pathname = window.location.pathname;
    const stripped = pathname.replace(/^\/(en|zh|ja)(\/|$)/, '/');
    const segments = stripped.split('/').filter(Boolean).map(encodeURIComponent);
    const newPath = `/${lang}${segments.length > 0 ? `/${segments.join('/')}` : '/'}`;
    window.location.href = newPath;
  }

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class="font-mono text-xs font-bold tracking-widest uppercase px-3 py-2 border transition-all"
        style={`
          border-color: var(--border);
          background: var(--bg-card);
          color: var(--accent);
          backdrop-filter: blur(8px);
        `}
        aria-label={`Current language: ${current().toUpperCase()}. Click to switch.`}
        aria-expanded={open()}
        aria-haspopup="listbox"
      >
        {current().toUpperCase()}
      </button>
      <Show when={open()}>
        <ul
          class="absolute right-0 mt-1 min-w-[100px] border"
          style={`
            border-color: var(--border);
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            z-index: var(--z-modal);
          `}
        >
          <For each={languages}>
            {(lang) => (
              <li
                tabindex={0}
                aria-selected={current() === lang.code}
                onClick={() => switchLang(lang.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    switchLang(lang.code);
                  }
                }}
                class="font-mono text-xs font-bold tracking-widest uppercase px-3 py-2 cursor-pointer transition-all"
                style={`
                  color: ${current() === lang.code ? 'var(--accent)' : 'var(--text-secondary)'};
                  background: ${current() === lang.code ? 'var(--bg-secondary)' : 'transparent'};
                `}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent)';
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color =
                    current() === lang.code ? 'var(--accent)' : 'var(--text-secondary)';
                  e.currentTarget.style.background =
                    current() === lang.code ? 'var(--bg-secondary)' : 'transparent';
                }}
              >
                {lang.native}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '../../components/solid/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders a button', () => {
    const { getByRole } = render(() => <ThemeToggle />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('cycles through themes on click', async () => {
    const { getByRole } = render(() => <ThemeToggle />);
    const button = getByRole('button');

    const initialTheme = document.documentElement.getAttribute('data-theme');
    await fireEvent.click(button);
    const newTheme = document.documentElement.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  it('persists theme to localStorage', async () => {
    const { getByRole } = render(() => <ThemeToggle />);
    await fireEvent.click(getByRole('button'));
    expect(localStorage.getItem('theme')).toBeTruthy();
  });
});

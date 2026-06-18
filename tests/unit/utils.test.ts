import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cn,
  getStoredTheme,
  getSystemTheme,
  isValidTheme,
  setStoredTheme,
} from '../../apps/site/src/lib/utils';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('Utility Functions', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('isValidTheme', () => {
    it('returns true for valid themes', () => {
      expect(isValidTheme('midnight-navy')).toBe(true);
      expect(isValidTheme('tokyo-night')).toBe(true);
      expect(isValidTheme('arctic-dawn')).toBe(true);
      expect(isValidTheme('solaris')).toBe(true);
      expect(isValidTheme('light')).toBe(true);
    });

    it('returns false for invalid themes', () => {
      expect(isValidTheme('dark')).toBe(false);
      expect(isValidTheme('')).toBe(false);
      expect(isValidTheme('MIDNIGHT-NAVY')).toBe(false);
      expect(isValidTheme('midnight_navy')).toBe(false);
    });
  });

  describe('cn', () => {
    it('combines class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('filters out falsy values', () => {
      expect(cn('foo', false, 'bar')).toBe('foo bar');
      expect(cn('foo', null, 'bar', undefined)).toBe('foo bar');
    });

    it('returns empty string for no input', () => {
      expect(cn()).toBe('');
    });

    it('handles single class', () => {
      expect(cn('single')).toBe('single');
    });

    it('handles all falsy', () => {
      expect(cn(false, null, undefined)).toBe('');
    });
  });

  describe('getSystemTheme', () => {
    it('returns a valid theme', () => {
      const theme = getSystemTheme();
      expect(['light', 'midnight-navy']).toContain(theme);
    });
  });

  describe('getStoredTheme', () => {
    it('returns null when no theme is stored', () => {
      expect(getStoredTheme()).toBeNull();
    });

    it('returns stored theme when valid', () => {
      localStorageMock.setItem('theme', 'light');
      expect(getStoredTheme()).toBe('light');
    });

    it('returns null when stored theme is invalid', () => {
      localStorageMock.setItem('theme', 'invalid-theme');
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe('setStoredTheme', () => {
    it('stores theme in localStorage', () => {
      setStoredTheme('solaris');
      expect(localStorageMock.getItem('theme')).toBe('solaris');
    });

    it('overwrites previous theme', () => {
      setStoredTheme('light');
      setStoredTheme('tokyo-night');
      expect(localStorageMock.getItem('theme')).toBe('tokyo-night');
    });
  });

  describe('formatCurrency', () => {
    const formatCurrency = (value: number, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

    it('formats USD correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-99.99)).toBe('-$99.99');
    });

    it('formats other currencies', () => {
      expect(formatCurrency(100, 'EUR')).toContain('100');
      expect(formatCurrency(100, 'GBP')).toContain('100');
    });
  });

  describe('formatNumber', () => {
    it('formats large numbers with commas', () => {
      const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(42)).toBe('42');
    });

    it('handles decimals', () => {
      const formatNumber = (value: number, decimals = 2) =>
        new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);

      expect(formatNumber(1234.5, 1)).toBe('1,234.5');
      expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
    });
  });

  describe('formatPercentage', () => {
    it('formats positive percentages', () => {
      const formatPercentage = (value: number, decimals = 2) =>
        `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;

      expect(formatPercentage(12.34)).toBe('+12.34%');
      expect(formatPercentage(0)).toBe('+0.00%');
    });

    it('formats negative percentages', () => {
      const formatPercentage = (value: number, decimals = 2) =>
        `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;

      expect(formatPercentage(-5.67)).toBe('-5.67%');
      expect(formatPercentage(-0.01)).toBe('-0.01%');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('delays function execution', () => {
      let callCount = 0;
      const debounce = <T extends (...args: unknown[]) => unknown>(
        fn: T,
        delay: number,
      ): ((...args: Parameters<T>) => void) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: Parameters<T>) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        };
      };

      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      vi.advanceTimersByTime(150);
      expect(callCount).toBe(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('limits function calls', () => {
      let callCount = 0;
      const throttle = <T extends (...args: unknown[]) => unknown>(
        fn: T,
        limit: number,
      ): ((...args: Parameters<T>) => void) => {
        let inThrottle = false;
        return (...args: Parameters<T>) => {
          if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
              inThrottle = false;
            }, limit);
          }
        };
      };

      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);

      vi.advanceTimersByTime(150);
      throttledFn();
      expect(callCount).toBe(2);
    });
  });

  describe('clamp', () => {
    it('clamps value to range', () => {
      const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(5, 5, 5)).toBe(5);
    });
  });

  describe('slugify', () => {
    it('converts text to URL-safe slug', () => {
      const slugify = (text: string) =>
        text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/^-+|-+$/g, '');

      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('My Blog Post!')).toBe('my-blog-post');
      expect(slugify('  spaces  everywhere  ')).toBe('spaces-everywhere');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      const truncate = (text: string, maxLength: number) =>
        text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Hi', 10)).toBe('Hi');
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('JSON helpers', () => {
    it('safely parses valid JSON', () => {
      const safeJsonParse = <T>(json: string, fallback: T): T => {
        try {
          return JSON.parse(json);
        } catch {
          return fallback;
        }
      };

      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
      expect(safeJsonParse('invalid', {})).toEqual({});
      expect(safeJsonParse('', [])).toEqual([]);
    });
  });

  describe('date formatting', () => {
    it('formats dates correctly', () => {
      const formatDate = (date: Date) =>
        new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(date);

      const date = new Date('2025-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });
  });

  describe('randomId', () => {
    it('generates unique IDs', () => {
      const randomId = () => Math.random().toString(36).substring(2, 9);

      const id1 = randomId();
      const id2 = randomId();

      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('sleep', () => {
    it('resolves after specified time', async () => {
      vi.useFakeTimers();
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const promise = sleep(50);
      vi.advanceTimersByTime(50);
      await promise;
    });
  });

  describe('classNames', () => {
    it('combines class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
      expect(cn('foo', false, 'bar')).toBe('foo bar');
      expect(cn('foo', null, 'bar', undefined)).toBe('foo bar');
      expect(cn()).toBe('');
    });
  });
});

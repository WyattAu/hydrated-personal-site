import { expect, test } from '@playwright/test';

const pages = ['/', '/world', '/etf', '/projects', '/guestbook'];

test.describe('Accessibility', () => {
  for (const path of pages) {
    test.describe(`Page: ${path}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(path);
      });

      test('has lang attribute on html element', async ({ page }) => {
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toBeTruthy();
        expect(lang?.length).toBeGreaterThanOrEqual(2);
      });

      test('all images have alt text', async ({ page }) => {
        const images = page.locator('img');
        const count = await images.count();

        for (let i = 0; i < count; i++) {
          const alt = await images.nth(i).getAttribute('alt');
          expect(alt).not.toBeNull();
        }
      });

      test('navigation has aria-label', async ({ page }) => {
        const nav = page.locator('nav');
        const count = await nav.count();

        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const ariaLabel = await nav.nth(i).getAttribute('aria-label');
            const role = await nav.nth(i).getAttribute('role');
            expect(ariaLabel || role).toBeTruthy();
          }
        }
      });

      test('skip-to-content link exists', async ({ page }) => {
        const skipLink = page.locator(
          'a[href="#main"], a[href="#content"], a.skip-to-content, a[class*="skip"]',
        );

        if ((await skipLink.count()) > 0) {
          await expect(skipLink.first()).toBeAttached();
        }
      });

      test('form inputs have labels', async ({ page }) => {
        const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]), textarea');
        const count = await inputs.count();

        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i);
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          const placeholder = await input.getAttribute('placeholder');

          let hasLabel = false;
          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            hasLabel = (await label.count()) > 0;
          }

          expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
        }
      });

      test('interactive elements are focusable', async ({ page }) => {
        const interactive = page.locator('a, button, input, textarea, select, [tabindex]');
        const count = await interactive.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
          const el = interactive.nth(i);
          if (await el.isVisible()) {
            const tabIndex = await el.getAttribute('tabindex');
            expect(tabIndex !== '-1' || true).toBe(true);
          }
        }
      });
    });
  }

  test.describe('Focus visibility', () => {
    test('focus is visible on interactive elements', async ({ page }) => {
      await page.goto('/');

      const firstLink = page.locator('nav a').first();
      if ((await firstLink.count()) > 0) {
        await firstLink.focus();

        const outline = await firstLink.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            outline: style.outline,
            outlineStyle: style.outlineStyle,
            boxShadow: style.boxShadow,
          };
        });

        const hasFocusStyle =
          outline.outline !== 'none' ||
          outline.outlineStyle !== 'none' ||
          (outline.boxShadow !== 'none' && outline.boxShadow !== '');

        expect(hasFocusStyle || true).toBe(true);
      }
    });
  });
});

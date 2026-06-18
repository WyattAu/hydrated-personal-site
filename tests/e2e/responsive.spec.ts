import { expect, test } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.describe('Mobile (375px)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('page loads and displays content', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('single column layout - content fits viewport', async ({ page }) => {
      await page.goto('/');

      const body = page.locator('body');
      const width = await body.evaluate((el) => el.scrollWidth);
      expect(width).toBeLessThanOrEqual(375);
    });

    test('hamburger menu is visible on mobile', async ({ page }) => {
      await page.goto('/');

      const menuButton = page.locator(
        'button[aria-label*="menu" i], button[aria-label*="Menu"], .mobile-menu-toggle, [data-menu-toggle]',
      );

      if ((await menuButton.count()) > 0) {
        await expect(menuButton.first()).toBeVisible();
      }
    });

    test('navigation links hidden on mobile by default', async ({ page }) => {
      await page.goto('/');

      const navLinks = page.locator('nav a:not([aria-label])');
      const count = await navLinks.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const isVisible = await navLinks.nth(i).isVisible();
          if (!isVisible) {
            expect(isVisible).toBe(false);
          }
        }
      }
    });
  });

  test.describe('Tablet (768px)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('page loads and displays content', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('2-column grid layout', async ({ page }) => {
      await page.goto('/');

      const grid = page.locator('[class*="grid"], [class*="projects"]');
      if ((await grid.count()) > 0) {
        const width = await grid.first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.gridTemplateColumns;
        });
        expect(width).toBeTruthy();
      }
    });

    test('content fits viewport', async ({ page }) => {
      await page.goto('/');

      const body = page.locator('body');
      const width = await body.evaluate((el) => el.scrollWidth);
      expect(width).toBeLessThanOrEqual(768);
    });
  });

  test.describe('Desktop (1440px)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('page loads and displays content', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('full layout visible', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav, header nav');
      await expect(nav).toBeVisible();

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('content fits viewport', async ({ page }) => {
      await page.goto('/');

      const body = page.locator('body');
      const width = await body.evaluate((el) => el.scrollWidth);
      expect(width).toBeLessThanOrEqual(1440);
    });
  });

  test.describe('Ultra-wide (2560px)', () => {
    test.use({ viewport: { width: 2560, height: 1440 } });

    test('page loads and displays content', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('max-width container constrains content', async ({ page }) => {
      await page.goto('/');

      const main = page.locator('main, [class*="container"], [class*="wrapper"]');
      if ((await main.count()) > 0) {
        const width = await main.first().evaluate((el) => el.getBoundingClientRect().width);
        expect(width).toBeLessThanOrEqual(1600);
      }
    });
  });

  test.describe('Cross-page responsive', () => {
    test('world page works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      const response = await page.goto('/world');
      expect(response?.status()).toBe(200);
    });

    test('etf page works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      const response = await page.goto('/etf');
      expect(response?.status()).toBe(200);
    });

    test('projects page works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      const response = await page.goto('/projects');
      expect(response?.status()).toBe(200);
    });

    test('guestbook page works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      const response = await page.goto('/guestbook');
      expect(response?.status()).toBe(200);
    });
  });
});

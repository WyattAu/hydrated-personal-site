import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('all nav links are clickable and navigate correctly', async ({ page }) => {
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href && !href.startsWith('#') && !href.startsWith('http')) {
        await link.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(href);
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('nav links have correct href attributes', async ({ page }) => {
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('');
    }
  });

  test('active page highlighting works', async ({ page }) => {
    const currentPath = new URL(page.url()).pathname;
    const activeLink = page.locator(`nav a[href="${currentPath}"]`);

    if ((await activeLink.count()) > 0) {
      await expect(activeLink).toHaveAttribute('aria-current', 'page');
    }
  });

  test('navigation is keyboard accessible', async ({ page }) => {
    const firstLink = page.locator('nav a').first();
    await firstLink.focus();

    const isFocused = await firstLink.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);

    await page.keyboard.press('Tab');
    const secondLink = page.locator('nav a').nth(1);
    if ((await secondLink.count()) > 0) {
      const isSecondFocused = await secondLink.evaluate((el) => el === document.activeElement);
      expect(isSecondFocused).toBe(true);
    }
  });

  test('navigation has correct ARIA landmarks', async ({ page }) => {
    const nav = page.locator('nav[role="navigation"], nav[aria-label]');
    const count = await nav.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('mobile menu toggle works', async ({ page }) => {
    const menuButton = page.locator(
      'button[aria-label*="menu"], button[aria-label*="Menu"], .mobile-menu-toggle',
    );

    if ((await menuButton.count()) > 0) {
      await menuButton.click();

      const mobileMenu = page.locator('.mobile-menu, [data-mobile-menu], nav.open, nav.active');
      await expect(mobileMenu).toBeVisible();

      await menuButton.click();
    }
  });

  test('navigation is accessible on mobile', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});

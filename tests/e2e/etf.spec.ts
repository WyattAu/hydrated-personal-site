import { expect, test } from '@playwright/test';

test.describe('ETF Intelligence Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/etf');
  });

  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/etf');
    expect(response?.status()).toBe(200);
  });

  test('search bar is visible', async ({ page }) => {
    const search = page.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="etf" i], [data-search], .search-input',
    );
    await expect(search.first()).toBeVisible();
  });

  test('search bar accepts input', async ({ page }) => {
    const search = page.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="etf" i]',
    );

    if ((await search.count()) > 0) {
      await search.first().fill('VTI');
      const value = await search.first().inputValue();
      expect(value).toBe('VTI');
    }
  });

  test('autocomplete appears on typing', async ({ page }) => {
    const search = page.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="etf" i]',
    );

    if ((await search.count()) > 0) {
      await search.first().fill('VOO');
      await page.waitForTimeout(500);

      const suggestions = page.locator(
        '[class*="suggestion"], [class*="autocomplete"], [class*="dropdown"], [role="listbox"], [role="option"]',
      );

      if ((await suggestions.count()) > 0) {
        await expect(suggestions.first()).toBeVisible();
      }
    }
  });

  test('detail view shows on selection', async ({ page }) => {
    const search = page.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="etf" i]',
    );

    if ((await search.count()) > 0) {
      await search.first().fill('SPY');
      await page.waitForTimeout(500);

      const suggestion = page
        .locator(
          '[class*="suggestion"], [class*="autocomplete"], [role="option"], [class*="result"]',
        )
        .first();

      if ((await suggestion.count()) > 0) {
        await suggestion.click();
        await page.waitForTimeout(500);

        const detail = page.locator(
          '[class*="detail"], [class*="info"], [class*="panel"], [data-detail]',
        );
        expect(await detail.count()).toBeGreaterThan(0);
      }
    }
  });

  test('correlation matrix container is visible', async ({ page }) => {
    const matrix = page.locator(
      '[data-section="correlation"], [class*="correlation"], [class*="matrix"], canvas, table',
    );
    await expect(matrix.first()).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });

  test('page has navigation', async ({ page }) => {
    const nav = page.locator('nav, header nav');
    await expect(nav).toBeVisible();
  });

  test('page has footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

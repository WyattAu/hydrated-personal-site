import { expect, test } from '@playwright/test';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/projects');
    expect(response?.status()).toBe(200);
  });

  test('project grid is visible', async ({ page }) => {
    const grid = page.locator(
      '[class*="grid"], [class*="projects"], [data-section="projects"], main',
    );
    await expect(grid.first()).toBeVisible();
  });

  test('project cards have titles', async ({ page }) => {
    const cards = page.locator('[class*="card"], article, [class*="project"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const title = cards.nth(i).locator('h2, h3, h4, [class*="title"]');
      expect(await title.count()).toBeGreaterThan(0);
    }
  });

  test('project cards have descriptions', async ({ page }) => {
    const cards = page.locator('[class*="card"], article, [class*="project"]');
    const count = await cards.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const desc = cards.nth(i).locator('p, [class*="description"]');
      expect(await desc.count()).toBeGreaterThan(0);
    }
  });

  test('at least 3 projects are displayed', async ({ page }) => {
    const cards = page.locator('[class*="card"], article, [class*="project"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // External live-feed outages (LL2, SWPC, Yahoo, mempool.space) surface
      // as browser network errors; the widgets handle them with error states.
      // They are environmental, not page bugs — don't fail the smoke test.
      if (/Failed to fetch|net::|network error/i.test(text)) return;
      errors.push(text);
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    // networkidle never settles on live-data pages (15s polling + Binance
    // WS) — a fixed settle lets fetches land without hanging the test.
    await page.waitForTimeout(3000);

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

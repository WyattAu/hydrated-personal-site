import { expect, test } from '@playwright/test';

test.describe('World Monitor Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/world');
  });

  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/world');
    expect(response?.status()).toBe(200);
  });

  test('map container is visible', async ({ page }) => {
    const map = page.locator(
      '[data-section="map"], .map-container, #map, canvas, [class*="map"], [data-map]',
    );
    await expect(map.first()).toBeVisible();
  });

  test('metric cards are visible', async ({ page }) => {
    const metrics = page.locator(
      '[data-section="metrics"], .metrics, .metric-card, [class*="metric"], [class*="card"]',
    );
    const count = await metrics.count();
    expect(count).toBeGreaterThan(0);
  });

  test('price chart container is visible', async ({ page }) => {
    const chart = page.locator(
      '[data-section="chart"], .chart-container, canvas, [class*="chart"], [data-chart]',
    );
    await expect(chart.first()).toBeVisible();
  });

  test('data panels are visible', async ({ page }) => {
    const panels = page.locator(
      '[data-section="panels"], .panels, [class*="panel"], [class*="data"]',
    );
    const count = await panels.count();
    expect(count).toBeGreaterThan(0);
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

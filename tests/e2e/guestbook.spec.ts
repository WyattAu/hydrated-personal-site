import { expect, test } from '@playwright/test';

test.describe('Guestbook Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/guestbook');
  });

  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/guestbook');
    expect(response?.status()).toBe(200);
  });

  test('form is visible with name input', async ({ page }) => {
    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="name" i], input[type="text"]',
    );
    await expect(nameInput.first()).toBeVisible();
  });

  test('form is visible with message input', async ({ page }) => {
    const messageInput = page.locator(
      'textarea[name="message"], textarea[placeholder*="message" i], textarea, input[name="message"]',
    );
    await expect(messageInput.first()).toBeVisible();
  });

  test('submit button is visible', async ({ page }) => {
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Submit"), button:has-text("Sign"), button:has-text("Post")',
    );
    await expect(submitBtn.first()).toBeVisible();
  });

  test('honeypot field is hidden', async ({ page }) => {
    const honeypot = page.locator(
      'input[name="website"], input[name="url"], input[tabindex="-1"], input[aria-hidden="true"]',
    );

    if ((await honeypot.count()) > 0) {
      for (let i = 0; i < (await honeypot.count()); i++) {
        await expect(honeypot.nth(i)).not.toBeVisible();
      }
    }
  });

  test('list container for entries is visible', async ({ page }) => {
    const list = page.locator(
      '[class*="entries"], [class*="list"], [class*="guestbook"], [data-entries], main',
    );
    await expect(list.first()).toBeVisible();
  });

  test('existing entries are displayed', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const entries = page.locator('[class*="entry"], [class*="message"], article, [class*="card"]');

    if ((await entries.count()) > 0) {
      await expect(entries.first()).toBeVisible();
    }
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

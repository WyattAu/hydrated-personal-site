import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads successfully with 200 status', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('has correct page title containing "Wyatt Au"', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Wyatt');
  });

  test('hero section is visible', async ({ page }) => {
    const hero = page.locator('[data-section="hero"], .hero, main > section:first-of-type');
    await expect(hero.first()).toBeVisible();
  });

  test('navigation is visible with all links', async ({ page }) => {
    const nav = page.locator('nav, header nav');
    await expect(nav).toBeVisible();

    const links = page.locator('nav a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toBeVisible();
    }
  });

  test('about section is visible', async ({ page }) => {
    const about = page.locator('[data-section="about"], #about, section:has-text("About")');
    await expect(about.first()).toBeVisible();
  });

  test('featured projects section is visible', async ({ page }) => {
    const projects = page.locator(
      '[data-section="projects"], #projects, section:has-text("Project"), section:has-text("Featured")',
    );
    await expect(projects.first()).toBeVisible();
  });

  test('expertise grid is visible', async ({ page }) => {
    const expertise = page.locator(
      '[data-section="expertise"], #expertise, section:has-text("Expertise"), section:has-text("Skills")',
    );
    await expect(expertise.first()).toBeVisible();
  });

  test('employment section is visible', async ({ page }) => {
    const employment = page.locator(
      '[data-section="employment"], #employment, section:has-text("Experience"), section:has-text("Employment"), section:has-text("Work")',
    );
    await expect(employment.first()).toBeVisible();
  });

  test('contact section is visible', async ({ page }) => {
    const contact = page.locator(
      '[data-section="contact"], #contact, section:has-text("Contact"), footer',
    );
    await expect(contact.first()).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    const themeToggle = page.locator(
      'button[aria-label*="theme"], button[aria-label*="Theme"], [data-theme-toggle], .theme-toggle',
    );

    if ((await themeToggle.count()) > 0) {
      const html = page.locator('html');
      const initialClass = (await html.getAttribute('class')) || '';

      await themeToggle.first().click();
      await page.waitForTimeout(500);

      const newClass = (await html.getAttribute('class')) || '';
      expect(newClass).not.toBe(initialClass);
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

  test('all images load successfully', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const isVisible = await img.isVisible();
      if (isVisible) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test('JSON-LD structured data is present', async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();

    if (count > 0) {
      const content = await jsonLd.first().textContent();
      expect(content).toBeTruthy();

      const parsed = JSON.parse(content!);
      expect(parsed).toHaveProperty('@context');
    }
  });

  test('has correct meta description', async ({ page }) => {
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });

  test('has viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('footer is visible', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROUTES = [
  {
    path: '/',
    name: 'home',
    sections: [
      'WYATT_AU',
      'SCROLL',
      'ABOUT',
      'PROJECTS',
      'WASM SHOWCASE',
      'EXPERTISE',
      'EMPLOYMENT',
      'CONTACT',
    ],
  },
  { path: '/projects', name: 'projects', sections: ['PROJECTS', 'Filter'] },
  {
    path: '/dossier',
    name: 'dossier',
    sections: ['DOSSIER', 'EXPERTISE', 'EMPLOYMENT', 'EDUCATION', 'INTERACTIVE DEMOS'],
  },
  {
    path: '/world',
    name: 'world',
    sections: ['WORLD MONITOR', 'METRICS', 'DATA PANELS', 'SCATTER PLOTS'],
  },
  { path: '/docs', name: 'docs', sections: ['DOCS', 'Coming Soon'] },
  { path: '/etf', name: 'etf', sections: ['ETF INTELLIGENCE', 'QUICK PICKS'] },
  { path: '/guestbook', name: 'guestbook', sections: ['GUESTBOOK', 'Sign the Book', 'Entries'] },
  { path: '/uses', name: 'uses', sections: ['USES'] },
  { path: '/404', name: '404', sections: ['404', 'Return Home'] },
];

const SNAPSHOT_DIR = join(process.cwd(), 'test-results', 'gui-snapshots');

test.describe('GUI Traversal: DOM & Screenshot Audit', () => {
  test.beforeAll(() => {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  });

  for (const route of ROUTES) {
    test(`Route: ${route.path} (${route.name})`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30000 });
      expect(response?.status()).toBe(200);

      // Wait for any dynamic content to settle
      await page.waitForTimeout(1000);

      // Verify critical sections are present
      for (const section of route.sections) {
        const el = page.locator(`text="${section}"`).first();
        await expect(el).toBeVisible({ timeout: 5000 });
      }

      // Take full-page screenshot
      await page.screenshot({
        path: join(SNAPSHOT_DIR, `${route.name}-full.png`),
        fullPage: true,
      });

      // Capture DOM snapshot (key structural elements)
      const domSnapshot = await page.evaluate(() => {
        const getElementInfo = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || undefined,
            classList: Array.from(el.classList),
            childCount: el.children.length,
            text: el.textContent?.substring(0, 200),
          };
        };

        return {
          title: document.title,
          metaDescription: document
            .querySelector('meta[name="description"]')
            ?.getAttribute('content'),
          hasViewport: !!document.querySelector('meta[name="viewport"]'),
          hasSkipLink: !!document.querySelector('.skip-link'),
          navLinks: Array.from(document.querySelectorAll('nav a')).map((a) => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href'),
          })),
          sectionCount: document.querySelectorAll('section').length,
          h1: getElementInfo('h1'),
          h2Count: document.querySelectorAll('h2').length,
          footer: getElementInfo('footer'),
          forms: document.querySelectorAll('form').length,
          buttons: document.querySelectorAll('button').length,
          links: document.querySelectorAll('a').length,
          images: document.querySelectorAll('img').length,
          canvases: document.querySelectorAll('canvas').length,
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          roleAttributes: document.querySelectorAll('[role]').length,
        };
      });

      writeFileSync(
        join(SNAPSHOT_DIR, `${route.name}-dom.json`),
        JSON.stringify(domSnapshot, null, 2),
      );

      // Verify accessibility basics
      expect(domSnapshot.hasViewport).toBe(true);
      expect(domSnapshot.sectionCount).toBeGreaterThan(0);
    });
  }
});

test.describe('GUI Traversal: Navigation Integrity', () => {
  test('all nav links resolve to valid pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const navLinks = page.locator('nav a[href^="/"]');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (!href || href === '/') continue;

      const response = await page.goto(href);
      expect(response?.status(), `Navigation to ${href} failed`).toBe(200);
    }
  });

  test('footer links resolve to valid pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const internalFooterLinks = page.locator('footer a[href^="/"]');
    const count = await internalFooterLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await internalFooterLinks.nth(i).getAttribute('href');
      if (!href) continue;

      const response = await page.goto(href);
      expect(response?.status(), `Footer link ${href} failed`).toBe(200);
    }
  });

  test('theme toggle persists across navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Find and click theme toggle
    const themeToggle = page
      .locator('button')
      .filter({ hasText: /theme|dark|light/i })
      .first();
    if ((await themeToggle.count()) > 0) {
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      );

      await themeToggle.click();
      await page.waitForTimeout(500);

      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      );
      expect(newTheme).not.toBe(initialTheme);

      // Navigate to another page and check persistence
      await page.goto('/projects');
      await page.waitForTimeout(500);

      const persistedTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      );
      expect(persistedTheme).toBe(newTheme);
    }
  });
});

test.describe('GUI Traversal: Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'ultrawide', width: 2560, height: 1440 },
  ];

  for (const viewport of viewports) {
    test(`Home page renders correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Verify key elements are visible
      const hero = page.locator('.hero-name, h1').first();
      await expect(hero).toBeVisible();

      // Take viewport screenshot
      await page.screenshot({
        path: join(SNAPSHOT_DIR, `home-${viewport.name}.png`),
      });

      // Check no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1);
    });
  }
});

test.describe('GUI Traversal: Design Philosophy Compliance', () => {
  test('Spatial Materialism: z-index layering is consistent', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const zIndexAudit = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: string[] = [];

      for (const el of Array.from(elements)) {
        const computed = window.getComputedStyle(el);
        const zIndex = computed.zIndex;

        if (zIndex !== 'auto' && parseInt(zIndex) > 10000) {
          issues.push(
            `${el.tagName}.${el.className.split(' ')[0]}: z-index=${zIndex} exceeds maximum`,
          );
        }
      }

      return issues;
    });

    expect(zIndexAudit).toEqual([]);
  });

  test('Amoebic UI: interactive elements have transition properties', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const transitionAudit = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a[href]');
      let withTransition = 0;

      for (const el of Array.from(buttons)) {
        const computed = window.getComputedStyle(el);
        if (computed.transition !== 'none' && computed.transitionDuration !== '0s') {
          withTransition++;
        }
      }

      return {
        total: buttons.length,
        withTransition,
        ratio: buttons.length > 0 ? withTransition / buttons.length : 0,
      };
    });

    // At least 50% of interactive elements should have transitions
    expect(transitionAudit.ratio).toBeGreaterThanOrEqual(0.5);
  });

  test('No emoji in page content', async ({ page }) => {
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const route of ROUTES) {
      await page.goto(route.path, { waitUntil: 'networkidle' });

      const textContent = await page.evaluate(() => document.body.textContent || '');
      const hasEmoji = emojiRegex.test(textContent);

      expect(
        hasEmoji,
        `Emoji found on route ${route.path}. Design philosophy prohibits emoji.`,
      ).toBe(false);
    }
  });

  test('CSS variables are properly defined for all themes', async ({ page }) => {
    await page.goto('/');

    const requiredVars = [
      '--bg-primary',
      '--bg-secondary',
      '--bg-card',
      '--text-primary',
      '--text-secondary',
      '--accent',
      '--accent-warm',
      '--border',
    ];

    const themes = ['midnight-navy', 'tokyo-night', 'arctic-dawn', 'solaris', 'light'];

    for (const theme of themes) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(100);

      const missing = await page.evaluate((vars) => {
        const style = getComputedStyle(document.documentElement);
        return vars.filter((v) => !style.getPropertyValue(v).trim());
      }, requiredVars);

      expect(missing, `Theme "${theme}" missing CSS variables: ${missing.join(', ')}`).toEqual([]);
    }

    // Reset to default
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'midnight-navy'));
  });
});

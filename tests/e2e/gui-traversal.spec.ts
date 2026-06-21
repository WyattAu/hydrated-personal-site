import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

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

// Snapshots land in a dedicated review folder so they survive `test-results`
// cleanups and can be diffed between runs. `.tmp/gui-review/` is gitignored.
const SNAPSHOT_DIR = join(process.cwd(), '.tmp', 'gui-review');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ultrawide', width: 2560, height: 1440 },
];

test.describe('GUI Traversal: DOM & Screenshot Audit', () => {
  test.beforeAll(() => {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  });

  for (const route of ROUTES) {
    test(`Route: ${route.path} (${route.name})`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30000 });
      expect(response?.status()).toBe(200);

      // Wait for any dynamic content to settle.
      await page.waitForTimeout(1000);

      // Verify critical sections are present.
      for (const section of route.sections) {
        const el = page.locator(`text="${section}"`).first();
        await expect(el).toBeVisible({ timeout: 5000 });
      }

      // Capture per-route full-page screenshot for visual review.
      await page.screenshot({
        path: join(SNAPSHOT_DIR, `${route.name}-full.png`),
        fullPage: true,
      });

      // Per-viewport above-the-fold screenshots for responsiveness review.
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(150);
        await page.screenshot({
          path: join(SNAPSHOT_DIR, `${route.name}-${vp.name}.png`),
          fullPage: false,
        });
      }
      // Reset viewport.
      await page.setViewportSize({ width: 1280, height: 720 });

      // Capture DOM snapshot (key structural elements).
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
          // Design-language probes.
          amoebicMorphCount: document.querySelectorAll(
            '.amoebic-morph, .amoeba-hover, .amoebic-breathe, .amoebic-underline',
          ).length,
          themeAttribute: document.documentElement.getAttribute('data-theme'),
          // Letterbox check (spatial materialism expects max-width on ultra-wide).
          bodyMaxWidth: window.getComputedStyle(document.body).maxWidth,
        };
      });

      writeFileSync(
        join(SNAPSHOT_DIR, `${route.name}-dom.json`),
        JSON.stringify(domSnapshot, null, 2),
      );

      // Verify accessibility basics.
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
      expect(response?.status(), `Navigation to ${href} failed`).toBeLessThan(400);
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
      expect(response?.status(), `Footer link ${href} failed`).toBeLessThan(400);
    }
  });

  test('theme toggle persists across navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

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
  for (const viewport of VIEWPORTS) {
    test(`Home page renders correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const hero = page.locator('.hero-name, h1').first();
      await expect(hero).toBeVisible();

      await page.screenshot({
        path: join(SNAPSHOT_DIR, `home-${viewport.name}.png`),
      });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1);
    });
  }
});

test.describe('GUI Traversal: Design Philosophy Compliance', () => {
  test('Spatial Materialism: z-index tokens exist and are respected', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const audit = await page.evaluate(() => {
      const root = window.getComputedStyle(document.documentElement);
      const tokens = {
        '--z-bg': root.getPropertyValue('--z-bg').trim(),
        '--z-content': root.getPropertyValue('--z-content').trim(),
        '--z-card': root.getPropertyValue('--z-card').trim(),
        '--z-overlay': root.getPropertyValue('--z-overlay').trim(),
        '--z-nav': root.getPropertyValue('--z-nav').trim(),
        '--z-modal': root.getPropertyValue('--z-modal').trim(),
      };

      const issues: string[] = [];
      // z-index must be one of the declared tokens; raw numeric z-index above
      // the modal layer is forbidden (would break the spatial stack).
      const ceiling = Number.parseInt(tokens['--z-modal']) || 1000;
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const z = window.getComputedStyle(el).zIndex;
        if (z !== 'auto' && Number.parseInt(z) > ceiling) {
          issues.push(
            `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} z=${z}`,
          );
        }
      }
      return { tokens, issues };
    });

    // All z-index tokens must be defined.
    for (const [token, value] of Object.entries(audit.tokens)) {
      expect(value, `Missing z-index token ${token}`).not.toBe('');
    }
    // Layering must be monotonic: bg < content < card < overlay < nav < modal.
    const z = Object.fromEntries(
      Object.entries(audit.tokens).map(([k, v]) => [k, Number.parseInt(v as string)]),
    );
    expect(z['--z-bg']).toBeLessThanOrEqual(z['--z-content']);
    expect(z['--z-content']).toBeLessThan(z['--z-card']);
    expect(z['--z-card']).toBeLessThan(z['--z-overlay']);
    expect(z['--z-overlay']).toBeLessThan(z['--z-nav']);
    expect(z['--z-nav']).toBeLessThan(z['--z-modal']);

    expect(audit.issues, `z-index violations: ${audit.issues.join(', ')}`).toEqual([]);
  });

  test('Spatial Materialism: shadow system has consistent light source', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const shadows = await page.evaluate(() => {
      const root = window.getComputedStyle(document.documentElement);
      return {
        sm: root.getPropertyValue('--shadow-sm').trim(),
        md: root.getPropertyValue('--shadow-md').trim(),
        lg: root.getPropertyValue('--shadow-lg').trim(),
        xl: root.getPropertyValue('--shadow-xl').trim(),
      };
    });

    // Every shadow token must be defined.
    for (const [k, v] of Object.entries(shadows)) {
      expect(v, `Missing shadow token ${k}`).not.toBe('');
    }
    // All box-shadows must use downward y-offset (light source top-left).
    // Pattern: "0 <positive-y> <blur> ..." — second coordinate must be >= 0.
    for (const [k, v] of Object.entries(shadows)) {
      const yOffset = Number.parseFloat(v.split(' ').slice(1, 2)[0] ?? '0');
      expect(
        yOffset,
        `${k} y-offset must be >= 0 for top-left light source`,
      ).toBeGreaterThanOrEqual(0);
    }
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

    expect(transitionAudit.ratio).toBeGreaterThanOrEqual(0.5);
  });

  test('Amoebic UI: easing tokens present and use cubic-bezier', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const easings = await page.evaluate(() => {
      const root = window.getComputedStyle(document.documentElement);
      return {
        brutal: root.getPropertyValue('--ease-brutal').trim(),
        amoeba: root.getPropertyValue('--ease-amoeba').trim(),
        cinematic: root.getPropertyValue('--ease-cinematic').trim(),
        spring: root.getPropertyValue('--ease-spring').trim(),
      };
    });

    for (const [k, v] of Object.entries(easings)) {
      expect(v, `Missing easing token ${k}`).not.toBe('');
      expect(v.startsWith('cubic-bezier'), `${k} must be cubic-bezier`).toBe(true);
    }
  });

  test('No emoji in page content', async ({ page }) => {
    // Emoji ranges per Unicode standard: emoticons, pictographs, transport,
    // regional indicators (flags), dingbats, miscellaneous symbols.
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

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'midnight-navy'));
  });

  test('Cinematic entry: prefers-reduced-motion respected', async ({ page }) => {
    await page.context().addCookies([{ name: 'noop', value: '1', url: 'https://localhost' }]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });

    // When reduced motion is requested, no element should run infinite
    // keyframe animations longer than 0s.
    const offenders = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const computed = window.getComputedStyle(el);
        const dur = computed.animationDuration;
        const iters = computed.animationIterationCount;
        if (dur !== '0s' && (iters === 'infinite' || Number.parseInt(iters) > 1)) {
          out.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`);
        }
      }
      return out;
    });

    expect(
      offenders,
      `Infinite animations running under prefers-reduced-motion: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});

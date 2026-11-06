import { expect, test } from '@playwright/test';

/**
 * Mobile regression guards for bugs found by on-device audits (Galaxy A53,
 * 384x751). Each test pins a fix so it cannot silently regress:
 *
 *  - world map collapsed to a ~40px sliver inside a fixed-height section
 *  - plychart zoom overlay buttons rendered ~19px tall
 *  - nav/footer tap targets below the 24px WCAG 2.5.8 floor
 *  - hero headline washed out in the light theme (dark text on dark scrim)
 *
 * These run in a phone-sized viewport against the dev server.
 */

test.use({
  viewport: { width: 384, height: 751 },
  deviceScaleFactor: 2.8125,
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile regression: world map', () => {
  test('leaflet map fills its section (no sliver collapse)', async ({ page }) => {
    await page.goto('/world');
    // leaflet init + the 300ms invalidateSize re-measure
    await page.waitForTimeout(6000);

    const box = await page.locator('.leaflet-container').boundingBox();
    expect(box, 'leaflet container must exist').not.toBeNull();
    expect(box!.height, 'map height must clear the sliver-collapse floor').toBeGreaterThanOrEqual(
      300,
    );
    expect(box!.width).toBeGreaterThanOrEqual(320);
  });

  test('map section does not clip its contents on mobile', async ({ page }) => {
    await page.goto('/world');
    await page.waitForTimeout(4000);

    const clipped = await page.evaluate(() => {
      const section = document.querySelector('main section');
      if (!section) return null;
      const sr = section.getBoundingClientRect();
      // any child whose bottom sits below the section's clipped bounds
      return [...section.querySelectorAll('*')].some((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.bottom > sr.bottom + 1;
      });
    });
    expect(clipped, 'map section must not clip children on mobile').toBe(false);
  });
});

test.describe('Mobile regression: tap targets', () => {
  // documented exemptions: brand wordmark link, inline email links,
  // leaflet attribution links (legally mandated text, micro by convention)
  const EXEMPT_TEXT = ['WYATT_AU', 'wyatt_au@protonmail.com', 'OSM', 'CARTO', 'leafletjs.com'];
  const EXEMPT_SELECTOR = '.leaflet-control-attribution a';

  for (const path of ['/', '/world', '/etf']) {
    test(`all tap targets >= 24px on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(2500);

      const violations = await page.evaluate(
        ({ exempt, skipSelector }) => {
          return [...document.querySelectorAll('a,button')]
            .filter((el) => el.offsetParent !== null)
            .filter((el) => !(skipSelector && el.closest(skipSelector)))
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter((x) => x.r.width > 0 && Math.min(x.r.width, x.r.height) < 24)
            .filter((x) => !exempt.some((t) => (x.el.textContent || '').trim().includes(t)))
            .map((x) => {
              const anc: string[] = [];
              let n: Element | null = x.el.parentElement;
              while (n && anc.length < 3) {
                if (n.id) {
                  anc.push(`#${n.id}`);
                  break;
                }
                if (n.className)
                  anc.push(`.${String(n.className).split(' ').slice(0, 2).join('.')}`);
                n = n.parentElement;
              }
              return `"${(x.el.textContent || '').trim().slice(0, 16)}" ${Math.round(x.r.width)}x${Math.round(x.r.height)} in ${anc.join('<') || 'root'} | ${x.el.outerHTML.slice(0, 120)}`;
            });
        },
        { exempt: EXEMPT_TEXT, skipSelector: EXEMPT_SELECTOR },
      );

      expect(violations, `tap targets below 24px: ${violations.join('; ')}`).toEqual([]);
    });
  }
});

test.describe('Mobile regression: zoom controls', () => {
  test('plychart zoom buttons are touch-sized when present', async ({ page }) => {
    await page.goto('/etf');
    await page.waitForTimeout(4000);
    // panable charts hydrate on scroll
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 250));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(3000);

    const bars = await page.locator('[data-plychart-zoom]').count();
    test.skip(bars === 0, 'no panable charts mounted on this load');

    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('[data-plychart-zoom] button')].slice(0, 3).map((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(Math.min(r.width, r.height));
      }),
    );
    for (const s of sizes) {
      expect(s, 'zoom control must be at least 32px').toBeGreaterThanOrEqual(32);
    }
  });
});

test.describe('Mobile regression: hero light theme', () => {
  test('hero headline stays light on arctic-dawn (no dark-on-dark)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'arctic-dawn'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);

    const color = await page.evaluate(() => {
      const el = document.querySelector('.hero-name');
      return el ? getComputedStyle(el).color : '';
    });
    // fixed light value from .hero-name (photo-hero convention)
    expect(color).toBe('rgb(243, 246, 250)');
  });

  test('hero is not clipped on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowX).toBe(0);
  });
});

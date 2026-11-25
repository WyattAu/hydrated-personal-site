#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
/**
 * Golden-image visual regression (graphics vertical discipline).
 * Captures the home page at 4 widths; compares against committed
 * baselines with a perceptual threshold. `--update` re-captures
 * baselines deliberately (design change).
 *
 * Requires a server on http://127.0.0.1:4399 (E2E_PORT) serving dist.
 */
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const BASE = new URL('../tests/baselines/', import.meta.url).pathname;
const SERVER = process.env.E2E_URL ?? 'http://127.0.0.1:4399';
const WIDTHS = [1440, 1024, 768, 390];
const THRESHOLD = 0.12; // pixelmatch perceptual threshold
const update = process.argv.includes('--update');

const browser = await chromium.launch({
  executablePath: '/home/wyatt/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
});
const failures = [];
mkdirSync(BASE, { recursive: true });

for (const w of WIDTHS) {
  const page = await (
    await browser.newContext({ viewport: { width: w, height: Math.round(w * 0.625) } })
  ).newPage();
  await page.goto(SERVER + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const shot = await page.screenshot({ timeout: 90000 }); // viewport-only: full-page height varies with live content
  const name = `home-${w}.png`;
  const baseline = BASE + name;

  if (update || !existsSync(baseline)) {
    writeFileSync(baseline, shot);
    console.log(`baseline ${name} written (${shot.length} bytes)`);
    continue;
  }

  const a = PNG.sync.read(readFileSync(baseline));
  const b = PNG.sync.read(shot);
  const w2 = Math.min(a.width, b.width),
    h2 = Math.min(a.height, b.height);
  // pixelmatch v8: returns {pixels, diff}; pass null to skip diff image
  const { pixels: changed } = pixelmatch(a.data, b.data, null, w2, h2, {
    threshold: THRESHOLD,
  });
  const total = w2 * h2;
  const pct = (((changed || 0) / total) * 100).toFixed(2);
  if (changed / total > 0.02) {
    failures.push(`${name}: ${changed}/${total} px (${pct}%)`);
  } else {
    console.log(`${name}: ${pct}% px changed (within budget)`);
  }
  await page.context().close();
}
await browser.close();
if (failures.length) {
  console.error('VISUAL DRIFT:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('golden-image: PASS');

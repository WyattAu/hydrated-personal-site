import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: process.env.CI ? 2 : 4,
  use: {
    baseURL: 'http://localhost:4321',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    // The cloudflare adapter has no `astro preview`; serve the built dist
    // statically instead — identical to what Pages ships. Run `bun run build`
    // in apps/site first when dist is stale.
    command: 'python3 -m http.server 4321 --directory apps/site/dist',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
});

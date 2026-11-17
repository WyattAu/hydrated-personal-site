import { defineConfig } from '@playwright/test';

// Multiple agents share this workstation and all follow the estate
// playbook's `http.server 4321` pattern — when another project's server
// occupies 4321, pass E2E_PORT=4322 to run this suite in parallel; the default 4399 is dedicated to this suite.
const E2E_PORT = Number(process.env.E2E_PORT ?? 4399);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: process.env.CI ? 2 : 4,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
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
    command: 'bun /home/wyatt/e2e-logs/e2e-server.mjs',
    port: E2E_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
});

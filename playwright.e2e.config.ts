import { defineConfig } from '@playwright/test';

// Config variant WITHOUT a webServer: the dedicated bun static server
// (/home/wyatt/e2e-logs/e2e-server.mjs, daemonized separately) serves
// apps/site/dist on 4399. Avoids playwright's webServer orchestration,
// which can wedge when the port is already owned by our own daemon.
// Usage: bunx playwright test -c playwright.e2e.config.ts
const E2E_PORT = Number(process.env.E2E_PORT ?? 4399);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 1,
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
  reporter: [['line']],
});

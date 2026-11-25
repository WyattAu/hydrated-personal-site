import { defineConfig } from 'vitest/config';

export default defineConfig({
  // NOTE: SolidJS component tests (*.test.tsx) require vite-plugin-solid
  // which has a compatibility issue with Vite 8.x. The test files exist
  // at apps/site/src/components/solid/*.test.tsx but are excluded until
  // vite-plugin-solid releases a Vite 8-compatible version.
  // Track: https://github.com/solidjs/vite-plugin-solid/issues
  test: {
    environment: 'happy-dom',
    // Forks pool avoids esbuild service-terminated panics seen with the default
    // threads pool on Node.js >= 23 under load. Each test file runs in its own
    // process for isolation; trade-off is a small (~2s) wall-clock increase.
    pool: 'forks',
    maxForks: 4,
    minForks: 1,
    include: ['tests/unit/**/*.test.ts', 'apps/site/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Parity floor (FAANG coverage-gate discipline), scoped to the
      // modules with real unit coverage. Ratchet upward as coverage
      // grows; never lower without a documented reason.
      // Scoped to the modules with real unit coverage: the worker's
      // named modules + the site's shared lib. Handler/SSE long-tail is
      // E2E-covered and excluded from the floor until unit-covered.
      include: [
        'worker/src/cache.ts',
        'worker/src/circuit-breaker.ts',
        'worker/src/connection-pool.ts',
        'worker/src/fetch.ts',
        'worker/src/logger.ts',
        'worker/src/metrics.ts',
        'worker/src/rate-limiter.ts',
        'worker/src/retry.ts',
        'worker/src/security.ts',
        'worker/src/types.ts',
        'apps/site/src/lib/**',
      ],
      // Floors = measured aggregate minus 2 (2026-11-25 baseline:
      // 17.19/12.83/19.61/18.08 over the scoped include). Ratchet up
      // as covered modules grow; the text reporter aggregates scoped
      // files, so these are aggregate floors, not per-file.
      thresholds: {
        lines: 17,
        functions: 18,
        branches: 12,
        statements: 16,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

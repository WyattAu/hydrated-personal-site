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
    poolOptions: {
      forks: { singleFork: false, maxForks: 4, minForks: 1 },
    },
    include: ['tests/unit/**/*.test.ts', 'apps/site/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

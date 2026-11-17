import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    tsconfigRaw: '{}',
  },
  test: {
    globals: false,
    environment: 'node',
    // TEST_INCLUDE scopes a run to exactly one function's test file, so
    // Stryker's test-relatedness never mixes results across functions.
    include: [process.env.TEST_INCLUDE ?? 'packages/*/src/**/*.generated.test.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: ['default', 'json'],
    outputFile: { json: process.env.VITEST_JSON ?? 'reports/vitest.json' },
    coverage: {
      provider: 'istanbul',
      reporter: ['json', 'json-summary'],
      include: [process.env.TARGET_SRC ?? 'packages/dinero.js/src/**'],
      reportsDirectory: process.env.COVERAGE_DIR ?? 'reports/coverage',
    },
    clearMocks: true,
  },
  define: {
    __DEV__: true,
    __TEST__: true,
  },
});

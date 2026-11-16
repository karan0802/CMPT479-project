import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    tsconfigRaw: '{}',
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/*/src/**/*.generated.test.ts'],
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

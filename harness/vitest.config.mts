import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['extracted/**/*.generated.test.ts'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
    globals: false,
    reporters: ['default', 'json'],
    outputFile: { json: process.env.VITEST_JSON ?? 'reports/vitest.json' },
    coverage: {
      provider: 'istanbul',
      reporter: ['json', 'json-summary'],
      include: [process.env.TARGET_SRC ?? 'extracted/**/*.ts'],
      exclude: ['**/*.generated.test.ts'],
      reportsDirectory: process.env.COVERAGE_DIR ?? 'reports/coverage',
    },
  },
});

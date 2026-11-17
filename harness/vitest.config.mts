import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // TEST_INCLUDE scopes a run to exactly one function's test file. This
    // matters when several functions share a source file (e.g. ibantools'
    // single file): without it, Stryker's test-relatedness would treat every
    // test in that file as "related" to any mutation in it, mixing results
    // across functions that are each supposed to be measured in isolation.
    include: [process.env.TEST_INCLUDE ?? 'extracted/**/*.generated.test.ts'],
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

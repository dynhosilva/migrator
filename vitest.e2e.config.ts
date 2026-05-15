import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/e2e/**/*.test.ts'],
    testTimeout: 90_000,  // 90s — network calls to Supabase can be slow
    hookTimeout: 45_000,  // 45s — seed/teardown involve multiple auth.admin calls
    // Run E2E files sequentially — avoids parallel state pollution in the same project
    sequence: { concurrent: false },
  },
});

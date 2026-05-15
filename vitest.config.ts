import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['test/e2e/**'],  // E2E tests run separately via `npm run test:e2e`
    // Snapshots centralizados em test/snapshots/ para visibilidade
    resolveSnapshotPath: (testPath, snapshotExtension) => {
      const baseName = path.basename(testPath).replace(/\.test\.tsx?$/, '');
      return path.resolve(__dirname, 'test', 'snapshots', `${baseName}${snapshotExtension}`);
    },
    snapshotFormat: {
      printBasicPrototype: false,
      escapeString: false,
    },
  },
});

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Snapshots centralizados em test/snapshots/ para visibilidade
    resolveSnapshotPath: (testPath, snapshotExtension) => {
      const baseName = path.basename(testPath, '.test.ts');
      return path.resolve(__dirname, 'test', 'snapshots', `${baseName}${snapshotExtension}`);
    },
    snapshotFormat: {
      printBasicPrototype: false,
      escapeString: false,
    },
  },
});

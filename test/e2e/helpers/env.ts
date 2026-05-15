import type { SupabaseConfig } from '../../../src/integrations/supabase/types';
import type { SyncConfig } from '../../../src/sync';

export interface E2EEnv {
  oldSupabase: SupabaseConfig;
  newSupabase: SupabaseConfig;
  backupDir: string;
  /** Factory that builds a SyncConfig ready for the engine, with sensible E2E defaults. */
  makeSyncConfig(overrides?: Partial<SyncConfig['options']>): SyncConfig;
}

export function getE2EEnv(): E2EEnv | null {
  const oldUrl = process.env['SYNC_OLD_URL'];
  const oldKey = process.env['SYNC_OLD_KEY'];
  const newUrl = process.env['SYNC_NEW_URL'];
  const newKey = process.env['SYNC_NEW_KEY'];

  if (!oldUrl || !oldKey || !newUrl || !newKey) return null;

  const backupDir = process.env['SYNC_BACKUP_DIR'] ?? '/tmp/lovable-e2e-backups';
  const oldSupabase: SupabaseConfig = { url: oldUrl, serviceKey: oldKey };
  const newSupabase: SupabaseConfig = { url: newUrl, serviceKey: newKey };

  return {
    oldSupabase,
    newSupabase,
    backupDir,
    makeSyncConfig(overrides = {}) {
      return {
        oldSupabase,
        newSupabase,
        options: {
          dryRun: false,
          batchSize: 500,
          skipTables: [],
          skipColumns: [],
          extraColumns: [],
          verbose: false,
          backupDir,
          timeout: 30_000,
          maxRetries: 2,
          concurrency: 5,
          ...overrides,
        },
      };
    },
  };
}

/** Cached at module load time. Null when env vars are absent. */
export const e2eEnv = getE2EEnv();

/** Use as the first line in a describe block to skip when credentials are not configured. */
export const skipIfNoE2E = !e2eEnv;

export function requireE2EEnv(): E2EEnv {
  if (!e2eEnv) {
    throw new Error(
      'E2E env vars not set. Export SYNC_OLD_URL, SYNC_OLD_KEY, SYNC_NEW_URL, SYNC_NEW_KEY ' +
      'and run: npm run test:e2e',
    );
  }
  return e2eEnv;
}

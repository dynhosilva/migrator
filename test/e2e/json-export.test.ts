/**
 * E2E-JSON — Migration using a JSON export file instead of OLD service_role key.
 *
 * Scenario:
 *   1. Seed: create a user in OLD and NEW projects with the same email
 *   2. Generate a JSON export manually from the OLD user data (no API call needed)
 *   3. Save it to a temp file
 *   4. Run buildUserSyncPlan with oldSource: { kind: 'json-file', filePath: tmpfile }
 *   5. Execute + verify migration
 *   6. Cleanup
 *
 * Run: npm run test:e2e
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { skipIfNoE2E, e2eEnv } from './helpers/env';
import { seedUsers, teardownSeed, countRows, type SeedResult } from './helpers/seed';
import { buildUserSyncPlan, executeSyncPlan } from '../../src/sync';

describe.skipIf(skipIfNoE2E)('E2E-JSON — migração usando arquivo JSON export', () => {
  const env = e2eEnv!;
  let seed: SeedResult | undefined;
  let tmpFile: string | undefined;

  afterEach(async () => {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
      tmpFile = undefined;
    }
    if (seed) {
      await teardownSeed(env.oldSupabase, env.newSupabase, seed);
      seed = undefined;
    }
  });

  it('migrates rows using json-file source instead of OLD service_role key', async () => {
    const runId = crypto.randomUUID().slice(0, 8);
    seed = await seedUsers(env.oldSupabase, env.newSupabase, runId, 'json-alice', 3);

    // Pre-condition: all 3 rows have old_uuid
    expect(await countRows(env.newSupabase, seed.oldUser.id)).toBe(3);
    expect(await countRows(env.newSupabase, seed.newUser.id)).toBe(0);

    // Build JSON export manually — no OLD service_role needed
    const exportData = {
      count: 1,
      users: [
        {
          id: seed.oldUser.id,
          email: seed.oldUser.email,
          created_at: new Date(Date.now() - 180 * 86_400_000).toISOString(),
        },
      ],
    };
    tmpFile = path.join(os.tmpdir(), `e2e-json-export-${runId}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(exportData), 'utf-8');

    const plan = await buildUserSyncPlan({
      oldSource: { kind: 'json-file', filePath: tmpFile },
      newSupabase: env.newSupabase,
      options: {
        dryRun: false,
        batchSize: 500,
        skipTables: [],
        skipColumns: [],
        extraColumns: [],
        verbose: false,
        backupDir: env.backupDir,
        timeout: 30_000,
        maxRetries: 2,
        concurrency: 5,
      },
    });

    expect(plan.userMappings).toHaveLength(1);
    expect(plan.userMappings[0].oldUserId).toBe(seed.oldUser.id);
    expect(plan.userMappings[0].newUserId).toBe(seed.newUser.id);

    const result = await executeSyncPlan(plan, {
      newSupabase: env.newSupabase,
      options: {
        dryRun: false,
        batchSize: 500,
        skipTables: [],
        skipColumns: [],
        extraColumns: [],
        verbose: false,
        backupDir: env.backupDir,
        timeout: 30_000,
        maxRetries: 2,
        concurrency: 5,
      },
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.totalRowsUpdated).toBeGreaterThanOrEqual(3);

    // Verify data in database
    expect(await countRows(env.newSupabase, seed.newUser.id)).toBe(3);
    expect(await countRows(env.newSupabase, seed.oldUser.id)).toBe(0);
  });
});

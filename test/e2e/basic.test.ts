/**
 * E2E-01 — Basic migration: 1 user, 1 table
 * Corresponds to TEST_PLAN.md section 3, scenario E2E-01.
 *
 * Scenario:
 *   1. Seed: user alice in OLD + NEW, 3 rows in NEW with old_uuid
 *   2. Execute: buildUserSyncPlan() + executeSyncPlan()
 *   3. Verify: all 3 rows now have new_uuid, zero rows with old_uuid
 *   4. Verify: backup file was created on disk
 *   5. Verify: HTML report was created on disk
 *   6. Teardown: delete test rows + auth users
 *
 * Run: npm run test:e2e
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import crypto from 'crypto';
import { skipIfNoE2E, e2eEnv } from './helpers/env';
import { seedUsers, teardownSeed, countRows, type SeedResult } from './helpers/seed';
import { buildUserSyncPlan, executeSyncPlan } from '../../src/sync';

describe.skipIf(skipIfNoE2E)('E2E-01 — basic migration (1 user, 1 table)', () => {
  const env = e2eEnv!;
  let seed: SeedResult | undefined;

  afterEach(async () => {
    if (seed) {
      await teardownSeed(env.oldSupabase, env.newSupabase, seed);
      seed = undefined;
    }
  });

  it('migrates 3 rows from old_uuid to new_uuid', async () => {
    const runId = crypto.randomUUID().slice(0, 8);
    seed = await seedUsers(env.oldSupabase, env.newSupabase, runId, 'alice', 3);

    // Pre-condition: all 3 rows have old_uuid
    expect(await countRows(env.newSupabase, seed.oldUser.id)).toBe(3);
    expect(await countRows(env.newSupabase, seed.newUser.id)).toBe(0);

    const config = env.makeSyncConfig();
    const logs: string[] = [];
    config.onProgress = (msg) => { logs.push(msg); };

    const plan = await buildUserSyncPlan(config);
    const result = await executeSyncPlan(plan, config);

    // Core assertion: migration succeeded
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rollbackPerformed).toBe(false);
    expect(result.totalRowsUpdated).toBeGreaterThanOrEqual(3);

    // Verify data in database
    expect(await countRows(env.newSupabase, seed.newUser.id)).toBe(3);
    expect(await countRows(env.newSupabase, seed.oldUser.id)).toBe(0);

    // Backup and report files were created
    expect(result.backupFile).toBeDefined();
    expect(fs.existsSync(result.backupFile!)).toBe(true);

    expect(result.htmlReportFile).toBeDefined();
    expect(fs.existsSync(result.htmlReportFile!)).toBe(true);

    // Progress log mentioned the backup path
    const backupLog = logs.find(l => l.includes('BACKUP DE ROLLBACK'));
    expect(backupLog).toBeDefined();
  });

  it('result contains correct plan metadata', async () => {
    const runId = crypto.randomUUID().slice(0, 8);
    seed = await seedUsers(env.oldSupabase, env.newSupabase, runId, 'bob', 2);

    const config = env.makeSyncConfig();
    const plan = await buildUserSyncPlan(config);
    const result = await executeSyncPlan(plan, config);

    // Plan round-trips through result
    expect(result.plan.userMappings.length).toBeGreaterThanOrEqual(1);
    const mapping = result.plan.userMappings.find(m => m.email === seed!.oldUser.email);
    expect(mapping).toBeDefined();
    expect(mapping!.oldUserId).toBe(seed!.oldUser.id);
    expect(mapping!.newUserId).toBe(seed!.newUser.id);

    // Result fields are populated
    expect(result.executedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.dryRun).toBe(false);
  });
});

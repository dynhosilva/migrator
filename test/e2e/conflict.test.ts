/**
 * E2E-03 — Conflict detection: new user already has rows in the target table
 * Corresponds to TEST_PLAN.md section 3, scenario E2E-03.
 *
 * Scenario:
 *   1. Seed: user alice in OLD + NEW
 *   2. Insert 3 rows with old_uuid (pre-sync data) into NEW
 *   3. Insert 2 rows with new_uuid (alice re-created data after re-signup) into NEW
 *   4. Run dry-run discovery
 *   5. Verify: plan.conflicts contains alice's conflict in e2e_test_notes
 *   6. Teardown
 *
 * Run: npm run test:e2e
 */
import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'crypto';
import { skipIfNoE2E, e2eEnv } from './helpers/env';
import { seedUsers, teardownSeed, E2E_TABLE, type SeedResult } from './helpers/seed';
import { buildUserSyncPlan } from '../../src/sync';
import { createAdminClient } from '../../src/integrations/supabase/admin-client';

describe.skipIf(skipIfNoE2E)('E2E-03 — conflict detection', () => {
  const env = e2eEnv!;
  let seed: SeedResult | undefined;

  afterEach(async () => {
    if (seed) {
      await teardownSeed(env.oldSupabase, env.newSupabase, seed);
      seed = undefined;
    }
  });

  it('detects conflict when new_uuid already has rows in the target table', async () => {
    const runId = crypto.randomUUID().slice(0, 8);
    seed = await seedUsers(env.oldSupabase, env.newSupabase, runId, 'conflict-alice', 3);

    // Additional rows with new_uuid — alice re-created content after joining the new project
    const newClient = createAdminClient(env.newSupabase);
    const { error: extraErr } = await newClient.from(E2E_TABLE).insert([
      { user_id: seed.newUser.id, content: `existing note A run=${runId}` },
      { user_id: seed.newUser.id, content: `existing note B run=${runId}` },
    ]);
    expect(extraErr).toBeNull();

    // Run discovery
    const config = env.makeSyncConfig({ dryRun: true });
    const plan = await buildUserSyncPlan(config);

    // Conflict must exist for this user
    const conflict = plan.conflicts.find(
      c => c.email === seed!.oldUser.email && c.tableName === E2E_TABLE,
    );
    expect(conflict).toBeDefined();
    expect(conflict!.existingRowCount).toBeGreaterThanOrEqual(2);
    expect(conflict!.newUserId).toBe(seed.newUser.id);
  });

  it('returns no conflicts when new user has zero rows in target table', async () => {
    const runId = crypto.randomUUID().slice(0, 8);
    seed = await seedUsers(env.oldSupabase, env.newSupabase, runId, 'clean-alice', 3);

    const config = env.makeSyncConfig({ dryRun: true });
    const plan = await buildUserSyncPlan(config);

    const conflict = plan.conflicts.find(
      c => c.email === seed!.oldUser.email && c.tableName === E2E_TABLE,
    );
    expect(conflict).toBeUndefined();
  });
});

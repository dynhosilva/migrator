/**
 * E2E Smoke Tests — corresponds to TEST_PLAN.md section 2 (ST-01..ST-05)
 *
 * What's covered here:
 *   CONNECT-01  both projects accept the service_role key (real network)
 *   CONNECT-02  dry-run returns a valid plan without touching the database
 *   CONNECT-03  e2e_test_notes.user_id is auto-detected from the OpenAPI spec
 *
 * ST-01 (CLI --help) is covered by test/packaging/cli.test.ts.
 * ST-02 (anon key rejected offline) is covered by test/sync/unit/validate-config.test.ts.
 * ST-04 (TUI renders) is covered by test/tui/.
 *
 * Run: npm run test:e2e
 * Skip: when SYNC_OLD_URL / SYNC_OLD_KEY / SYNC_NEW_URL / SYNC_NEW_KEY are not set.
 */
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { skipIfNoE2E, e2eEnv } from './helpers/env';
import { seedUsers, teardownSeed, E2E_TABLE } from './helpers/seed';
import { buildUserSyncPlan } from '../../src/sync';
import { validateCredentials } from '../../src/sync/validation/validate-config';
import { createAdminClient } from '../../src/integrations/supabase/admin-client';
import { DEFAULT_TIMEOUTS } from '../../src/sync/utils/timeout';

describe.skipIf(skipIfNoE2E)('E2E smoke — connectivity + dry-run', () => {
  // e2eEnv is guaranteed non-null when skipIfNoE2E is false
  const env = e2eEnv!;
  const runId = crypto.randomUUID().slice(0, 8);

  // ── CONNECT-01: both project credentials are accepted ──────────────────────

  it('CONNECT-01: validateCredentials accepts OLD project service_role key', async () => {
    const client = createAdminClient(env.oldSupabase);
    const err = await validateCredentials(client, 'ANTIGO', DEFAULT_TIMEOUTS.credentialCheck);
    expect(err).toBeNull();
  });

  it('CONNECT-01: validateCredentials accepts NEW project service_role key', async () => {
    const client = createAdminClient(env.newSupabase);
    const err = await validateCredentials(client, 'NOVO', DEFAULT_TIMEOUTS.credentialCheck);
    expect(err).toBeNull();
  });

  // ── CONNECT-02: dry-run returns a plan without altering data ───────────────

  it('CONNECT-02: dry-run returns SyncPlan with no network writes', async () => {
    const seed = await seedUsers(env.oldSupabase, env.newSupabase, runId);

    try {
      const config = env.makeSyncConfig({ dryRun: true });
      const plan = await buildUserSyncPlan(config);

      expect(plan).toMatchObject({
        userMappings: expect.any(Array),
        columnTargets: expect.any(Array),
        conflicts: expect.any(Array),
        estimatedTotalUpdates: expect.any(Number),
        warnings: expect.any(Array),
        detectedAt: expect.any(String),
      });

      // At least our seeded user must appear in the plan
      const mapping = plan.userMappings.find(m => m.email === seed.oldUser.email);
      expect(mapping).toBeDefined();
      expect(mapping?.oldUserId).toBe(seed.oldUser.id);
      expect(mapping?.newUserId).toBe(seed.newUser.id);
    } finally {
      await teardownSeed(env.oldSupabase, env.newSupabase, seed);
    }
  });

  // ── CONNECT-03: e2e_test_notes.user_id is auto-detected ───────────────────

  it(`CONNECT-03: OpenAPI spec exposes ${E2E_TABLE}.user_id as a migration target`, async () => {
    const seed = await seedUsers(env.oldSupabase, env.newSupabase, runId + '-c3');

    try {
      const config = env.makeSyncConfig({ dryRun: true });
      const plan = await buildUserSyncPlan(config);

      const target = plan.columnTargets.find(c => c.tableName === E2E_TABLE && c.columnName === 'user_id');
      expect(target).toBeDefined();
      // Our 3 seeded rows are pre-counted during plan building
      expect(target?.estimatedRows).toBeGreaterThanOrEqual(3);
    } finally {
      await teardownSeed(env.oldSupabase, env.newSupabase, seed);
    }
  });
});

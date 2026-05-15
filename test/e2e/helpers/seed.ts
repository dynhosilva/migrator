import { createAdminClient } from '../../../src/integrations/supabase/admin-client';
import type { SupabaseConfig } from '../../../src/integrations/supabase/types';

/** Table created by test/e2e/seed.sql — must exist in both projects before E2E runs. */
export const E2E_TABLE = 'e2e_test_notes';

/** Domain used for all test emails. `.invalid` TLD is RFC-reserved — can never be a real account. */
const EMAIL_DOMAIN = 'e2e-test.invalid';

export interface SeededUser {
  id: string;
  email: string;
}

export interface SeedResult {
  runId: string;
  oldUser: SeededUser;
  newUser: SeededUser;
  /** IDs of the rows inserted into NEW project with old_uuid (simulating pre-sync state). */
  rowIds: string[];
}

export function makeTestEmail(label: string, runId: string): string {
  return `${label}-${runId}@${EMAIL_DOMAIN}`;
}

/**
 * Seeds one test run: creates auth users in both projects and inserts `rowCount` rows
 * into `e2e_test_notes` in the NEW project with `old_uuid` — the exact state that
 * sync-users is designed to fix.
 *
 * Precondition: `e2e_test_notes` table must exist in both projects (run seed.sql once).
 */
export async function seedUsers(
  oldConfig: SupabaseConfig,
  newConfig: SupabaseConfig,
  runId: string,
  label = 'alice',
  rowCount = 3,
): Promise<SeedResult> {
  const oldClient = createAdminClient(oldConfig);
  const newClient = createAdminClient(newConfig);
  const email = makeTestEmail(label, runId);

  const [oldRes, newRes] = await Promise.all([
    oldClient.auth.admin.createUser({ email, email_confirm: true }),
    newClient.auth.admin.createUser({ email, email_confirm: true }),
  ]);

  if (oldRes.error) throw new Error(`[seed] createUser OLD failed: ${oldRes.error.message}`);
  if (newRes.error) throw new Error(`[seed] createUser NEW failed: ${newRes.error.message}`);

  const oldUser: SeededUser = { id: oldRes.data.user!.id, email };
  const newUser: SeededUser = { id: newRes.data.user!.id, email };

  const rows = Array.from({ length: rowCount }, (_, i) => ({
    user_id: oldUser.id,
    content: `e2e note ${i + 1} run=${runId}`,
  }));

  const { data: inserted, error: insertErr } = await newClient
    .from(E2E_TABLE)
    .insert(rows)
    .select('id');

  if (insertErr) {
    await Promise.allSettled([
      oldClient.auth.admin.deleteUser(oldUser.id),
      newClient.auth.admin.deleteUser(newUser.id),
    ]);
    throw new Error(
      `[seed] insert into ${E2E_TABLE} failed: ${insertErr.message}\n` +
      `  Make sure you ran test/e2e/seed.sql in both Supabase projects first.`,
    );
  }

  const rowIds = ((inserted ?? []) as Array<{ id: string }>).map(r => r.id);
  return { runId, oldUser, newUser, rowIds };
}

/**
 * Deletes all test rows (by both old and new uuid — handles any migration state) and
 * removes auth users from both projects.
 */
export async function teardownSeed(
  oldConfig: SupabaseConfig,
  newConfig: SupabaseConfig,
  seed: SeedResult,
): Promise<void> {
  const oldClient = createAdminClient(oldConfig);
  const newClient = createAdminClient(newConfig);

  await Promise.allSettled([
    newClient.from(E2E_TABLE).delete().in('user_id', [seed.oldUser.id, seed.newUser.id]),
    oldClient.auth.admin.deleteUser(seed.oldUser.id),
    newClient.auth.admin.deleteUser(seed.newUser.id),
  ]);
}

/**
 * Counts rows in E2E_TABLE for a given user_id in the NEW project.
 * Convenience wrapper for E2E assertions.
 */
export async function countRows(newConfig: SupabaseConfig, userId: string): Promise<number> {
  const client = createAdminClient(newConfig);
  const { count, error } = await client
    .from(E2E_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw new Error(`[e2e] countRows failed: ${error.message}`);
  return count ?? 0;
}

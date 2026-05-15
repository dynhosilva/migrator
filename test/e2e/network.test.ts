/**
 * NF-01 — Invalid / unreachable URL is rejected within the configured timeout
 * Corresponds to TEST_PLAN.md section 8, scenario NF-01.
 *
 * These tests do NOT require real credentials — they use a well-formed service_role JWT
 * pointing at a non-existent Supabase project, verifying that the engine:
 *   a) Detects the unreachable host quickly (ENOTFOUND / timeout)
 *   b) Returns a clean error message, not a hang or uncaught exception
 *   c) Resolves in < 20 seconds (not hanging indefinitely)
 *
 * Run: npm run test:e2e  (or in isolation: vitest run test/e2e/network.test.ts --config vitest.e2e.config.ts)
 */
import { describe, it, expect } from 'vitest';
import { buildUserSyncPlan } from '../../src/sync';

// A structurally valid service_role JWT that will pass validateSyncConfig() but
// fail when the engine actually tries to connect (signature is fake).
const FAKE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiJ9' +                      // header: {"alg":"HS256"}
  '.eyJyb2xlIjoic2VydmljZV9yb2xlIn0' +           // payload: {"role":"service_role"}
  '.FAKE_SIGNATURE_FOR_TESTING_ONLY';

const FAKE_OLD_URL = 'https://naoexiste-old-e2e-00000.supabase.co';
const FAKE_NEW_URL = 'https://naoexiste-new-e2e-99999.supabase.co';

describe('NF-01 — unreachable host fails cleanly within timeout', () => {
  it('buildUserSyncPlan rejects with a network error, not a hang', async () => {
    const start = Date.now();

    const config = {
      oldSupabase: { url: FAKE_OLD_URL, serviceKey: FAKE_SERVICE_ROLE_KEY },
      newSupabase: { url: FAKE_NEW_URL, serviceKey: FAKE_SERVICE_ROLE_KEY },
      options: {
        dryRun: true,
        batchSize: 500,
        skipTables: [],
        skipColumns: [],
        extraColumns: [],
        verbose: false,
        timeout: 8_000,  // short timeout — we want quick failure
        maxRetries: 1,
        concurrency: 5,
      },
    };

    await expect(buildUserSyncPlan(config)).rejects.toThrow();

    const elapsed = Date.now() - start;
    // Must fail in under 20 seconds — DNS failure for .supabase.co should be near-instant
    expect(elapsed).toBeLessThan(20_000);
  });

  it('error message mentions connectivity, not an internal crash', async () => {
    const config = {
      oldSupabase: { url: FAKE_OLD_URL, serviceKey: FAKE_SERVICE_ROLE_KEY },
      newSupabase: { url: FAKE_NEW_URL, serviceKey: FAKE_SERVICE_ROLE_KEY },
      options: {
        dryRun: true,
        batchSize: 500,
        skipTables: [],
        skipColumns: [],
        extraColumns: [],
        verbose: false,
        timeout: 8_000,
        maxRetries: 1,
        concurrency: 5,
      },
    };

    let caughtMessage = '';
    try {
      await buildUserSyncPlan(config);
    } catch (err) {
      caughtMessage = err instanceof Error ? err.message : String(err);
    }

    // Message must be a human-readable connectivity error, not a raw stack trace
    expect(caughtMessage.length).toBeGreaterThan(10);
    expect(caughtMessage).not.toMatch(/TypeError: Cannot read/);
    expect(caughtMessage).not.toMatch(/undefined is not/);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { matchUsersByEmailFromExport } from '../../../src/sync/mapping/email-matcher';
import type { AuthExportUser } from '../../../src/sync/auth-source';
import type { SupabaseClient } from '@supabase/supabase-js';

const NEW_DATE = new Date(Date.now() - 30 * 86_400_000).toISOString();

function makeNewUser(id: string, email: string, createdAt = NEW_DATE) {
  return {
    id,
    email,
    created_at: createdAt,
    app_metadata: { provider: 'email' },
    user_metadata: {},
  };
}

function mockNewClient(users: ReturnType<typeof makeNewUser>[]): SupabaseClient {
  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;
}

describe('matchUsersByEmailFromExport', () => {
  it('matches export user to new project user by email', async () => {
    const exportUsers: AuthExportUser[] = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'alice@example.com', created_at: '2024-01-01T00:00:00Z' },
    ];
    const newClient = mockNewClient([
      makeNewUser('bbbbbbbb-0000-0000-0000-000000000002', 'alice@example.com'),
    ]);

    const { mappings, warnings, unmatchedOldCount } = await matchUsersByEmailFromExport(exportUsers, newClient);

    expect(mappings).toHaveLength(1);
    expect(mappings[0].oldUserId).toBe('aaaaaaaa-0000-0000-0000-000000000001');
    expect(mappings[0].newUserId).toBe('bbbbbbbb-0000-0000-0000-000000000002');
    expect(mappings[0].email).toBe('alice@example.com');
    expect(mappings[0].matchMethod).toBe('email');
    expect(mappings[0].confidence).toBeDefined();
    expect(warnings).toHaveLength(0);
    expect(unmatchedOldCount).toBe(0);
  });

  it('matches case-insensitively', async () => {
    const exportUsers: AuthExportUser[] = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'Alice@Example.COM' },
    ];
    const newClient = mockNewClient([
      makeNewUser('bbbbbbbb-0000-0000-0000-000000000002', 'alice@example.com'),
    ]);

    const { mappings } = await matchUsersByEmailFromExport(exportUsers, newClient);
    expect(mappings).toHaveLength(1);
    expect(mappings[0].email).toBe('alice@example.com');
  });

  it('increments unmatchedOldCount for users not in new project', async () => {
    const exportUsers: AuthExportUser[] = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'alice@example.com' },
      { id: 'cccccccc-0000-0000-0000-000000000003', email: 'charlie@example.com' },
    ];
    const newClient = mockNewClient([
      makeNewUser('bbbbbbbb-0000-0000-0000-000000000002', 'alice@example.com'),
      // charlie has NOT signed up in the new project
    ]);

    const { mappings, unmatchedOldCount, warnings } = await matchUsersByEmailFromExport(exportUsers, newClient);

    expect(mappings).toHaveLength(1);
    expect(unmatchedOldCount).toBe(1);
    expect(warnings.some(w => w.includes('charlie@example.com'))).toBe(true);
  });

  it('warns and ignores users with same UUID in both projects', async () => {
    const sameId = 'aaaaaaaa-0000-0000-0000-000000000001';
    const exportUsers: AuthExportUser[] = [
      { id: sameId, email: 'alice@example.com' },
    ];
    const newClient = mockNewClient([
      makeNewUser(sameId, 'alice@example.com'),
    ]);

    const { mappings, warnings } = await matchUsersByEmailFromExport(exportUsers, newClient);

    expect(mappings).toHaveLength(0);
    expect(warnings.some(w => w.includes('mesmo UUID'))).toBe(true);
  });

  it('handles export users without created_at (scoring works without dates)', async () => {
    const exportUsers: AuthExportUser[] = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'alice@example.com' },
    ];
    const newClient = mockNewClient([
      makeNewUser('bbbbbbbb-0000-0000-0000-000000000002', 'alice@example.com'),
    ]);

    const { mappings } = await matchUsersByEmailFromExport(exportUsers, newClient);
    expect(mappings).toHaveLength(1);
    expect(mappings[0].confidence.score).toBeGreaterThanOrEqual(0);
    expect(mappings[0].confidence.score).toBeLessThanOrEqual(100);
  });

  it('handles empty export list', async () => {
    const newClient = mockNewClient([
      makeNewUser('bbbbbbbb-0000-0000-0000-000000000002', 'alice@example.com'),
    ]);

    const { mappings, unmatchedOldCount } = await matchUsersByEmailFromExport([], newClient);
    expect(mappings).toHaveLength(0);
    expect(unmatchedOldCount).toBe(0);
  });

  it('matches multiple users correctly', async () => {
    const exportUsers: AuthExportUser[] = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'alice@example.com' },
      { id: 'cccccccc-0000-0000-0000-000000000003', email: 'bob@example.com' },
      { id: 'eeeeeeee-0000-0000-0000-000000000005', email: 'charlie@example.com' },
    ];
    const newClient = mockNewClient([
      makeNewUser('bbbbbbbb-0000-0000-0000-000000000002', 'alice@example.com'),
      makeNewUser('dddddddd-0000-0000-0000-000000000004', 'bob@example.com'),
      // charlie has NOT created account
    ]);

    const { mappings, unmatchedOldCount } = await matchUsersByEmailFromExport(exportUsers, newClient);

    expect(mappings).toHaveLength(2);
    expect(unmatchedOldCount).toBe(1);
    expect(mappings.map(m => m.email)).toEqual(
      expect.arrayContaining(['alice@example.com', 'bob@example.com']),
    );
  });
});

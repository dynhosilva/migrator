import { describe, it, expect, vi } from 'vitest';
import { matchUsersByEmail } from '../../../src/sync/mapping/email-matcher';
import type { SupabaseClient } from '@supabase/supabase-js';

const OLD_DATE = new Date(Date.now() - 180 * 86_400_000).toISOString();
const NEW_DATE = new Date(Date.now() - 30 * 86_400_000).toISOString();

function makeAuthUser(id: string, email: string, provider = 'email', createdAt = OLD_DATE) {
  return {
    id,
    email,
    created_at: createdAt,
    app_metadata: { provider },
    user_metadata: {},
  };
}

function mockClient(users: ReturnType<typeof makeAuthUser>[]): SupabaseClient {
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

describe('matchUsersByEmail', () => {
  it('matches two users by email across projects', async () => {
    const oldClient = mockClient([
      makeAuthUser('old-111', 'alice@example.com'),
    ]);
    const newClient = mockClient([
      makeAuthUser('new-222', 'alice@example.com', 'email', NEW_DATE),
    ]);

    const { mappings, warnings } = await matchUsersByEmail(oldClient, newClient);

    expect(mappings).toHaveLength(1);
    expect(mappings[0].oldUserId).toBe('old-111');
    expect(mappings[0].newUserId).toBe('new-222');
    expect(mappings[0].email).toBe('alice@example.com');
    expect(mappings[0].matchMethod).toBe('email');
    expect(mappings[0].confidence).toBeDefined();
    expect(warnings).toHaveLength(0);
  });

  it('skips user when no match in new project', async () => {
    const oldClient = mockClient([makeAuthUser('old-111', 'alice@example.com')]);
    const newClient = mockClient([makeAuthUser('new-222', 'bob@example.com', 'email', NEW_DATE)]);

    const { mappings, unmatchedOldCount, warnings } = await matchUsersByEmail(oldClient, newClient);

    expect(mappings).toHaveLength(0);
    expect(unmatchedOldCount).toBe(1);
    expect(warnings.some(w => w.includes('alice@example.com'))).toBe(true);
  });

  it('skips user when same UUID in both projects', async () => {
    const sameId = 'same-uuid-123';
    const oldClient = mockClient([makeAuthUser(sameId, 'alice@example.com')]);
    const newClient = mockClient([makeAuthUser(sameId, 'alice@example.com', 'email', NEW_DATE)]);

    const { mappings, warnings } = await matchUsersByEmail(oldClient, newClient);

    expect(mappings).toHaveLength(0);
    expect(warnings.some(w => w.includes('mesmo UUID'))).toBe(true);
  });

  it('handles user without email', async () => {
    const oldClient = mockClient([
      makeAuthUser('old-111', ''),
    ]);
    const newClient = mockClient([]);

    const { mappings, unmatchedOldCount } = await matchUsersByEmail(oldClient, newClient);
    expect(mappings).toHaveLength(0);
    expect(unmatchedOldCount).toBe(1);
  });

  it('matches multiple users correctly', async () => {
    const oldClient = mockClient([
      makeAuthUser('old-a', 'alice@example.com'),
      makeAuthUser('old-b', 'bob@example.com'),
      makeAuthUser('old-c', 'charlie@example.com'),
    ]);
    const newClient = mockClient([
      makeAuthUser('new-a', 'alice@example.com', 'email', NEW_DATE),
      makeAuthUser('new-b', 'bob@example.com', 'email', NEW_DATE),
      // charlie has NOT created account in new project
    ]);

    const { mappings, unmatchedOldCount } = await matchUsersByEmail(oldClient, newClient);

    expect(mappings).toHaveLength(2);
    expect(unmatchedOldCount).toBe(1);
    expect(mappings.map(m => m.email)).toEqual(
      expect.arrayContaining(['alice@example.com', 'bob@example.com']),
    );
  });

  it('is case-insensitive for email matching', async () => {
    const oldClient = mockClient([makeAuthUser('old-111', 'Alice@Example.COM')]);
    const newClient = mockClient([makeAuthUser('new-222', 'alice@example.com', 'email', NEW_DATE)]);

    const { mappings } = await matchUsersByEmail(oldClient, newClient);
    expect(mappings).toHaveLength(1);
  });

  it('paginates when first page is full', async () => {
    // First page returns 1000 users, second returns 1 user
    const page1Users = Array.from({ length: 1000 }, (_, i) =>
      makeAuthUser(`old-${i}`, `user${i}@example.com`),
    );
    const page2Users = [makeAuthUser('old-last', 'last@example.com')];

    const listUsersMock = vi
      .fn()
      .mockResolvedValueOnce({ data: { users: page1Users }, error: null })
      .mockResolvedValueOnce({ data: { users: page2Users }, error: null });

    const oldClient = {
      auth: { admin: { listUsers: listUsersMock } },
    } as unknown as SupabaseClient;

    const newClient = mockClient([makeAuthUser('new-last', 'last@example.com', 'email', NEW_DATE)]);

    const { mappings } = await matchUsersByEmail(oldClient, newClient);

    expect(listUsersMock).toHaveBeenCalledTimes(2);
    expect(mappings.some(m => m.email === 'last@example.com')).toBe(true);
  });

  it('throws when listUsers returns error', async () => {
    const oldClient = {
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: null, error: { message: 'Unauthorized' } }) } },
    } as unknown as SupabaseClient;
    const newClient = mockClient([]);

    await expect(matchUsersByEmail(oldClient, newClient)).rejects.toThrow('Unauthorized');
  });
});

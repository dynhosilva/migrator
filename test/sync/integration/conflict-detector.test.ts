import { describe, it, expect } from 'vitest';
import { detectConflicts, describeConflict } from '../../../src/sync/detection/conflict-detector';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget } from '../../../src/sync/types';

function makeMapping(oldId: string, newId: string, email = 'user@test.com'): UserMapping {
  return {
    oldUserId: oldId,
    newUserId: newId,
    email,
    matchMethod: 'email',
    confidence: { level: 'high', score: 90, reasons: [] },
  };
}

function makeColumn(table: string, col: string, rows = 5): ColumnTarget {
  return { tableName: table, columnName: col, estimatedRows: rows };
}

function makeClient(config: {
  hasNewId: boolean;
  count?: number;
}): SupabaseClient {
  const newIdRows = config.hasNewId
    ? [{ user_id: 'new-222' }]
    : [];

  return {
    from: (table: string) => ({
      select: (col: string, opts?: { count?: string; head?: boolean }) => ({
        in: () => {
          // Called to check if newId exists in column
          return Promise.resolve({ data: newIdRows, error: null });
        },
        eq: () => Promise.resolve({
          count: config.count ?? 3,
          data: null,
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('detectConflicts', () => {
  it('detects no conflict when new user has no data', async () => {
    const client = makeClient({ hasNewId: false });
    const mappings = [makeMapping('old-111', 'new-222')];
    const columns = [makeColumn('transactions', 'user_id')];

    const conflicts = await detectConflicts(client, mappings, columns);
    expect(conflicts).toHaveLength(0);
  });

  it('detects conflict when new user already has data in a table', async () => {
    const client = makeClient({ hasNewId: true, count: 5 });
    const mappings = [makeMapping('old-111', 'new-222', 'alice@test.com')];
    const columns = [makeColumn('transactions', 'user_id')];

    const conflicts = await detectConflicts(client, mappings, columns);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      email: 'alice@test.com',
      newUserId: 'new-222',
      tableName: 'transactions',
      columnName: 'user_id',
      existingRowCount: 5,
    });
  });

  it('returns empty when no active columns', async () => {
    const client = makeClient({ hasNewId: true });
    const mappings = [makeMapping('old-111', 'new-222')];
    const emptyColumns = [makeColumn('orders', 'user_id', 0)]; // estimatedRows = 0

    const conflicts = await detectConflicts(client, mappings, emptyColumns);
    expect(conflicts).toHaveLength(0);
  });

  it('returns empty when no mappings', async () => {
    const client = makeClient({ hasNewId: true });
    const conflicts = await detectConflicts(client, [], [makeColumn('orders', 'user_id')]);
    expect(conflicts).toHaveLength(0);
  });
});

describe('describeConflict', () => {
  it('formats conflict message for non-technical user', () => {
    const msg = describeConflict({
      email: 'alice@test.com',
      newUserId: 'new-uuid',
      tableName: 'transactions',
      columnName: 'user_id',
      existingRowCount: 42,
    });
    expect(msg).toContain('alice@test.com');
    expect(msg).toContain('transactions');
    expect(msg).toContain('42');
  });
});

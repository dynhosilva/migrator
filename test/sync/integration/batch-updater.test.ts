import { describe, it, expect, vi } from 'vitest';
import { executeUpdates } from '../../../src/sync/executor/batch-updater';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget } from '../../../src/sync/types';

function makeMapping(oldId: string, newId: string): UserMapping {
  return {
    oldUserId: oldId,
    newUserId: newId,
    email: 'user@test.com',
    matchMethod: 'email',
    confidence: { level: 'high', score: 90, reasons: [] },
  };
}

function makeColumn(table: string, col: string, rows = 5): ColumnTarget {
  return { tableName: table, columnName: col, estimatedRows: rows };
}

function makeSuccessClient(rowsPerUpdate = 3): SupabaseClient {
  return {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => Promise.resolve({
            data: Array(rowsPerUpdate).fill({ user_id: 'new-uuid' }),
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

function makeErrorClient(errorMessage: string): SupabaseClient {
  return {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => Promise.resolve({
            data: null,
            error: { message: errorMessage },
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('executeUpdates', () => {
  it('returns update records for each (column × mapping)', async () => {
    const client = makeSuccessClient(2);
    const mappings = [
      makeMapping('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001'),
      makeMapping('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000002'),
    ];
    const columns = [makeColumn('transactions', 'user_id')];

    const results = await executeUpdates(client, mappings, columns, 500);

    expect(results).toHaveLength(2);
    expect(results.every(r => !r.error)).toBe(true);
    expect(results.every(r => r.rowsAffected === 2)).toBe(true);
  });

  it('skips columns with estimatedRows = 0', async () => {
    const client = makeSuccessClient();
    const mappings = [makeMapping('old-1', 'new-1')];
    const columns = [makeColumn('empty', 'user_id', 0)];

    const results = await executeUpdates(client, mappings, columns, 500);
    expect(results).toHaveLength(0);
  });

  it('records error without throwing', async () => {
    const client = makeErrorClient('unique constraint violation');
    const mappings = [makeMapping(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0001-000000000001',
    )];
    const columns = [makeColumn('transactions', 'user_id')];

    const results = await executeUpdates(client, mappings, columns, 500);

    expect(results).toHaveLength(1);
    expect(results[0].error).toContain('unique constraint');
    expect(results[0].rowsAffected).toBe(0);
  });

  it('rejects invalid UUIDs without hitting the database', async () => {
    const fromSpy = vi.fn();
    const client = { from: fromSpy } as unknown as SupabaseClient;

    const badMapping = makeMapping('not-a-uuid', 'also-not-a-uuid');
    const columns = [makeColumn('transactions', 'user_id')];

    const results = await executeUpdates(client, [badMapping], columns, 500);

    expect(fromSpy).not.toHaveBeenCalled();
    expect(results[0].error).toContain('UUID inválido');
  });

  it('processes in batches respecting batchSize', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ user_id: 'x' }], error: null }),
        }),
      }),
    });
    const client = { from: fromSpy } as unknown as SupabaseClient;

    // 5 valid UUIDs
    const uuids = Array.from({ length: 5 }, (_, i) =>
      makeMapping(
        `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
        `00000000-0000-0000-0001-${String(i + 1).padStart(12, '0')}`,
      ),
    );
    const columns = [makeColumn('t', 'user_id')];

    await executeUpdates(client, uuids, columns, 2); // batchSize=2

    // 5 mappings → 5 from() calls
    expect(fromSpy).toHaveBeenCalledTimes(5);
  });

  it('calls onProgress for each update', async () => {
    const client = makeSuccessClient(1);
    const mappings = [makeMapping(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0001-000000000001',
    )];
    const columns = [makeColumn('orders', 'user_id')];
    const progressCalls: string[] = [];

    await executeUpdates(
      client,
      mappings,
      columns,
      500,
      (r) => progressCalls.push(`${r.tableName}.${r.columnName}`),
    );

    expect(progressCalls).toHaveLength(1);
    expect(progressCalls[0]).toBe('orders.user_id');
  });

  it('handles multiple columns correctly', async () => {
    const client = makeSuccessClient(1);
    const mappings = [makeMapping(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0001-000000000001',
    )];
    const columns = [
      makeColumn('transactions', 'user_id'),
      makeColumn('profiles', 'owner_id'),
      makeColumn('orders', 'created_by'),
    ];

    const results = await executeUpdates(client, mappings, columns, 500);

    // 1 mapping × 3 columns = 3 results
    expect(results).toHaveLength(3);
    expect(results.map(r => r.tableName)).toEqual(
      expect.arrayContaining(['transactions', 'profiles', 'orders']),
    );
  });
});

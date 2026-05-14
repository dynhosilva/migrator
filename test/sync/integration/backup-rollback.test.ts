import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createBackup, restoreFromBackup } from '../../../src/sync/executor/backup-manager';
import type { UserMapping, ColumnTarget } from '../../../src/sync/types';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeMapping(old: string, nw: string, email = 'user@test.com'): UserMapping {
  return {
    oldUserId: old,
    newUserId: nw,
    email,
    matchMethod: 'email',
    confidence: { level: 'high', score: 90, reasons: ['Email correspondente'] },
  };
}

function makeColumn(table: string, col: string, rows = 5): ColumnTarget {
  return { tableName: table, columnName: col, estimatedRows: rows };
}

function makeRestoreClient(): { client: SupabaseClient; calls: Array<{ table: string; col: string; oldId: string; newId: string }> } {
  const calls: Array<{ table: string; col: string; oldId: string; newId: string }> = [];

  const eqMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockReturnValue({ update: updateMock });

  // Capture calls
  fromMock.mockImplementation((table: string) => ({
    update: (data: Record<string, string>) => ({
      eq: (col: string, newId: string) => {
        calls.push({ table, col, oldId: data[col], newId });
        return Promise.resolve({ error: null });
      },
    }),
  }));

  return {
    client: { from: fromMock } as unknown as SupabaseClient,
    calls,
  };
}

describe('createBackup', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-backup-'));
  });

  it('creates a JSON backup file', () => {
    const mappings = [makeMapping('old-1', 'new-1')];
    const columns = [makeColumn('transactions', 'user_id')];

    const file = createBackup(mappings, columns, tmpDir);

    expect(fs.existsSync(file)).toBe(true);
    const entries = JSON.parse(fs.readFileSync(file, 'utf-8'));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      tableName: 'transactions',
      columnName: 'user_id',
      oldUserId: 'old-1',
      newUserId: 'new-1',
    });
  });

  it('stores ALL (table × mapping) combinations — no row query needed', () => {
    const mappings = [makeMapping('old-1', 'new-1'), makeMapping('old-2', 'new-2', 'b@test.com')];
    const columns = [makeColumn('orders', 'user_id'), makeColumn('profiles', 'owner_id')];

    const file = createBackup(mappings, columns, tmpDir);
    const entries = JSON.parse(fs.readFileSync(file, 'utf-8'));

    // 2 mappings × 2 columns = 4 entries
    expect(entries).toHaveLength(4);
  });

  it('skips columns with estimatedRows = 0', () => {
    const mappings = [makeMapping('old-1', 'new-1')];
    const columns = [
      makeColumn('transactions', 'user_id', 10),
      makeColumn('empty_table', 'user_id', 0),
    ];

    const file = createBackup(mappings, columns, tmpDir);
    const entries = JSON.parse(fs.readFileSync(file, 'utf-8'));

    expect(entries.every((e: { tableName: string }) => e.tableName !== 'empty_table')).toBe(true);
    expect(entries).toHaveLength(1);
  });

  it('creates backup dir if it does not exist', () => {
    const newDir = path.join(tmpDir, 'deep', 'nested', 'dir');
    const mappings = [makeMapping('old-1', 'new-1')];
    const columns = [makeColumn('test', 'user_id')];

    const file = createBackup(mappings, columns, newDir);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('backup is valid even with 0 active columns (edge case)', () => {
    const file = createBackup([makeMapping('old-1', 'new-1')], [], tmpDir);
    const entries = JSON.parse(fs.readFileSync(file, 'utf-8'));
    expect(entries).toHaveLength(0);
  });
});

describe('restoreFromBackup', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-restore-'));
  });

  it('executes reverse UPDATE for each backup entry', async () => {
    const mappings = [makeMapping('old-1', 'new-1')];
    const columns = [makeColumn('transactions', 'user_id')];
    const backupFile = createBackup(mappings, columns, tmpDir);

    const { client, calls } = makeRestoreClient();
    const result = await restoreFromBackup(client, backupFile);

    expect(result.restored).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      table: 'transactions',
      col: 'user_id',
      oldId: 'old-1',
      newId: 'new-1',
    });
  });

  it('rollback reverses all entries (multiple tables + users)', async () => {
    const mappings = [
      makeMapping('old-a', 'new-a', 'a@test.com'),
      makeMapping('old-b', 'new-b', 'b@test.com'),
    ];
    const columns = [makeColumn('orders', 'user_id'), makeColumn('profiles', 'owner_id')];
    const backupFile = createBackup(mappings, columns, tmpDir);

    const { client, calls } = makeRestoreClient();
    const result = await restoreFromBackup(client, backupFile);

    // 2 users × 2 tables = 4 restores
    expect(result.restored).toBe(4);
    expect(calls).toHaveLength(4);
  });

  it('restores new→old direction (correct rollback semantics)', async () => {
    const mappings = [makeMapping('old-uuid-111', 'new-uuid-222')];
    const columns = [makeColumn('transactions', 'user_id')];
    const backupFile = createBackup(mappings, columns, tmpDir);

    const { client, calls } = makeRestoreClient();
    await restoreFromBackup(client, backupFile);

    // Rollback: WHERE col = new-uuid-222, SET col = old-uuid-111
    expect(calls[0].oldId).toBe('old-uuid-111');
    expect(calls[0].newId).toBe('new-uuid-222');
  });

  it('handles restore errors gracefully', async () => {
    const mappings = [makeMapping('old-1', 'new-1')];
    const columns = [makeColumn('locked_table', 'user_id')];
    const backupFile = createBackup(mappings, columns, tmpDir);

    const errorClient = {
      from: () => ({
        update: () => ({
          eq: () => Promise.resolve({ error: { message: 'Permission denied' } }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await restoreFromBackup(errorClient, backupFile);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Permission denied');
    expect(result.restored).toBe(0);
  });
});

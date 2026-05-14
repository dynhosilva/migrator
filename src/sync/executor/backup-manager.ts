import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackupEntry, UserMapping, ColumnTarget } from '../types';

export async function createBackup(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
  backupDir: string,
): Promise<string> {
  const oldIds = mappings.map(m => m.oldUserId);
  const entries: BackupEntry[] = [];

  for (const col of columns) {
    if (col.estimatedRows === 0) continue;

    const { data } = await client
      .from(col.tableName)
      .select(col.columnName)
      .in(col.columnName, oldIds);

    if (!data || data.length === 0) continue;

    for (const mapping of mappings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasRows = data.some((r: any) => r[col.columnName] === mapping.oldUserId);
      if (!hasRows) continue;
      entries.push({
        tableName: col.tableName,
        columnName: col.columnName,
        oldUserId: mapping.oldUserId,
        newUserId: mapping.newUserId,
      });
    }
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `sync-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(entries, null, 2), 'utf-8');
  return backupFile;
}

export async function restoreFromBackup(
  client: SupabaseClient,
  backupFile: string,
): Promise<void> {
  const entries: BackupEntry[] = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  for (const entry of entries) {
    await client
      .from(entry.tableName)
      .update({ [entry.columnName]: entry.oldUserId })
      .eq(entry.columnName, entry.newUserId);
  }
}

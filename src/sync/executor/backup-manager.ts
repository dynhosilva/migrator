import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackupEntry, UserMapping, ColumnTarget } from '../types';

/**
 * Cria um backup de rollback ANTES de qualquer UPDATE.
 *
 * Estratégia: armazenar todos os pares (tableName, columnName, oldId, newId)
 * para todas as combinações com estimatedRows > 0. NÃO consultamos o banco
 * para verificar se existem linhas — isso evita o bug do limite de 1000 linhas
 * do PostgREST e torna o backup instantâneo.
 *
 * Rollback executa: UPDATE table SET col = oldId WHERE col = newId
 * Se não houver linhas com newId, o UPDATE não afeta nada — operação segura.
 */
export function createBackup(
  mappings: UserMapping[],
  columns: ColumnTarget[],
  backupDir: string,
): string {
  const activeColumns = columns.filter(c => c.estimatedRows > 0);
  const entries: BackupEntry[] = [];

  for (const col of activeColumns) {
    for (const mapping of mappings) {
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
): Promise<{ restored: number; errors: string[] }> {
  const entries: BackupEntry[] = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const errors: string[] = [];
  let restored = 0;

  for (const entry of entries) {
    const { error } = await client
      .from(entry.tableName)
      .update({ [entry.columnName]: entry.oldUserId })
      .eq(entry.columnName, entry.newUserId);

    if (error) {
      errors.push(`${entry.tableName}.${entry.columnName}: ${error.message}`);
    } else {
      restored++;
    }
  }

  return { restored, errors };
}

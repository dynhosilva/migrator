import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackupEntry, UserMapping, ColumnTarget } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout';
import { withRetry, DEFAULT_RETRY, type RetryOptions } from '../utils/retry';

const REQUIRED_KEYS: ReadonlyArray<keyof BackupEntry> = ['tableName', 'columnName', 'oldUserId', 'newUserId'];

function isValidEntry(e: unknown): e is BackupEntry {
  if (!e || typeof e !== 'object') return false;
  return REQUIRED_KEYS.every(k => typeof (e as Record<string, unknown>)[k] === 'string');
}

/**
 * Creates a rollback backup BEFORE any UPDATE.
 *
 * Stores all (table, column, oldId, newId) combinations for columns with
 * estimatedRows > 0. Does NOT query the database — avoids the PostgREST
 * 1000-row default limit and makes the backup instantaneous and deterministic.
 *
 * Rollback: UPDATE table SET col = oldId WHERE col = newId
 * If no rows have newId, the UPDATE is a no-op — always safe.
 *
 * Uses atomic write (tmp → rename) to prevent corrupt backup files on crash.
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

  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Não foi possível criar o diretório de backup "${backupDir}".\n` +
      `  Detalhe: ${err instanceof Error ? err.message : String(err)}\n` +
      `  Verifique se você tem permissão de escrita neste diretório.`,
    );
  }

  const backupFile = path.join(backupDir, `sync-backup-${Date.now()}.json`);
  const tmpFile = `${backupFile}.tmp`;

  try {
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, backupFile);
  } catch (err) {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup error */ }

    const msg = err instanceof Error ? err.message : String(err);
    const isDiskFull = msg.includes('ENOSPC') || msg.includes('no space');
    throw new Error(
      isDiskFull
        ? `Disco cheio — não foi possível criar o backup de segurança.\n` +
          `  Libere espaço em "${backupDir}" e tente novamente.\n` +
          `  A migração foi CANCELADA para proteger seus dados.`
        : `Falha ao salvar backup em "${backupFile}".\n` +
          `  Detalhe: ${msg}\n` +
          `  A migração foi CANCELADA para proteger seus dados.`,
    );
  }

  return backupFile;
}

export async function restoreFromBackup(
  client: SupabaseClient,
  backupFile: string,
  opts: { timeoutMs?: number; retry?: RetryOptions } = {},
): Promise<{ restored: number; errors: string[] }> {
  // Validate file exists and is readable
  let raw: string;
  try {
    raw = fs.readFileSync(backupFile, 'utf-8');
  } catch (err) {
    throw new Error(
      `Arquivo de backup não encontrado ou ilegível: "${backupFile}".\n` +
      `  Detalhe: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Validate JSON before touching the database
  let entries: unknown[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('backup não é um array JSON válido');
    entries = parsed;
  } catch (err) {
    throw new Error(
      `Arquivo de backup corrompido — rollback cancelado.\n` +
      `  Arquivo: "${backupFile}"\n` +
      `  Detalhe: ${err instanceof Error ? err.message : String(err)}\n` +
      `  Restaure manualmente via backup externo do banco de dados.`,
    );
  }

  // Validate schema of every entry before any writes
  const invalidIndex = entries.findIndex(e => !isValidEntry(e));
  if (invalidIndex >= 0) {
    throw new Error(
      `Backup inválido: entrada ${invalidIndex} tem campos ausentes ou com tipo incorreto.\n` +
      `  Arquivo: "${backupFile}"\n` +
      `  Restaure manualmente via backup externo do banco de dados.`,
    );
  }

  const validEntries = entries as BackupEntry[];
  const errors: string[] = [];
  let restored = 0;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUTS.singleRestore;
  const retry = opts.retry ?? DEFAULT_RETRY;

  for (const entry of validEntries) {
    try {
      const { error } = await withRetry(
        () => withTimeout(
          (client
            .from(entry.tableName)
            .update({ [entry.columnName]: entry.oldUserId })
            .eq(entry.columnName, entry.newUserId)) as unknown as Promise<{ error: { message: string } | null }>,
          timeoutMs,
          `restore ${entry.tableName}.${entry.columnName}`,
        ),
        retry,
        `restore ${entry.tableName}.${entry.columnName}`,
      );

      if (error) {
        errors.push(
          `${entry.tableName}.${entry.columnName} ` +
          `(${entry.newUserId} → ${entry.oldUserId}): ${error.message}`,
        );
      } else {
        restored++;
      }
    } catch (err) {
      errors.push(
        `${entry.tableName}.${entry.columnName} ` +
        `(${entry.newUserId} → ${entry.oldUserId}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { restored, errors };
}

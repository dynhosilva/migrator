import os from 'os';
import path from 'path';
import { createAdminClient } from '../integrations/supabase/admin-client';
import type { SupabaseConfig } from '../integrations/supabase/types';
import { detectUserIdColumns } from './detection/user-id-detector';
import { matchUsersByEmail } from './mapping/email-matcher';
import { buildSyncPlan } from './executor/dry-runner';
import { executeUpdates } from './executor/batch-updater';
import { createBackup, restoreFromBackup } from './executor/backup-manager';
import { logger } from '../logger';
import type { SyncOptions, SyncResult, UpdateRecord } from './types';

export interface SyncConfig {
  oldSupabase: SupabaseConfig;
  newSupabase: SupabaseConfig;
  options: SyncOptions;
}

const EMPTY_PLAN = (warnings: string[]) => ({
  userMappings: [],
  columnTargets: [],
  estimatedTotalUpdates: 0,
  warnings,
  detectedAt: new Date().toISOString(),
});

export async function syncUsers(config: SyncConfig): Promise<SyncResult> {
  const start = Date.now();
  const { options } = config;

  const oldClient = createAdminClient(config.oldSupabase);
  const newClient = createAdminClient(config.newSupabase);

  // 1. Detectar colunas user_id no schema do novo projeto
  logger.debug('Detectando colunas de user_id no novo projeto via PostgREST...');
  const rawColumns = await detectUserIdColumns(
    config.newSupabase,
    options.extraColumns,
    options.skipTables,
    options.skipColumns,
  );
  logger.debug(`${rawColumns.length} coluna(s) detectada(s)`);

  // 2. Cruzar auth.users dos dois projetos por email
  logger.debug('Buscando usuários nos dois projetos...');
  const { mappings, unmatchedOldCount, warnings } = await matchUsersByEmail(oldClient, newClient);

  if (unmatchedOldCount > 0) {
    warnings.push(
      `${unmatchedOldCount} usuário(s) do projeto antigo sem correspondente no novo — não serão migrados`,
    );
  }

  if (mappings.length === 0) {
    return {
      success: false,
      dryRun: options.dryRun,
      plan: EMPTY_PLAN(warnings),
      updates: [],
      totalRowsUpdated: 0,
      tablesUpdated: [],
      errors: ['Nenhum mapeamento de usuário encontrado — certifique-se de que os usuários já criaram conta no novo projeto'],
      rollbackPerformed: false,
      durationMs: Date.now() - start,
      executedAt: new Date().toISOString(),
    };
  }

  logger.debug(`${mappings.length} usuário(s) mapeado(s). Calculando registros afetados...`);

  // 3. Contar registros afetados (sempre — dry-run ou não)
  const plan = await buildSyncPlan(newClient, mappings, rawColumns, warnings);

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      plan,
      updates: [],
      totalRowsUpdated: 0,
      tablesUpdated: [],
      errors: [],
      rollbackPerformed: false,
      durationMs: Date.now() - start,
      executedAt: new Date().toISOString(),
    };
  }

  // 4. Backup antes de qualquer escrita
  const backupDir = options.backupDir ?? path.join(os.tmpdir(), 'lovable-migrate-sync');
  let backupFile: string | undefined;
  const updates: UpdateRecord[] = [];
  const errors: string[] = [];
  let rollbackPerformed = false;

  const activeColumns = plan.columnTargets.filter(c => c.estimatedRows > 0);

  try {
    if (activeColumns.length > 0) {
      logger.debug('Criando backup antes de executar atualizações...');
      backupFile = await createBackup(newClient, mappings, activeColumns, backupDir);
      logger.debug(`Backup salvo: ${backupFile}`);
    }

    // 5. Executar UPDATEs em lote
    logger.debug('Executando atualizações...');
    const executed = await executeUpdates(
      newClient,
      mappings,
      plan.columnTargets,
      options.batchSize,
      options.verbose
        ? (r) => logger.debug(`  ${r.tableName}.${r.columnName}: ${r.rowsAffected} linha(s)`)
        : undefined,
    );
    updates.push(...executed);

    // 6. Rollback automático se houver erros
    const failedUpdates = executed.filter(u => !!u.error);
    if (failedUpdates.length > 0 && backupFile) {
      logger.debug(`${failedUpdates.length} erro(s) detectado(s) — iniciando rollback...`);
      await restoreFromBackup(newClient, backupFile);
      rollbackPerformed = true;
      errors.push(...failedUpdates.map(u => `${u.tableName}.${u.columnName}: ${u.error}`));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);

    if (backupFile) {
      try {
        logger.debug('Erro crítico — tentando rollback...');
        await restoreFromBackup(newClient, backupFile);
        rollbackPerformed = true;
      } catch (rollbackErr) {
        errors.push(
          `Rollback falhou: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`,
        );
      }
    }
  }

  const successfulUpdates = updates.filter(u => !u.error);
  const tablesUpdated = [...new Set(successfulUpdates.map(u => u.tableName))];
  const totalRowsUpdated = successfulUpdates.reduce((sum, u) => sum + u.rowsAffected, 0);

  return {
    success: errors.length === 0 && !rollbackPerformed,
    dryRun: false,
    plan,
    updates,
    totalRowsUpdated,
    tablesUpdated,
    errors,
    rollbackPerformed,
    backupFile,
    durationMs: Date.now() - start,
    executedAt: new Date().toISOString(),
  };
}

export type { SyncOptions, SyncResult, UserMapping, ColumnTarget, SyncPlan, UpdateRecord } from './types';

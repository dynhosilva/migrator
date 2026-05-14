import os from 'os';
import path from 'path';
import { createAdminClient } from '../integrations/supabase/admin-client';
import type { SupabaseConfig } from '../integrations/supabase/types';
import { detectUserIdColumns } from './detection/user-id-detector';
import { matchUsersByEmail } from './mapping/email-matcher';
import { buildSyncPlan } from './executor/dry-runner';
import { executeUpdates } from './executor/batch-updater';
import { createBackup, restoreFromBackup } from './executor/backup-manager';
import { generateHtmlReport } from './report/html-report';
import { logger } from '../logger';
import type { SyncOptions, SyncResult, SyncPlan, UpdateRecord } from './types';

export interface SyncConfig {
  oldSupabase: SupabaseConfig;
  newSupabase: SupabaseConfig;
  options: SyncOptions;
  onProgress?: (message: string) => void;
}

const DEFAULT_BACKUP_DIR = path.join(os.tmpdir(), 'lovable-migrate-sync');

// ─── Phase 1: discovery (used by wizard for preview) ──────────────────────────

export async function buildUserSyncPlan(config: SyncConfig): Promise<SyncPlan> {
  const oldClient = createAdminClient(config.oldSupabase);
  const newClient = createAdminClient(config.newSupabase);
  const { options } = config;

  config.onProgress?.('Detectando schema do novo projeto...');
  const rawColumns = await detectUserIdColumns(
    config.newSupabase,
    options.extraColumns,
    options.skipTables,
    options.skipColumns,
  );

  config.onProgress?.(`${rawColumns.length} coluna(s) detectada(s). Buscando usuários...`);
  const { mappings, unmatchedOldCount, warnings } = await matchUsersByEmail(oldClient, newClient);

  if (unmatchedOldCount > 0) {
    warnings.push(
      `${unmatchedOldCount} usuário(s) do projeto antigo sem correspondente no novo`,
    );
  }

  config.onProgress?.(`${mappings.length} usuário(s) mapeado(s). Calculando registros afetados...`);
  return buildSyncPlan(newClient, mappings, rawColumns, warnings);
}

// ─── Phase 2: execution (used by wizard after user confirms) ──────────────────

export async function executeSyncPlan(
  plan: SyncPlan,
  config: SyncConfig,
): Promise<SyncResult> {
  const start = Date.now();
  const newClient = createAdminClient(config.newSupabase);
  const backupDir = config.options.backupDir ?? DEFAULT_BACKUP_DIR;
  const updates: UpdateRecord[] = [];
  const errors: string[] = [];
  let rollbackPerformed = false;
  let backupFile: string | undefined;
  let htmlReportFile: string | undefined;

  const activeColumns = plan.columnTargets.filter(c => c.estimatedRows > 0);

  try {
    if (activeColumns.length > 0) {
      config.onProgress?.('Criando backup de segurança...');
      backupFile = await createBackup(newClient, plan.userMappings, activeColumns, backupDir);
      config.onProgress?.(`Backup salvo: ${backupFile}`);
    }

    config.onProgress?.('Executando atualizações...');
    const executed = await executeUpdates(
      newClient,
      plan.userMappings,
      plan.columnTargets,
      config.options.batchSize,
      (r) => config.onProgress?.(
        `  ${r.tableName}.${r.columnName}: ${r.rowsAffected} linha(s)${r.error ? ` ⚠ ${r.error}` : ''}`,
      ),
    );
    updates.push(...executed);

    const failedUpdates = executed.filter(u => !!u.error);
    if (failedUpdates.length > 0 && backupFile) {
      config.onProgress?.(`${failedUpdates.length} erro(s) — iniciando rollback...`);
      await restoreFromBackup(newClient, backupFile);
      rollbackPerformed = true;
      errors.push(...failedUpdates.map(u => `${u.tableName}.${u.columnName}: ${u.error}`));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);

    if (backupFile) {
      try {
        config.onProgress?.('Erro crítico — revertendo...');
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

  const result: SyncResult = {
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

  try {
    config.onProgress?.('Gerando relatório HTML...');
    htmlReportFile = generateHtmlReport(result, backupDir);
    result.htmlReportFile = htmlReportFile;
  } catch {
    // relatório HTML é melhor-esforço — não falha a migração
  }

  return result;
}

// ─── Combined (used by sync-users CLI command) ────────────────────────────────

export async function syncUsers(config: SyncConfig): Promise<SyncResult> {
  const start = Date.now();

  const plan = await buildUserSyncPlan(config).catch(err => { throw err; });

  if (plan.userMappings.length === 0) {
    return {
      success: false,
      dryRun: config.options.dryRun,
      plan,
      updates: [],
      totalRowsUpdated: 0,
      tablesUpdated: [],
      errors: ['Nenhum mapeamento de usuário encontrado — os usuários precisam criar conta no novo projeto primeiro'],
      rollbackPerformed: false,
      durationMs: Date.now() - start,
      executedAt: new Date().toISOString(),
    };
  }

  if (config.options.dryRun) {
    const dryResult: SyncResult = {
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

    try {
      const backupDir = config.options.backupDir ?? DEFAULT_BACKUP_DIR;
      dryResult.htmlReportFile = generateHtmlReport(dryResult, backupDir);
    } catch {
      // melhor-esforço
    }

    return dryResult;
  }

  return executeSyncPlan(plan, config);
}

export type { SyncOptions, SyncResult, SyncPlan, UserMapping, ColumnTarget, UpdateRecord, ConfidenceScore, ConfidenceLevel } from './types';

import os from 'os';
import path from 'path';
import { createAdminClient } from '../integrations/supabase/admin-client';
import type { SupabaseConfig } from '../integrations/supabase/types';
import { detectUserIdColumns } from './detection/user-id-detector';
import { matchUsersByEmail } from './mapping/email-matcher';
import { buildSyncPlan } from './executor/dry-runner';
import { executeUpdates } from './executor/batch-updater';
import { createBackup, restoreFromBackup } from './executor/backup-manager';
import { validateSyncConfig, validateCredentials } from './validation/validate-config';
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

// ─── Phase 0: validation (fast, no network needed for config check) ───────────

export function validateConfig(config: SyncConfig) {
  return validateSyncConfig(config);
}

// ─── Phase 1: discovery ───────────────────────────────────────────────────────

export async function buildUserSyncPlan(config: SyncConfig): Promise<SyncPlan> {
  // 0. Config validation
  const configResult = validateSyncConfig(config);
  if (!configResult.valid) {
    throw new Error(configResult.errors.join('\n\n'));
  }

  const oldClient = createAdminClient(config.oldSupabase);
  const newClient = createAdminClient(config.newSupabase);
  const { options } = config;

  // 1. Credential validation (smoke test before full discovery)
  config.onProgress?.('Verificando credenciais...');
  const [oldCredsError, newCredsError] = await Promise.all([
    validateCredentials(oldClient, 'ANTIGO'),
    validateCredentials(newClient, 'NOVO'),
  ]);

  const credErrors: string[] = [];
  if (oldCredsError) credErrors.push(oldCredsError);
  if (newCredsError) credErrors.push(newCredsError);
  if (credErrors.length > 0) throw new Error(credErrors.join('\n\n'));

  // 2. Schema detection
  config.onProgress?.('Detectando schema do novo projeto...');
  const rawColumns = await detectUserIdColumns(
    config.newSupabase,
    options.extraColumns,
    options.skipTables,
    options.skipColumns,
  );
  config.onProgress?.(`${rawColumns.length} coluna(s) detectada(s)`);

  // 3. User matching
  config.onProgress?.('Buscando usuários nos dois projetos...');
  const { mappings, unmatchedOldCount, warnings } = await matchUsersByEmail(oldClient, newClient);

  if (unmatchedOldCount > 0) {
    warnings.push(
      `${unmatchedOldCount} usuário(s) do projeto antigo sem correspondente — ` +
      `eles precisam criar conta no novo projeto antes da migração`,
    );
  }

  if (mappings.length === 0) {
    throw new Error(
      'Nenhum usuário correspondente encontrado entre os dois projetos.\n' +
      '  Certifique-se de que os usuários já criaram conta no novo projeto com o mesmo email.',
    );
  }

  config.onProgress?.(`${mappings.length} usuário(s) mapeado(s). Calculando registros afetados...`);

  // 4. Count affected rows + detect conflicts
  return buildSyncPlan(newClient, mappings, rawColumns, warnings);
}

// ─── Phase 2: execution ───────────────────────────────────────────────────────

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
    // Backup BEFORE any write — synchronous, instant, no network needed
    if (activeColumns.length > 0) {
      config.onProgress?.('Criando backup de segurança...');
      backupFile = createBackup(plan.userMappings, activeColumns, backupDir);
      config.onProgress?.(`Backup: ${backupFile}`);
    }

    config.onProgress?.('Executando atualizações...');
    const executed = await executeUpdates(
      newClient,
      plan.userMappings,
      plan.columnTargets,
      config.options.batchSize,
      (r) => {
        if (r.error) {
          config.onProgress?.(`  ⚠ ${r.tableName}.${r.columnName}: ${r.error}`);
        } else {
          config.onProgress?.(`  ✓ ${r.tableName}.${r.columnName}: ${r.rowsAffected} linha(s)`);
        }
      },
    );
    updates.push(...executed);

    const failedUpdates = executed.filter(u => !!u.error);
    if (failedUpdates.length > 0 && backupFile) {
      config.onProgress?.(`${failedUpdates.length} erro(s) — iniciando rollback...`);
      const rollback = await restoreFromBackup(newClient, backupFile);
      rollbackPerformed = true;
      errors.push(...failedUpdates.map(u => `${u.tableName}.${u.columnName}: ${u.error}`));
      if (rollback.errors.length > 0) {
        errors.push(`Rollback parcial — ${rollback.errors.length} erro(s) durante restauração`);
      } else {
        config.onProgress?.('Rollback concluído');
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);

    if (backupFile) {
      try {
        config.onProgress?.('Erro crítico — revertendo...');
        await restoreFromBackup(newClient, backupFile);
        rollbackPerformed = true;
        config.onProgress?.('Rollback concluído');
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
    config.onProgress?.(`Relatório: ${htmlReportFile}`);
  } catch {
    // HTML report é melhor-esforço
  }

  return result;
}

// ─── Combined (CLI sync-users) ────────────────────────────────────────────────

export async function syncUsers(config: SyncConfig): Promise<SyncResult> {
  const start = Date.now();
  let plan: SyncPlan;

  try {
    plan = await buildUserSyncPlan(config);
  } catch (err) {
    return {
      success: false,
      dryRun: config.options.dryRun,
      plan: {
        userMappings: [],
        columnTargets: [],
        conflicts: [],
        estimatedTotalUpdates: 0,
        warnings: [],
        detectedAt: new Date().toISOString(),
      },
      updates: [],
      totalRowsUpdated: 0,
      tablesUpdated: [],
      errors: [err instanceof Error ? err.message : String(err)],
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
    } catch { /* melhor-esforço */ }
    return dryResult;
  }

  return executeSyncPlan(plan, config);
}

export type { SyncOptions, SyncResult, SyncPlan, UserMapping, ColumnTarget, UpdateRecord, ConfidenceScore, ConfidenceLevel, ConflictReport } from './types';

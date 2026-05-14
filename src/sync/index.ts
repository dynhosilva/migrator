import os from 'os';
import path from 'path';
import { createAdminClient } from '../integrations/supabase/admin-client';
import type { SupabaseConfig } from '../integrations/supabase/types';
import { detectUserIdColumns } from './detection/user-id-detector';
import { matchUsersByEmail } from './mapping/email-matcher';
import { buildSyncPlan } from './executor/dry-runner';
import { executeUpdates } from './executor/batch-updater';
import { createBackup, restoreFromBackup } from './executor/backup-manager';
import { saveCheckpoint, loadCheckpoint, buildCompletedSet } from './executor/checkpoint';
import { validateSyncConfig, validateCredentials } from './validation/validate-config';
import { generateHtmlReport } from './report/html-report';
import { sanitizeMessage } from './utils/mask';
import { DEFAULT_RETRY } from './utils/retry';
import { DEFAULT_TIMEOUTS } from './utils/timeout';
import type { SyncOptions, SyncResult, SyncPlan, UpdateRecord } from './types';

export interface SyncConfig {
  oldSupabase: SupabaseConfig;
  newSupabase: SupabaseConfig;
  options: SyncOptions;
  onProgress?: (message: string) => void;
}

const DEFAULT_BACKUP_DIR = path.join(os.tmpdir(), 'lovable-migrate-sync');

function makeRetryOpts(options: SyncOptions) {
  return {
    ...DEFAULT_RETRY,
    maxAttempts: options.maxRetries ?? DEFAULT_RETRY.maxAttempts,
  };
}

function makeTimeoutMs(options: SyncOptions) {
  return options.timeout ?? DEFAULT_TIMEOUTS.singleUpdate;
}

// ─── Phase 0: validation (fast, no network) ──────────────────────────────────

export function validateConfig(config: SyncConfig) {
  return validateSyncConfig(config);
}

// ─── Phase 1: discovery ───────────────────────────────────────────────────────

export async function buildUserSyncPlan(config: SyncConfig): Promise<SyncPlan> {
  const configResult = validateSyncConfig(config);
  if (!configResult.valid) {
    throw new Error(sanitizeMessage(configResult.errors.join('\n\n')));
  }

  const oldClient = createAdminClient(config.oldSupabase);
  const newClient = createAdminClient(config.newSupabase);
  const { options } = config;
  const timeoutMs = makeTimeoutMs(options);
  const retry = makeRetryOpts(options);

  // Credential validation in parallel — both projects at once
  config.onProgress?.('Verificando credenciais...');
  const [oldCredsError, newCredsError] = await Promise.all([
    validateCredentials(oldClient, 'ANTIGO', options.timeout ?? DEFAULT_TIMEOUTS.credentialCheck),
    validateCredentials(newClient, 'NOVO', options.timeout ?? DEFAULT_TIMEOUTS.credentialCheck),
  ]);

  const credErrors: string[] = [];
  if (oldCredsError) credErrors.push(sanitizeMessage(oldCredsError));
  if (newCredsError) credErrors.push(sanitizeMessage(newCredsError));
  if (credErrors.length > 0) throw new Error(credErrors.join('\n\n'));

  // Schema detection
  config.onProgress?.('Detectando schema do novo projeto...');
  const rawColumns = await detectUserIdColumns(
    config.newSupabase,
    options.extraColumns,
    options.skipTables,
    options.skipColumns,
  );
  config.onProgress?.(`${rawColumns.length} coluna(s) detectada(s)`);

  // User matching — fetch both user lists in parallel (already done in matchUsersByEmail)
  config.onProgress?.('Buscando usuários nos dois projetos...');
  const { mappings, unmatchedOldCount, warnings } = await matchUsersByEmail(
    oldClient,
    newClient,
    { timeoutMs: options.timeout ?? DEFAULT_TIMEOUTS.userListPage, retry },
  );

  if (unmatchedOldCount > 0) {
    warnings.push(
      `${unmatchedOldCount} usuário(s) do projeto antigo sem correspondente no novo — ` +
      `eles precisam criar conta no novo projeto antes de serem migrados`,
    );
  }

  if (mappings.length === 0) {
    throw new Error(
      'Nenhum usuário correspondente encontrado entre os dois projetos.\n' +
      '  Certifique-se de que os usuários já criaram conta no novo projeto com o mesmo email.',
    );
  }

  config.onProgress?.(`${mappings.length} usuário(s) mapeado(s). Calculando registros afetados...`);

  // Count affected rows in parallel + detect conflicts
  return buildSyncPlan(newClient, mappings, rawColumns, warnings, { timeoutMs, retry });
}

// ─── Phase 2: execution ───────────────────────────────────────────────────────

export async function executeSyncPlan(
  plan: SyncPlan,
  config: SyncConfig,
): Promise<SyncResult> {
  const start = Date.now();
  const newClient = createAdminClient(config.newSupabase);
  const backupDir = config.options.backupDir ?? DEFAULT_BACKUP_DIR;
  const { options } = config;
  const timeoutMs = makeTimeoutMs(options);
  const retry = makeRetryOpts(options);
  const concurrency = options.concurrency ?? 10;

  const updates: UpdateRecord[] = [];
  const errors: string[] = [];
  let rollbackPerformed = false;
  let backupFile: string | undefined;
  let htmlReportFile: string | undefined;

  const activeColumns = plan.columnTargets.filter(c => c.estimatedRows > 0);

  // Resolve checkpoint for resumable execution
  let checkpointFile: string | undefined;
  if (options.resumeFrom) {
    const resumed = loadCheckpoint(options.resumeFrom);
    if (resumed) {
      const completed = buildCompletedSet(resumed);
      config.onProgress?.(
        `Retomando execução — ${completed.size} atualização(ões) já concluída(s) serão ignoradas`,
      );
      backupFile = resumed.backupFile;
      checkpointFile = options.resumeFrom;
    }
  }

  try {
    // Backup BEFORE any write — synchronous, instant, no network needed
    if (activeColumns.length > 0 && !backupFile) {
      config.onProgress?.('Criando backup de segurança...');
      backupFile = createBackup(plan.userMappings, activeColumns, backupDir);

      // Display backup path prominently so user can find it for rollback
      config.onProgress?.(`\n  ╔══════════════════════════════════════════════════════════╗`);
      config.onProgress?.(`  ║  BACKUP DE ROLLBACK CRIADO — GUARDE ESTE CAMINHO:        ║`);
      config.onProgress?.(`  ║  ${backupFile.padEnd(56)}  ║`);
      config.onProgress?.(`  ╚══════════════════════════════════════════════════════════╝\n`);

      // Initialize checkpoint for this execution
      checkpointFile = path.join(backupDir, `sync-checkpoint-${Date.now()}.json`);
      saveCheckpoint(checkpointFile, {
        version: 1,
        startedAt: new Date().toISOString(),
        backupFile,
        completed: [],
        failed: [],
      });
    }

    config.onProgress?.('Executando atualizações...');
    const executed = await executeUpdates(
      newClient,
      plan.userMappings,
      plan.columnTargets,
      concurrency,
      (r) => {
        if (r.error) {
          config.onProgress?.(`  ⚠ ${r.tableName}.${r.columnName}: ${sanitizeMessage(r.error)}`);
        } else {
          config.onProgress?.(`  ✓ ${r.tableName}.${r.columnName}: ${r.rowsAffected} linha(s)`);
        }
      },
      { concurrency, timeoutMs, retry, checkpointFile },
    );
    updates.push(...executed);

    const failedUpdates = executed.filter(u => !!u.error);
    if (failedUpdates.length > 0 && backupFile) {
      config.onProgress?.(
        `\n  ${failedUpdates.length} erro(s) detectado(s) — iniciando rollback automático...`,
      );
      try {
        const rollback = await restoreFromBackup(newClient, backupFile, { timeoutMs, retry });
        rollbackPerformed = true;
        errors.push(...failedUpdates.map(u => `${u.tableName}.${u.columnName}: ${sanitizeMessage(u.error ?? '')}`));
        if (rollback.errors.length > 0) {
          errors.push(
            `Rollback parcial — ${rollback.errors.length} erro(s) durante restauração:\n` +
            rollback.errors.map(e => `  • ${e}`).join('\n'),
          );
          config.onProgress?.(`  ⚠ Rollback concluído com ${rollback.errors.length} erro(s) — verifique o banco manualmente`);
        } else {
          config.onProgress?.(`  ✓ Rollback concluído — ${rollback.restored} linha(s) restaurada(s)`);
        }
      } catch (rollbackErr) {
        const msg = sanitizeMessage(rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr));
        errors.push(`Rollback falhou: ${msg}`);
        config.onProgress?.(`  ✗ Rollback FALHOU: ${msg}`);
        config.onProgress?.(`  → Execute manualmente: lovable-migrate sync-users --rollback --backup-file "${backupFile}"`);
      }
    }
  } catch (err) {
    const msg = sanitizeMessage(err instanceof Error ? err.message : String(err));
    errors.push(msg);

    if (backupFile) {
      config.onProgress?.('Erro inesperado — tentando rollback de emergência...');
      try {
        const rollback = await restoreFromBackup(newClient, backupFile, { timeoutMs, retry });
        rollbackPerformed = true;
        if (rollback.errors.length === 0) {
          config.onProgress?.(`  ✓ Rollback de emergência concluído — ${rollback.restored} linha(s) restaurada(s)`);
        } else {
          config.onProgress?.(`  ⚠ Rollback parcial — ${rollback.errors.length} erro(s)`);
        }
      } catch (rollbackErr) {
        const rmsg = sanitizeMessage(rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr));
        errors.push(`Rollback de emergência falhou: ${rmsg}`);
        config.onProgress?.(`  ✗ Rollback FALHOU — restaure manualmente usando: "${backupFile}"`);
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

  // HTML report is best-effort — failure must never suppress the main result
  try {
    config.onProgress?.('Gerando relatório HTML...');
    htmlReportFile = generateHtmlReport(result, backupDir);
    result.htmlReportFile = htmlReportFile;
    config.onProgress?.(`Relatório: ${htmlReportFile}`);
  } catch (reportErr) {
    // Log but don't surface to user — report failure is not a migration failure
    process.stderr.write(
      `[sync] Aviso: falha ao gerar relatório HTML: ${reportErr instanceof Error ? reportErr.message : String(reportErr)}\n`,
    );
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
      errors: [sanitizeMessage(err instanceof Error ? err.message : String(err))],
      rollbackPerformed: false,
      durationMs: Date.now() - start,
      executedAt: new Date().toISOString(),
    };
  }

  if (config.options.dryRun) {
    const backupDir = config.options.backupDir ?? DEFAULT_BACKUP_DIR;
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
      dryResult.htmlReportFile = generateHtmlReport(dryResult, backupDir);
    } catch { /* best-effort */ }
    return dryResult;
  }

  return executeSyncPlan(plan, config);
}

export type { SyncOptions, SyncResult, SyncPlan, UserMapping, ColumnTarget, UpdateRecord, ConfidenceScore, ConfidenceLevel, ConflictReport } from './types';

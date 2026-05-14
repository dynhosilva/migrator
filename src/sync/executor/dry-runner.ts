import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, SyncPlan } from '../types';
import { detectConflicts } from '../detection/conflict-detector';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout';
import { withRetry, DEFAULT_RETRY, type RetryOptions } from '../utils/retry';

export interface BuildSyncPlanOptions {
  timeoutMs?: number;
  retry?: RetryOptions;
}

export async function buildSyncPlan(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
  baseWarnings: string[],
  opts: BuildSyncPlanOptions = {},
): Promise<SyncPlan> {
  const oldIds = mappings.map(m => m.oldUserId);
  const warnings = [...baseWarnings];
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUTS.rowCount;
  const retry = opts.retry ?? DEFAULT_RETRY;

  // Count affected rows for ALL columns in parallel — reduces O(cols × RTT) to O(1 × RTT)
  const columnTargets: ColumnTarget[] = await Promise.all(
    columns.map(async (col): Promise<ColumnTarget> => {
      try {
        const { count, error } = await withRetry(
          () => withTimeout(
            (client
              .from(col.tableName)
              .select('*', { count: 'exact', head: true })
              .in(col.columnName, oldIds)) as unknown as Promise<{ count: number | null; error: { message: string } | null }>,
            timeoutMs,
            `count ${col.tableName}.${col.columnName}`,
          ),
          retry,
          `count ${col.tableName}.${col.columnName}`,
        );

        if (error) {
          warnings.push(
            `Não foi possível contar registros em ${col.tableName}.${col.columnName}: ${error.message}`,
          );
          return { ...col, estimatedRows: -1 };
        }
        return { ...col, estimatedRows: count ?? 0 };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(
          `Tempo limite ao contar ${col.tableName}.${col.columnName} — ` +
          `coluna incluída com estimativa desconhecida. Detalhe: ${msg}`,
        );
        return { ...col, estimatedRows: -1 };
      }
    }),
  );

  const estimatedTotalUpdates = columnTargets.reduce(
    (sum, c) => sum + Math.max(0, c.estimatedRows),
    0,
  );

  const conflicts = await detectConflicts(client, mappings, columnTargets, { timeoutMs, retry });

  return {
    userMappings: mappings,
    columnTargets,
    conflicts,
    estimatedTotalUpdates,
    warnings,
    detectedAt: new Date().toISOString(),
  };
}

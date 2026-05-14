import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, SyncPlan } from '../types';

export async function buildSyncPlan(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
  baseWarnings: string[],
): Promise<SyncPlan> {
  const oldIds = mappings.map(m => m.oldUserId);
  const warnings = [...baseWarnings];
  const columnTargets: ColumnTarget[] = [];

  for (const col of columns) {
    const { count, error } = await client
      .from(col.tableName)
      .select('*', { count: 'exact', head: true })
      .in(col.columnName, oldIds);

    if (error) {
      warnings.push(
        `Não foi possível contar registros em ${col.tableName}.${col.columnName}: ${error.message}`,
      );
      columnTargets.push({ ...col, estimatedRows: -1 });
    } else {
      columnTargets.push({ ...col, estimatedRows: count ?? 0 });
    }
  }

  const estimatedTotalUpdates = columnTargets.reduce(
    (sum, c) => sum + Math.max(0, c.estimatedRows),
    0,
  );

  return {
    userMappings: mappings,
    columnTargets,
    estimatedTotalUpdates,
    warnings,
    detectedAt: new Date().toISOString(),
  };
}

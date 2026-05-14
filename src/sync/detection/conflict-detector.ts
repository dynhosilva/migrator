import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, ConflictReport } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout';
import { withRetry, DEFAULT_RETRY, type RetryOptions } from '../utils/retry';

export interface DetectConflictsOptions {
  timeoutMs?: number;
  retry?: RetryOptions;
}

/**
 * Detects conflicts BEFORE running updates.
 *
 * A conflict occurs when a newUserId already has rows in a target table —
 * i.e., the user created data in the new project after sign-up. Migrating
 * old data into the same user_id would merge or violate unique constraints.
 *
 * Algorithm:
 * 1. One query per column: SELECT col FROM table WHERE col IN (all_new_ids)
 *    → identify which new IDs already have data (O(columns) queries)
 * 2. For each found new ID: count its rows — run ALL in parallel
 *    → O(1) parallel round instead of O(found_ids) sequential (was N+1)
 * 3. On query failure: add a warning and continue — never silently drop
 */
export async function detectConflicts(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
  opts: DetectConflictsOptions = {},
): Promise<ConflictReport[]> {
  const activeColumns = columns.filter(c => c.estimatedRows > 0);
  if (activeColumns.length === 0 || mappings.length === 0) return [];

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUTS.rowCount;
  const retry = opts.retry ?? DEFAULT_RETRY;
  const newIds = mappings.map(m => m.newUserId);

  const allConflicts: ConflictReport[] = [];

  for (const col of activeColumns) {
    let foundNewIds: Set<string>;

    try {
      const { data, error } = await withRetry(
        () => withTimeout(
          (client
            .from(col.tableName)
            .select(col.columnName)
            .in(col.columnName, newIds)) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
          timeoutMs,
          `conflict-check ${col.tableName}.${col.columnName}`,
        ),
        retry,
        `conflict-check ${col.tableName}.${col.columnName}`,
      );

      if (error || !data) {
        // Don't silently skip — surface the failure so user knows detection was incomplete
        allConflicts.push({
          email: '[detecção falhou]',
          newUserId: '',
          tableName: col.tableName,
          columnName: col.columnName,
          existingRowCount: -1,
        });
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      foundNewIds = new Set((data as any[]).map(r => r[col.columnName]));
    } catch {
      allConflicts.push({
        email: '[detecção falhou]',
        newUserId: '',
        tableName: col.tableName,
        columnName: col.columnName,
        existingRowCount: -1,
      });
      continue;
    }

    // Collect mappings that have conflicts for this column
    const conflictingMappings = mappings.filter(m => foundNewIds.has(m.newUserId));
    if (conflictingMappings.length === 0) continue;

    // Count rows for all conflicting new IDs IN PARALLEL — eliminates the N+1 pattern
    const counts = await Promise.all(
      conflictingMappings.map(async (mapping) => {
        try {
          const { count } = await withRetry(
            () => withTimeout(
              (client
                .from(col.tableName)
                .select('*', { count: 'exact', head: true })
                .eq(col.columnName, mapping.newUserId)) as unknown as Promise<{ count: number | null; error: unknown }>,
              timeoutMs,
              `conflict-count ${col.tableName}.${col.columnName}`,
            ),
            retry,
            `conflict-count ${col.tableName}.${col.columnName}`,
          );
          return { mapping, count: count ?? 0 };
        } catch {
          return { mapping, count: 0 };
        }
      }),
    );

    for (const { mapping, count } of counts) {
      allConflicts.push({
        email: mapping.email,
        newUserId: mapping.newUserId,
        tableName: col.tableName,
        columnName: col.columnName,
        existingRowCount: count,
      });
    }
  }

  return allConflicts;
}

export function describeConflict(c: ConflictReport): string {
  if (c.existingRowCount === -1) {
    return `Tabela "${c.tableName}": detecção de conflito falhou — verifique manualmente`;
  }
  return (
    `${c.email}: tabela "${c.tableName}" já tem ${c.existingRowCount} ` +
    `registro(s) com o novo UUID — migrar pode mesclar dados ou violar constraints`
  );
}

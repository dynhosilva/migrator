import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, UpdateRecord } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s: string): boolean {
  return UUID_RE.test(s);
}

export async function executeUpdates(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
  batchSize: number,
  onProgress?: (record: UpdateRecord) => void,
): Promise<UpdateRecord[]> {
  const results: UpdateRecord[] = [];

  for (const col of columns) {
    if (col.estimatedRows === 0) continue;

    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);

      for (const mapping of batch) {
        // UUID validation before every write — prevents injection-style issues
        if (!isValidUuid(mapping.oldUserId) || !isValidUuid(mapping.newUserId)) {
          const record: UpdateRecord = {
            tableName: col.tableName,
            columnName: col.columnName,
            oldUserId: mapping.oldUserId,
            newUserId: mapping.newUserId,
            rowsAffected: 0,
            durationMs: 0,
            error: `UUID inválido: old=${mapping.oldUserId} new=${mapping.newUserId}`,
          };
          results.push(record);
          onProgress?.(record);
          continue;
        }

        const start = Date.now();

        // Use col.columnName in select to avoid hardcoding 'id' — avoids failing
        // on tables with non-standard primary key names
        const { data, error } = await client
          .from(col.tableName)
          .update({ [col.columnName]: mapping.newUserId })
          .eq(col.columnName, mapping.oldUserId)
          .select(col.columnName);

        const record: UpdateRecord = {
          tableName: col.tableName,
          columnName: col.columnName,
          oldUserId: mapping.oldUserId,
          newUserId: mapping.newUserId,
          rowsAffected: Array.isArray(data) ? data.length : 0,
          durationMs: Date.now() - start,
          error: error?.message,
        };

        results.push(record);
        onProgress?.(record);
      }
    }
  }

  return results;
}

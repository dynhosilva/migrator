import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, UpdateRecord } from '../types';

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
        const start = Date.now();

        const { data, error } = await client
          .from(col.tableName)
          .update({ [col.columnName]: mapping.newUserId })
          .eq(col.columnName, mapping.oldUserId)
          .select('id');

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

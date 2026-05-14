import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, UpdateRecord } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout';
import { withRetry, DEFAULT_RETRY, type RetryOptions } from '../utils/retry';
import {
  saveCheckpoint,
  loadCheckpoint,
  buildCompletedSet,
  makeCheckpointKey,
  type CheckpointData,
} from './checkpoint';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s: string): boolean {
  return UUID_RE.test(s);
}

export interface ExecuteUpdatesOptions {
  concurrency?: number;
  timeoutMs?: number;
  retry?: RetryOptions;
  checkpointFile?: string;
}

// Worker-pool: runs fn(item) for all items, at most `limit` in parallel.
async function runConcurrently<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
}

export async function executeUpdates(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
  concurrency: number,
  onProgress?: (record: UpdateRecord) => void,
  opts: ExecuteUpdatesOptions = {},
): Promise<UpdateRecord[]> {
  const results: UpdateRecord[] = [];
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUTS.singleUpdate;
  const retry = opts.retry ?? DEFAULT_RETRY;
  const concurrencyLimit = opts.concurrency ?? concurrency;

  // Load checkpoint to skip already-completed updates on resume
  let completedKeys: Set<string> | null = null;
  let checkpoint: CheckpointData | null = null;
  if (opts.checkpointFile) {
    checkpoint = loadCheckpoint(opts.checkpointFile);
    if (checkpoint) completedKeys = buildCompletedSet(checkpoint);
  }

  // Build flat work list — (column, mapping) pairs
  type WorkItem = { col: ColumnTarget; mapping: UserMapping };
  const workItems: WorkItem[] = [];
  for (const col of columns) {
    if (col.estimatedRows === 0) continue;
    for (const mapping of mappings) {
      workItems.push({ col, mapping });
    }
  }

  await runConcurrently(workItems, concurrencyLimit, async ({ col, mapping }) => {
    // Skip already-completed on resume
    const ckKey = makeCheckpointKey(col.tableName, col.columnName, mapping.oldUserId);
    if (completedKeys?.has(ckKey)) return;

    // UUID validation before every write — prevents malformed data reaching the DB
    if (!isValidUuid(mapping.oldUserId) || !isValidUuid(mapping.newUserId)) {
      const record: UpdateRecord = {
        tableName: col.tableName,
        columnName: col.columnName,
        oldUserId: mapping.oldUserId,
        newUserId: mapping.newUserId,
        rowsAffected: 0,
        durationMs: 0,
        error: `UUID inválido detectado — atualização ignorada para segurança`,
      };
      results.push(record);
      onProgress?.(record);
      return;
    }

    const start = Date.now();
    let rowsAffected = 0;
    let errorMsg: string | undefined;

    try {
      const { data, error } = await withRetry(
        () => withTimeout(
          (client
            .from(col.tableName)
            .update({ [col.columnName]: mapping.newUserId })
            .eq(col.columnName, mapping.oldUserId)
            .select(col.columnName)) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
          timeoutMs,
          `update ${col.tableName}.${col.columnName}`,
        ),
        retry,
        `${col.tableName}.${col.columnName}`,
      );

      if (error) {
        errorMsg = error.message;
      } else {
        rowsAffected = Array.isArray(data) ? data.length : 0;
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const record: UpdateRecord = {
      tableName: col.tableName,
      columnName: col.columnName,
      oldUserId: mapping.oldUserId,
      newUserId: mapping.newUserId,
      rowsAffected,
      durationMs: Date.now() - start,
      error: errorMsg,
    };

    results.push(record);
    onProgress?.(record);

    // Persist checkpoint after each successful update
    if (opts.checkpointFile && !errorMsg && checkpoint) {
      checkpoint.completed.push({
        tableName: col.tableName,
        columnName: col.columnName,
        oldUserId: mapping.oldUserId,
      });
      try { saveCheckpoint(opts.checkpointFile, checkpoint); } catch { /* best-effort */ }
    }
  });

  return results;
}

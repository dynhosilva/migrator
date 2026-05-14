import fs from 'fs';
import path from 'path';

export interface CheckpointEntry {
  tableName: string;
  columnName: string;
  oldUserId: string;
}

export interface CheckpointData {
  version: 1;
  startedAt: string;
  backupFile: string;
  completed: CheckpointEntry[];
  failed: CheckpointEntry[];
}

export function makeCheckpointKey(tableName: string, columnName: string, oldUserId: string): string {
  return `${tableName}:${columnName}:${oldUserId}`;
}

export function buildCompletedSet(data: CheckpointData): Set<string> {
  return new Set(data.completed.map(e => makeCheckpointKey(e.tableName, e.columnName, e.oldUserId)));
}

function isValidCheckpoint(obj: unknown): obj is CheckpointData {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return (
    c['version'] === 1 &&
    typeof c['startedAt'] === 'string' &&
    typeof c['backupFile'] === 'string' &&
    Array.isArray(c['completed']) &&
    Array.isArray(c['failed'])
  );
}

export function saveCheckpoint(file: string, data: CheckpointData): void {
  const tmp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

export function loadCheckpoint(file: string): CheckpointData | null {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const data: unknown = JSON.parse(raw);
    return isValidCheckpoint(data) ? data : null;
  } catch {
    return null;
  }
}

export function findLatestCheckpoint(dir: string): string | null {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('sync-checkpoint-') && f.endsWith('.json'))
      .sort()
      .reverse();
    return files[0] ? path.join(dir, files[0]) : null;
  } catch {
    return null;
  }
}

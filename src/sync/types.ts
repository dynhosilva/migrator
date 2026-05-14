export interface UserMapping {
  oldUserId: string;
  newUserId: string;
  email: string;
  matchMethod: 'email' | 'manual';
}

export interface ColumnTarget {
  tableName: string;
  columnName: string;
  estimatedRows: number;
}

export interface SyncPlan {
  userMappings: UserMapping[];
  columnTargets: ColumnTarget[];
  estimatedTotalUpdates: number;
  warnings: string[];
  detectedAt: string;
}

export interface UpdateRecord {
  tableName: string;
  columnName: string;
  oldUserId: string;
  newUserId: string;
  rowsAffected: number;
  durationMs: number;
  error?: string;
}

export interface BackupEntry {
  tableName: string;
  columnName: string;
  oldUserId: string;
  newUserId: string;
}

export interface SyncResult {
  success: boolean;
  dryRun: boolean;
  plan: SyncPlan;
  updates: UpdateRecord[];
  totalRowsUpdated: number;
  tablesUpdated: string[];
  errors: string[];
  rollbackPerformed: boolean;
  backupFile?: string;
  durationMs: number;
  executedAt: string;
}

export interface SyncOptions {
  dryRun: boolean;
  batchSize: number;
  skipTables: string[];
  skipColumns: string[];
  extraColumns: string[];
  verbose: boolean;
  backupDir?: string;
}

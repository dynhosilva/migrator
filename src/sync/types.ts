export type ConfidenceLevel = 'high' | 'medium' | 'suspicious';

export interface ConfidenceScore {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
}

export interface UserMapping {
  oldUserId: string;
  newUserId: string;
  email: string;
  matchMethod: 'email' | 'manual';
  confidence: ConfidenceScore;
}

export interface ConflictReport {
  email: string;
  newUserId: string;
  tableName: string;
  columnName: string;
  existingRowCount: number;
}

export interface ColumnTarget {
  tableName: string;
  columnName: string;
  estimatedRows: number;
}

export interface SyncPlan {
  userMappings: UserMapping[];
  columnTargets: ColumnTarget[];
  conflicts: ConflictReport[];
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
  htmlReportFile?: string;
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
  timeout?: number;      // ms per network operation — default 30 000
  maxRetries?: number;   // retries on transient errors — default 3
  concurrency?: number;  // parallel updates in flight — default 10
  resumeFrom?: string;   // checkpoint file path for resumable execution
}

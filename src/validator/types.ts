export type ValidationSeverity = 'critical' | 'warning' | 'info';

export interface ValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly rule: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface ValidationSummary {
  readonly totalIssues: number;
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly rulesExecuted: number;
}

export interface ValidationResult {
  readonly issues: ValidationIssue[];
  readonly blockingIssues: ValidationIssue[];
  readonly warnings: ValidationIssue[];
  readonly infos: ValidationIssue[];
  readonly safeToMigrate: boolean;
  readonly summary: ValidationSummary;
  readonly validatedAt: string;
}

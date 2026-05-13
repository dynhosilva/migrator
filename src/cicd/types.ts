import type { GeneratedFile } from '../migrator/types';

export type { GeneratedFile };

export type CicdReadiness = 'ready' | 'ready-with-warnings' | 'blocked';
export type CicdIssueSeverity = 'blocker' | 'warning' | 'info';

/** Tipo de step de CI — usado pelos geradores de workflow na Fatia 2+. */
export type CiStepKind =
  | 'install'
  | 'typecheck'
  | 'test'
  | 'build'
  | 'publish'
  | 'docker'
  | 'health-check';

export interface CicdIssue {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly severity: CicdIssueSeverity;
}

export interface CiSummary {
  readonly files: GeneratedFile[];
  readonly issues: CicdIssue[];
}

export interface ReleaseSummary {
  readonly files: GeneratedFile[];
  readonly issues: CicdIssue[];
}

export interface CicdState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly ci: CiSummary;
  readonly release: ReleaseSummary;
  readonly readiness: CicdReadiness;
  readonly generatedAt: string;
}

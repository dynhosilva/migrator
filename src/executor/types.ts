import type { GeneratedFile } from '../migrator/types';

export type { GeneratedFile };

export type ExecutionReadiness = 'ready' | 'ready-with-warnings' | 'blocked';
export type ExecutionIssueSeverity = 'blocker' | 'warning' | 'info';

export interface ExecutionIssue {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly severity: ExecutionIssueSeverity;
}

export interface ExecutionStep {
  readonly id: string;
  readonly command: string;
  readonly description: string;
  readonly cwd?: string;
  readonly optional: boolean;
}

export interface DockerArtifactCheck {
  readonly valid: boolean;
  readonly presentFiles: string[];
  readonly missingFiles: string[];
  readonly issues: ExecutionIssue[];
}

export interface BuildCommandCheck {
  readonly hasBuildScript: boolean;
  readonly buildCommand: string | null;
  readonly hasDevScript: boolean;
  readonly devCommand: string | null;
  readonly packageManager: string;
  readonly issues: ExecutionIssue[];
}

export interface EnvironmentCheck {
  readonly nodeAvailable: boolean;
  readonly nodeVersion: string | null;
  readonly dockerAvailable: boolean;
  readonly dockerVersion: string | null;
  readonly packageManagerAvailable: boolean;
  readonly packageManagerVersion: string | null;
  readonly issues: ExecutionIssue[];
}

export interface RuntimeCompatibilityCheck {
  readonly nodeVersionOk: boolean;
  readonly requiredNodeVersion: string;
  readonly detectedNodeVersion: string | null;
  readonly issues: ExecutionIssue[];
}

export interface ExecutionPlanArtifacts {
  readonly files: GeneratedFile[];
  readonly steps: ExecutionStep[];
}

export interface DryRunArtifacts {
  readonly files: GeneratedFile[];
}

export interface ExecutionSummary {
  readonly readiness: ExecutionReadiness;
  readonly blockers: ExecutionIssue[];
  readonly warnings: ExecutionIssue[];
  readonly infos: ExecutionIssue[];
  readonly tasksExecuted: number;
}

export interface ExecutionState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly dockerCheck: DockerArtifactCheck;
  readonly buildCheck: BuildCommandCheck;
  readonly envCheck: EnvironmentCheck;
  readonly runtimeCheck: RuntimeCompatibilityCheck;
  readonly plan: ExecutionPlanArtifacts;
  readonly summary: ExecutionSummary;
  readonly dryRun: DryRunArtifacts;
  readonly executedAt: string;
}

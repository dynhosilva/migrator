import type { GeneratedFile } from '../migrator/types';

export type { GeneratedFile };

export type RuntimeReadiness = 'success' | 'partial' | 'failed';
export type RuntimeIssueSeverity = 'blocker' | 'warning' | 'info';

export interface RuntimeIssue {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly severity: RuntimeIssueSeverity;
}

export interface CommandResult {
  readonly command: string;
  readonly args: readonly string[];
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

export interface RunOptions {
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly env?: NodeJS.ProcessEnv;
}

export interface NpmInstallResult {
  readonly success: boolean;
  readonly skipped: boolean;
  readonly command: CommandResult | null;
  readonly issues: RuntimeIssue[];
}

export interface BuildResult {
  readonly success: boolean;
  readonly skipped: boolean;
  readonly command: CommandResult | null;
  readonly artifactDir: string | null;
  readonly artifactExists: boolean;
  readonly issues: RuntimeIssue[];
}

export interface DockerBuildResult {
  readonly success: boolean;
  readonly skipped: boolean;
  readonly command: CommandResult | null;
  readonly imageTag: string;
  readonly issues: RuntimeIssue[];
}

export interface ArtifactValidationResult {
  readonly checkedPaths: Array<{
    path: string;
    exists: boolean;
    type: 'source' | 'generated';
  }>;
  readonly missingPaths: string[];
  readonly issues: RuntimeIssue[];
}

export interface RuntimeLogArtifacts {
  readonly files: GeneratedFile[];
}

export interface RuntimeSummaryArtifacts {
  readonly files: GeneratedFile[];
}

export interface RuntimeState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly projectDir: string;
  readonly install: NpmInstallResult;
  readonly build: BuildResult;
  readonly dockerBuild: DockerBuildResult;
  readonly artifacts: ArtifactValidationResult;
  readonly log: RuntimeLogArtifacts;
  readonly summary: RuntimeSummaryArtifacts;
  readonly readiness: RuntimeReadiness;
  readonly ranAt: string;
}

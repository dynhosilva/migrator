import type { GeneratedFile } from '../migrator/types';

export type { GeneratedFile };

export type RemoteReadiness = 'ready' | 'ready-with-warnings' | 'blocked';
export type RemoteIssueSeverity = 'blocker' | 'warning' | 'info';

export interface RemoteIssue {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly severity: RemoteIssueSeverity;
}

// ─── Modelos de host e SSH ────────────────────────────────────────────────────

export interface HostProfile {
  readonly os: 'ubuntu' | 'debian' | 'centos' | 'alpine' | 'unknown';
  readonly osVersion: string;
  readonly nodeVersion: string | null;
  readonly dockerAvailable: boolean;
  readonly packageManagers: readonly string[];
  readonly availablePorts: readonly number[];
  readonly diskSpaceGB: number;
}

export interface SshConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly keyPath: string;
  readonly authStrategy: 'key' | 'password';
}

// ─── Opções do usuário → config interna resolvida ─────────────────────────────

export interface RemoteOptions {
  readonly sshConfig?: Partial<SshConfig>;
  readonly hostProfile?: Partial<HostProfile>;
  readonly remotePath?: string;
}

/** Config interna com todos os campos obrigatórios (resolvida antes do registry). */
export interface RemoteConfig {
  readonly sshConfig: SshConfig;
  readonly hostProfile: HostProfile;
  readonly remotePath: string;
}

// ─── Resultados das tasks ─────────────────────────────────────────────────────

export interface HostCompatibilityResult {
  readonly compatible: boolean;
  readonly profile: HostProfile;
  readonly issues: RemoteIssue[];
}

export interface SshValidationResult {
  readonly valid: boolean;
  readonly config: SshConfig;
  readonly issues: RemoteIssue[];
}

export interface TransferFile {
  readonly localPath: string;
  readonly remotePath: string;
  readonly estimatedSizeKB: number;
}

export interface TransferPlanResult {
  readonly files: TransferFile[];
  readonly totalEstimatedSizeKB: number;
  readonly issues: RemoteIssue[];
}

export interface DeploymentStrategyResult {
  readonly strategy: string;
  readonly compatible: boolean;
  readonly requirements: string[];
  readonly issues: RemoteIssue[];
}

export interface RemoteStep {
  readonly id: string;
  readonly command: string;
  readonly description: string;
  readonly remote: boolean;
  readonly requires?: readonly string[];
  readonly risk: 'low' | 'medium' | 'high';
}

export interface RemoteExecutionPlanArtifacts {
  readonly files: GeneratedFile[];
  readonly steps: RemoteStep[];
}

export interface RemoteDryRunArtifacts {
  readonly files: GeneratedFile[];
}

export interface RemoteSummaryArtifacts {
  readonly files: GeneratedFile[];
}

// ─── Estado de topo ───────────────────────────────────────────────────────────

export interface RemoteState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly remotePath: string;
  readonly hostCheck: HostCompatibilityResult;
  readonly sshCheck: SshValidationResult;
  readonly transferPlan: TransferPlanResult;
  readonly deploymentCheck: DeploymentStrategyResult;
  readonly executionPlan: RemoteExecutionPlanArtifacts;
  readonly dryRun: RemoteDryRunArtifacts;
  readonly summary: RemoteSummaryArtifacts;
  readonly readiness: RemoteReadiness;
  readonly preparedAt: string;
}

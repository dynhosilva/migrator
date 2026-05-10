// Fontes de entrada
export { resolveSource, LocalFolderSource, ZipSource, GitHubSource, DEFAULT_IGNORE } from './sources';
export type { ProjectFile, ProjectSource, SourceKind, IgnoreRule } from './sources';

// Core — espinha dorsal do pipeline
export { createContext, withAnalysis, withPlan, withValidation, withMigration, withDeploy, withExecution, withRuntime, withRemote } from './core';
export type { ProjectContext, SourceInfo, ProjectMeta } from './core';

// Analyzer
export { analyzeProject, analyzeContext, printReport } from './analyzer';
export type {
  AnalysisReport,
  Framework,
  BuildSystem,
  PackageManager,
  PackageJson,
  LanguageInfo,
  TailwindInfo,
  SupabaseInfo,
  MigrationInfo,
  EdgeFunctionInfo,
  LovableInfo,
  RouteEntry,
} from './analyzer';

// Planner
export { planProject, planContext } from './planner';
export type {
  MigrationPlan,
  CompatibilityResult,
  InfrastructureResult,
  EnvResult,
  SupabasePlanResult,
  DeployStrategyResult,
  Risk,
  ChecklistItem,
  Confidence,
  RiskLevel,
  DeployTarget,
} from './planner';

// Validator
export { validateProject, validateContext, ValidationRegistry } from './validator';
export type {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
  ValidationSummary,
  ValidationRule,
} from './validator';

// Migrator
export { migrateProject, migrateContext } from './migrator';
export type {
  MigrationResult,
  GeneratedFile,
  EnvArtifacts,
  MigrationExportArtifacts,
  EdgeFunctionArtifacts,
  DeployInstructionsArtifact,
  FolderReadmeArtifacts,
  MigrationReportArtifact,
} from './migrator';

// Deploy
export { deployProject, deployContext } from './deploy';
export type {
  DeployState,
  DockerArtifacts,
  DeployReport,
} from './deploy';

// Executor
export { executeProject, executeContext } from './executor';
export type {
  ExecutionState,
  DockerArtifactCheck,
  BuildCommandCheck,
  EnvironmentCheck,
  RuntimeCompatibilityCheck,
  ExecutionPlanArtifacts,
  DryRunArtifacts,
  ExecutionSummary,
  ExecutionIssue,
  ExecutionStep,
  ExecutionReadiness,
  ExecutionIssueSeverity,
} from './executor';

// Runtime
export { runProject, runContext, validateCommand, runSafeCommand, ALLOWED_EXECUTABLES, SandboxViolationError } from './runtime';
export type {
  RuntimeState,
  NpmInstallResult,
  BuildResult,
  DockerBuildResult,
  ArtifactValidationResult,
  RuntimeLogArtifacts,
  RuntimeSummaryArtifacts,
  RuntimeIssue,
  CommandResult,
  RuntimeReadiness,
  RuntimeIssueSeverity,
} from './runtime';

// Remote
export { prepareRemote, prepareContext, DEFAULT_HOST_PROFILE, mergeHostProfile, DEFAULT_SSH_CONFIG, mergeSshConfig } from './remote';
export type {
  RemoteState,
  RemoteOptions,
  RemoteConfig,
  RemoteReadiness,
  HostProfile,
  SshConfig,
  HostCompatibilityResult,
  SshValidationResult,
  TransferPlanResult,
  TransferFile,
  DeploymentStrategyResult,
  RemoteExecutionPlanArtifacts,
  RemoteDryRunArtifacts,
  RemoteSummaryArtifacts,
  RemoteIssue,
  RemoteIssueSeverity,
  RemoteStep,
} from './remote';

// Output — renderização desacoplada
export { TerminalRenderer, JsonRenderer } from './output';
export type { Renderer } from './output';

// Infraestrutura
export { logger, setVerbose } from './logger';
export type { MigrateOptions } from './types';

// Fontes de entrada
export { resolveSource, LocalFolderSource, ZipSource, GitHubSource, DEFAULT_IGNORE } from './sources';
export type { ProjectFile, ProjectSource, SourceKind, IgnoreRule } from './sources';

// Core — espinha dorsal do pipeline
export { createContext, withAnalysis, withPlan, withValidation, withMigration, withDeploy, withExecution, withRuntime, withRemote, withCicd, withGuide } from './core';
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

// CICD — geração de workflows GitHub Actions
export { cicdProject, cicdContext } from './cicd';
export type {
  CicdState,
  CiSummary,
  ReleaseSummary,
  CicdIssue,
  CicdReadiness,
  CicdIssueSeverity,
  CiStepKind,
} from './cicd';

// Guide — geração de pacote de deploy assistido humano (DEPLOY.md, scripts, nginx, etc.)
//
// Boundary intencionalmente minimalista:
//   - guideProject / guideContext: entry points reais da fase
//   - resolveTargetProfile / listAvailableTargets: introspecção para CLI e TUI
//   - tipos: para consumidores externos (TUI, API)
//
// NÃO exposto deliberadamente (uso interno do módulo):
//   - HOSTINGER_PROFILE, GENERIC_PROFILE — perfis são dados, acesse via resolveTargetProfile
//   - SCRIPT_FILENAMES, SCRIPTS_DIR, scriptRefFor — constantes internas em guide/constants.ts
//   - GENERATED_FILE, ChecklistSection/Item/Phase/Difficulty — implementação interna do CHECKLIST
export { guideProject, guideContext, resolveTargetProfile, listAvailableTargets } from './guide';
export type {
  GuideState,
  GuideOptions,
  GuideConfig,
  GuideTarget,
  GuideTargetProfile,
  DeployDocArtifact,
  ChecklistArtifact,
  BashScriptsArtifact,
  BashScriptFile,
  BashScriptKey,
  BashScriptExecutionLocation,
} from './guide';

// Aliased na exportação pública para evitar colisão com `ChecklistItem` do planner
// (que representa itens do plano de migração — outro domínio).
export type {
  ChecklistSection as GuideChecklistSection,
  ChecklistItem as GuideChecklistItem,
  ChecklistPhase as GuideChecklistPhase,
  ChecklistDifficulty as GuideChecklistDifficulty,
} from './guide';

// Output — renderização desacoplada
export { TerminalRenderer, JsonRenderer } from './output';
export type { Renderer } from './output';

// Sync — reconexão automática de user_ids entre projetos Supabase
export { syncUsers } from './sync';
export type { SyncConfig, SyncOptions, SyncResult, UserMapping, ColumnTarget, SyncPlan, UpdateRecord } from './sync';

// Infraestrutura
export { logger, setVerbose } from './logger';
export type { MigrateOptions } from './types';

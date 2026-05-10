// Fontes de entrada
export { resolveSource, LocalFolderSource, ZipSource, GitHubSource, DEFAULT_IGNORE } from './sources';
export type { ProjectFile, ProjectSource, SourceKind, IgnoreRule } from './sources';

// Core — espinha dorsal do pipeline
export { createContext, withAnalysis, withPlan, withValidation, withMigration } from './core';
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

// Output — renderização desacoplada
export { TerminalRenderer, JsonRenderer } from './output';
export type { Renderer } from './output';

// Infraestrutura
export { logger, setVerbose } from './logger';
export type { MigrateOptions } from './types';

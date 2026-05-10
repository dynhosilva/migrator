// Fontes de entrada
export { resolveSource, LocalFolderSource, ZipSource, GitHubSource, DEFAULT_IGNORE } from './sources';
export type { ProjectFile, ProjectSource, SourceKind, IgnoreRule } from './sources';

// Core — espinha dorsal do pipeline
export { createContext, withAnalysis } from './core';
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

// Output — renderização desacoplada
export { TerminalRenderer, JsonRenderer } from './output';
export type { Renderer } from './output';

// Infraestrutura
export { logger, setVerbose } from './logger';
export type { MigrateOptions } from './types';

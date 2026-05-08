export { resolveSource, LocalFolderSource, ZipSource, GitHubSource, DEFAULT_IGNORE } from './sources';
export { analyzeProject, printReport } from './analyzer';
export { logger, setVerbose } from './logger';
export type { ProjectFile, ProjectSource, SourceKind, IgnoreRule } from './sources';
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
export type { MigrateOptions } from './types';

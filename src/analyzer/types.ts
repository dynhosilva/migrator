export type Framework     = 'next' | 'react' | 'vue' | 'svelte' | 'unknown';
export type BuildSystem   = 'vite' | 'webpack' | 'cra' | 'next' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface LanguageInfo {
  primary: 'typescript' | 'javascript';
  hasTypeScriptConfig: boolean;
  tsFileCount: number;
  jsFileCount: number;
}

export interface TailwindInfo {
  detected: boolean;
  hasShadcn: boolean;
  hasRadix: boolean;
}

export interface MigrationInfo {
  count: number;
  files: string[];
}

export interface EdgeFunctionInfo {
  count: number;
  names: string[];
}

export interface SupabaseInfo {
  detected: boolean;
  usesAuth: boolean;
  usesStorage: boolean;
  usesRealtime: boolean;
  clientFiles: string[];
  migrations: MigrationInfo;
  edgeFunctions: EdgeFunctionInfo;
}

export interface LovableInfo {
  detected: boolean;
  configFile: string | null;
}

export interface RouteEntry {
  path: string;
  file: string;
}

export interface AnalysisReport {
  projectName: string;
  language: LanguageInfo;
  framework: Framework;
  buildSystem: BuildSystem;
  packageManager: PackageManager;
  tailwind: TailwindInfo;
  packageJson: PackageJson | null;
  supabase: SupabaseInfo;
  lovable: LovableInfo;
  envVars: string[];
  routes: RouteEntry[];
  criticalFiles: string[];
  detectedAt: string;
}

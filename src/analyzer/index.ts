import { ProjectFile } from '../sources';
import { AnalysisReport, PackageJson } from './types';
import { detectLanguage }        from './detectors/language';
import { detectFramework }       from './detectors/framework';
import { detectBuildSystem }     from './detectors/build';
import { detectPackageManager }  from './detectors/package-manager';
import { detectTailwind }        from './detectors/tailwind';
import { detectSupabase }        from './detectors/supabase';
import { detectLovable }         from './detectors/lovable';
import { detectEnvVars }         from './detectors/env';
import { detectRoutes }          from './detectors/routes';
import { detectCriticalFiles }   from './detectors/files';
import { logger } from '../logger';

// Prefere o package.json mais raso (raiz do projeto), necessário para ZIPs com pasta raiz.
function extractPackageJson(files: ProjectFile[]): PackageJson | null {
  const candidates = files
    .filter((f) => f.relativePath.endsWith('package.json'))
    .sort((a, b) => a.relativePath.split('/').length - b.relativePath.split('/').length);

  const file = candidates[0];
  if (!file) return null;

  try {
    return JSON.parse(file.content.toString()) as PackageJson;
  } catch {
    logger.warn('Falha ao parsear package.json — arquivo pode estar corrompido');
    return null;
  }
}

export function analyzeProject(files: ProjectFile[], projectName = 'unknown'): AnalysisReport {
  logger.info(`Analisando ${files.length} arquivo(s)...`);

  const packageJson    = extractPackageJson(files);

  const language       = detectLanguage(files);
  const framework      = detectFramework(files, packageJson);
  const buildSystem    = detectBuildSystem(files, packageJson);
  const packageManager = detectPackageManager(files);
  const tailwind       = detectTailwind(files, packageJson);
  const supabase       = detectSupabase(files, packageJson);
  const lovable        = detectLovable(files);
  const envVars        = detectEnvVars(files);
  const routes         = detectRoutes(files, framework);
  const criticalFiles  = detectCriticalFiles(files);

  logger.info('Análise concluída.');

  return {
    projectName,
    language,
    framework,
    buildSystem,
    packageManager,
    tailwind,
    packageJson,
    supabase,
    lovable,
    envVars,
    routes,
    criticalFiles,
    detectedAt: new Date().toISOString(),
  };
}

export { printReport } from './report';
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
} from './types';

import type { ProjectFile } from '../sources/types';
import type { AnalysisReport, PackageJson } from './types';
import { DetectorRegistry } from './registry';
import { detectLanguage }       from './detectors/language';
import { detectFramework }      from './detectors/framework';
import { detectBuildSystem }    from './detectors/build';
import { detectPackageManager } from './detectors/package-manager';
import { detectTailwind }       from './detectors/tailwind';
import { detectSupabase }       from './detectors/supabase';
import { detectLovable }        from './detectors/lovable';
import { detectEnvVars }        from './detectors/env';
import { detectRoutes }         from './detectors/routes';
import { detectCriticalFiles }  from './detectors/files';
import { logger } from '../logger';
import type { ProjectContext } from '../core/types';
import { withAnalysis } from '../core';

// Prefere o package.json mais raso (raiz do projeto) — necessário para ZIPs com pasta raiz.
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

/**
 * Registry de detectores do analyzer.
 *
 * A ordem de registro é intencional:
 *   - framework deve rodar antes de routes (routes lê partial.framework)
 *   - demais detectores são independentes entre si
 *
 * Para adicionar um novo detector: .register({ key: 'minhaChave', detect: ... })
 * Sem precisar alterar mais nada neste arquivo.
 */
const registry = new DetectorRegistry()
  .register({ key: 'language',       detect: ({ files })              => detectLanguage(files) })
  .register({ key: 'framework',      detect: ({ files, packageJson }) => detectFramework(files, packageJson) })
  .register({ key: 'buildSystem',    detect: ({ files, packageJson }) => detectBuildSystem(files, packageJson) })
  .register({ key: 'packageManager', detect: ({ files })              => detectPackageManager(files) })
  .register({ key: 'tailwind',       detect: ({ files, packageJson }) => detectTailwind(files, packageJson) })
  .register({ key: 'supabase',       detect: ({ files, packageJson }) => detectSupabase(files, packageJson) })
  .register({ key: 'lovable',        detect: ({ files })              => detectLovable(files) })
  .register({ key: 'envVars',        detect: ({ files })              => detectEnvVars(files) })
  // routes lê partial.framework — deve ser registrado após framework
  .register({ key: 'routes',         detect: ({ files, partial })     => detectRoutes(files, partial.framework ?? 'unknown') })
  .register({ key: 'criticalFiles',  detect: ({ files })              => detectCriticalFiles(files) });

/**
 * Analisa uma lista de arquivos e retorna o relatório completo.
 * Mantido para backward compatibility — novo código deve usar analyzeContext.
 */
export function analyzeProject(files: ProjectFile[], projectName = 'unknown'): AnalysisReport {
  logger.info(`Analisando ${files.length} arquivo(s)...`);

  const packageJson = extractPackageJson(files);
  const partial     = registry.run(files, packageJson);

  logger.info('Análise concluída.');

  // Todos os campos abaixo são garantidos pelo registry (todos os detectores estão registrados).
  return {
    projectName,
    packageJson,
    language:       partial.language!,
    framework:      partial.framework!,
    buildSystem:    partial.buildSystem!,
    packageManager: partial.packageManager!,
    tailwind:       partial.tailwind!,
    supabase:       partial.supabase!,
    lovable:        partial.lovable!,
    envVars:        partial.envVars!,
    routes:         partial.routes!,
    criticalFiles:  partial.criticalFiles!,
    detectedAt:     new Date().toISOString(),
  };
}

/**
 * Fase de análise do pipeline: enriquece o ProjectContext com AnalysisReport.
 * Esta é a forma preferida de usar o analyzer no pipeline da engine.
 */
export function analyzeContext(ctx: ProjectContext): ProjectContext {
  const report = analyzeProject(ctx.files, ctx.meta.name);
  return withAnalysis(ctx, report);
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

import { ProjectFile } from '../../sources';
import { Framework, PackageJson } from '../types';
import { logger } from '../../logger';

// Ordem importa: Next deve vir antes de React pois Next inclui React nas deps.
const DEPENDENCY_MAP: Array<[string, Framework]> = [
  ['next', 'next'],
  ['nuxt', 'vue'],
  ['vue', 'vue'],
  ['svelte', 'svelte'],
  ['react', 'react'],
];

export function detectFramework(files: ProjectFile[], pkg: PackageJson | null): Framework {
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies };

  for (const [dep, framework] of DEPENDENCY_MAP) {
    if (dep in allDeps) {
      logger.debug(`Framework detectado via dependência: ${dep}`);
      return framework;
    }
  }

  // Fallback por arquivos de configuração quando não há package.json
  const paths = files.map((f) => f.relativePath);
  if (paths.some((p) => /next\.config\.[jt]sx?m?$/.test(p))) return 'next';
  if (paths.some((p) => /vue\.config\.[jt]s$/.test(p))) return 'vue';
  if (paths.some((p) => /svelte\.config\.[jt]s$/.test(p))) return 'svelte';

  logger.debug('Framework não identificado');
  return 'unknown';
}

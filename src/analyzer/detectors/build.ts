import { ProjectFile } from '../../sources';
import { BuildSystem, PackageJson } from '../types';
import { logger } from '../../logger';

export function detectBuildSystem(files: ProjectFile[], pkg: PackageJson | null): BuildSystem {
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const scripts = Object.values(pkg?.scripts ?? {}).join(' ');
  const paths = files.map((f) => f.relativePath);

  if (paths.some((p) => /vite\.config\.[jt]sx?$/.test(p)) || 'vite' in allDeps) {
    logger.debug('Build system: Vite');
    return 'vite';
  }

  // Next tem build embutido — não depende de Vite ou Webpack
  if ('next' in allDeps) {
    logger.debug('Build system: Next.js');
    return 'next';
  }

  if ('react-scripts' in allDeps || scripts.includes('react-scripts')) {
    logger.debug('Build system: Create React App');
    return 'cra';
  }

  if (paths.some((p) => /webpack\.config\.[jt]s$/.test(p)) || 'webpack' in allDeps) {
    logger.debug('Build system: Webpack');
    return 'webpack';
  }

  logger.debug('Build system não identificado');
  return 'unknown';
}

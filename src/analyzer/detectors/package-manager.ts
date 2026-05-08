import { ProjectFile } from '../../sources';
import { PackageManager } from '../types';
import { logger } from '../../logger';

// Ordem importa: lock files mais específicos têm prioridade sobre npm (padrão).
const LOCK_FILE_MAP: Array<[string, PackageManager]> = [
  ['bun.lockb',        'bun'],
  ['pnpm-lock.yaml',   'pnpm'],
  ['yarn.lock',        'yarn'],
  ['package-lock.json','npm'],
];

export function detectPackageManager(files: ProjectFile[]): PackageManager {
  const basenames = new Set(files.map((f) => f.relativePath.split('/').pop() ?? ''));

  for (const [lockFile, manager] of LOCK_FILE_MAP) {
    if (basenames.has(lockFile)) {
      logger.debug(`Package manager: ${manager} (${lockFile})`);
      return manager;
    }
  }

  logger.debug('Package manager: npm (padrão — nenhum lock file encontrado)');
  return 'npm';
}

import { ProjectFile } from '../../sources';
import { LovableInfo } from '../types';
import { logger } from '../../logger';

const LOVABLE_PATTERNS = [
  /(?:^|\/)\.lovable\//, // pasta .lovable/
  /(?:^|\/)\.lovable$/,  // arquivo .lovable
  /(?:^|\/)lovable\.config\.[jt]s$/,
];

export function detectLovable(files: ProjectFile[]): LovableInfo {
  const match = files.find((f) =>
    LOVABLE_PATTERNS.some((re) => re.test(f.relativePath))
  );

  if (match) {
    logger.debug(`Lovable detectado: ${match.relativePath}`);
    return { detected: true, configFile: match.relativePath };
  }

  logger.debug('Configuração Lovable não encontrada');
  return { detected: false, configFile: null };
}

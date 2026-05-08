import { ProjectFile } from '../../sources';
import { LanguageInfo } from '../types';
import { logger } from '../../logger';

export function detectLanguage(files: ProjectFile[]): LanguageInfo {
  let tsCount = 0;
  let jsCount = 0;

  for (const { relativePath } of files) {
    if (/\.d\.ts$/.test(relativePath)) continue; // ignora arquivos de declaração gerados
    if (/\.tsx?$/.test(relativePath)) tsCount++;
    else if (/\.jsx?$/.test(relativePath)) jsCount++;
  }

  const hasTypeScriptConfig = files.some((f) =>
    /^tsconfig[^/]*\.json$/.test(f.relativePath.split('/').pop() ?? '')
  );

  // tsconfig presente ou maioria dos arquivos em TS → TypeScript
  const primary = hasTypeScriptConfig || tsCount >= jsCount ? 'typescript' : 'javascript';

  logger.debug(`Linguagem: ${primary} (${tsCount} ts / ${jsCount} js)`);

  return { primary, hasTypeScriptConfig, tsFileCount: tsCount, jsFileCount: jsCount };
}

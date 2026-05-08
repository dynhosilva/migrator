import { ProjectFile } from '../../sources';
import { logger } from '../../logger';

const ENV_FILENAME = /^\.env(\.\w+)?$/;
const SOURCE_EXT = /\.(tsx?|jsx?|mjs|cjs)$/;
const PROCESS_ENV_RE = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
const IMPORT_META_ENV_RE = /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g;
const ENV_KEY_RE = /^([A-Z_][A-Z0-9_]*)=/;

export function detectEnvVars(files: ProjectFile[]): string[] {
  const vars = new Set<string>();

  for (const file of files) {
    const basename = file.relativePath.split('/').pop() ?? '';

    // Lê variáveis declaradas em arquivos .env
    if (ENV_FILENAME.test(basename)) {
      for (const line of file.content.toString().split('\n')) {
        const match = line.trim().match(ENV_KEY_RE);
        if (match) vars.add(match[1]);
      }
      continue;
    }

    // Extrai referências a env vars em arquivos fonte
    if (!SOURCE_EXT.test(file.relativePath)) continue;

    const content = file.content.toString();
    for (const m of content.matchAll(PROCESS_ENV_RE)) vars.add(m[1]);
    for (const m of content.matchAll(IMPORT_META_ENV_RE)) vars.add(m[1]);
  }

  const result = [...vars].sort();
  logger.debug(`Variáveis de ambiente detectadas: ${result.length}`);
  return result;
}

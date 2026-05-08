import { ProjectFile } from '../../sources';
import { logger } from '../../logger';

export function detectCriticalFiles(files: ProjectFile[]): string[] {
  const found = files
    .filter((f) => isCritical(f.relativePath))
    .map((f) => f.relativePath)
    .sort();

  logger.debug(`Arquivos críticos encontrados: ${found.length}`);
  return found;
}

function isCritical(relativePath: string): boolean {
  const basename = relativePath.split('/').pop() ?? '';

  // Nomes exatos
  const exactNames = new Set([
    'package.json', 'index.html', 'components.json',
    '.env', '.env.example', '.env.local', '.env.production',
    'README.md', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml', 'package-lock.json',
  ]);
  if (exactNames.has(basename)) return true;

  // Padrões por nome de arquivo
  if (/^tsconfig[^/]*\.json$/.test(basename))    return true;
  if (/^vite\.config\.[jt]sx?$/.test(basename))  return true;
  if (/^next\.config\.[jt]sx?m?$/.test(basename)) return true;
  if (/^tailwind\.config\.[jt]sx?$/.test(basename)) return true;
  if (/^postcss\.config\.[jt]sx?$/.test(basename)) return true;
  if (/^lovable\.config\.[jt]s$/.test(basename)) return true;

  // Padrões por caminho completo (normaliza possível pasta raiz de ZIP)
  const normalized = relativePath.replace(/^[^/]+\//, '');
  if (/^src\/main\.[jt]sx?$/.test(normalized))     return true;
  if (/^src\/App\.[jt]sx?$/.test(normalized))      return true;
  if (/^src\/index\.[jt]sx?$/.test(normalized))    return true;
  if (/^supabase\/config\.toml$/.test(normalized)) return true;
  if (/^\.lovable(\/|$)/.test(normalized))         return true;

  return false;
}

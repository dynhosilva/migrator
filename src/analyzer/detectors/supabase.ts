import { ProjectFile } from '../../sources';
import { PackageJson, SupabaseInfo, MigrationInfo, EdgeFunctionInfo } from '../types';
import { logger } from '../../logger';

const SOURCE_EXT = /\.(tsx?|jsx?)$/;

function detectMigrations(files: ProjectFile[]): MigrationInfo {
  const migFiles = files
    .filter((f) => /supabase\/migrations\/.+\.sql$/.test(f.relativePath))
    .map((f) => f.relativePath)
    .sort();

  logger.debug(`Migrations encontradas: ${migFiles.length}`);
  return { count: migFiles.length, files: migFiles };
}

function detectEdgeFunctions(files: ProjectFile[]): EdgeFunctionInfo {
  const names = new Set<string>();

  for (const file of files) {
    // supabase/functions/<nome>/index.ts
    const match = file.relativePath.match(/supabase\/functions\/([^/]+)\//);
    if (match) names.add(match[1]);
  }

  const sorted = [...names].sort();
  logger.debug(`Edge Functions encontradas: ${sorted.length}`);
  return { count: sorted.length, names: sorted };
}

export function detectSupabase(files: ProjectFile[], pkg: PackageJson | null): SupabaseInfo {
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const detected = '@supabase/supabase-js' in allDeps;

  const migrations     = detectMigrations(files);
  const edgeFunctions  = detectEdgeFunctions(files);

  if (!detected) {
    logger.debug('Supabase não encontrado nas dependências');
    return {
      detected: false,
      usesAuth: false,
      usesStorage: false,
      usesRealtime: false,
      clientFiles: [],
      migrations,
      edgeFunctions,
    };
  }

  logger.debug('Supabase detectado — escaneando uso nos arquivos fonte...');

  let usesAuth = false;
  let usesStorage = false;
  let usesRealtime = false;
  const clientFiles: string[] = [];

  for (const file of files) {
    if (!SOURCE_EXT.test(file.relativePath)) continue;

    const content = file.content.toString();
    if (!content.includes('supabase')) continue;

    if (content.includes('createClient'))    clientFiles.push(file.relativePath);
    if (content.includes('.auth.'))          usesAuth = true;
    if (content.includes('.storage.'))       usesStorage = true;
    if (content.includes('.channel(') || content.includes('supabase.realtime')) {
      usesRealtime = true;
    }
  }

  return { detected, usesAuth, usesStorage, usesRealtime, clientFiles, migrations, edgeFunctions };
}

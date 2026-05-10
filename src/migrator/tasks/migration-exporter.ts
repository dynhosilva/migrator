import type { ProjectContext } from '../../core/types';
import type { MigrationExportArtifacts, GeneratedFile } from '../types';

export function exportMigrations(ctx: ProjectContext): MigrationExportArtifacts {
  const { supabase } = ctx.analysis!;

  if (!supabase.detected || supabase.migrations.count === 0) {
    return { files: [], count: 0, skipped: true };
  }

  const files: GeneratedFile[] = [];

  for (const migrationPath of supabase.migrations.files) {
    const projectFile = ctx.files.find((f) => f.relativePath === migrationPath);
    if (!projectFile) continue;

    // Conteúdo binário detectado (arquivos que não são texto puro) — ignorar
    const content = projectFile.content.toString('utf-8');
    if (content.includes('\0')) continue;

    const filename = migrationPath.split('/').pop() ?? migrationPath;
    files.push({
      relativePath: `supabase/migrations/${filename}`,
      content,
      description: `Migration SQL: ${filename}`,
    });
  }

  return { files, count: files.length, skipped: files.length === 0 };
}

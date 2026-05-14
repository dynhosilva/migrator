import type { ProjectContext } from '../../core/types';
import type { EdgeFunctionArtifacts, GeneratedFile } from '../types';

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.toml', '.yaml', '.yml', '.env',
]);

function isTextFile(relativePath: string): boolean {
  const ext = relativePath.slice(relativePath.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export function exportEdgeFunctions(ctx: ProjectContext): EdgeFunctionArtifacts {
  const { supabase } = ctx.analysis!;

  if (!supabase.detected || supabase.edgeFunctions.count === 0) {
    return { files: [], count: 0, names: [], skipped: true };
  }

  const files: GeneratedFile[] = [];
  const exportedNames: string[] = [];

  for (const name of supabase.edgeFunctions.names) {
    // Matches both flat ("supabase/functions/<n>/") and nested-root
    // ("project/supabase/functions/<n>/") paths from ZIP exports.
    const flat   = `supabase/functions/${name}/`;
    const nested = `/supabase/functions/${name}/`;
    const functionFiles = ctx.files.filter((f) =>
      f.relativePath.startsWith(flat) || f.relativePath.includes(nested)
    );

    for (const f of functionFiles) {
      if (!isTextFile(f.relativePath)) continue;

      const content = f.content.toString('utf-8');
      if (content.includes('\0')) continue; // conteúdo binário detectado

      // Strip everything up to and including "supabase/functions/" regardless of nested root.
      const relToFunctions = f.relativePath.replace(/^(?:.*\/)?supabase\/functions\//, '');
      files.push({
        relativePath: `supabase/functions/${relToFunctions}`,
        content,
        description: `Edge Function "${name}": ${relToFunctions}`,
      });
    }

    if (functionFiles.length > 0) {
      exportedNames.push(name);
    }
  }

  return {
    files,
    count: exportedNames.length,
    names: exportedNames,
    skipped: exportedNames.length === 0,
  };
}

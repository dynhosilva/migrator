import type { ProjectContext } from '../../core/types';
import type { RuntimeLogArtifacts, RuntimeState, GeneratedFile } from '../types';
import { makeLogEntry } from '../logger';

export function generateRuntimeLog(
  ctx: ProjectContext,
  partial: Partial<RuntimeState>,
): RuntimeLogArtifacts {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const entries = [];

  if (partial.install?.command) {
    entries.push(makeLogEntry('npm-install', partial.install.command));
  }
  if (partial.build?.command) {
    entries.push(makeLogEntry('build', partial.build.command));
  }
  if (partial.dockerBuild?.command) {
    entries.push(makeLogEntry('docker-build', partial.dockerBuild.command));
  }

  const payload = {
    projectName,
    generatedAt: new Date().toISOString(),
    entries,
  };

  const file: GeneratedFile = {
    relativePath: 'runtime/runtime-log.json',
    content:      JSON.stringify(payload, null, 2),
    description:  'Log estruturado de execução do runtime v1',
  };

  return { files: [file] };
}

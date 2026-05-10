import type { ProjectContext } from '../../core/types';
import type { BuildCommandCheck, ExecutionIssue } from '../types';

export function validateBuildCommands(ctx: ProjectContext): BuildCommandCheck {
  const issues: ExecutionIssue[] = [];
  const analysis = ctx.analysis;
  const pm = analysis?.packageManager ?? 'npm';
  const scripts = analysis?.packageJson?.scripts ?? {};

  const buildScript = scripts['build'] ?? null;
  const devKey = 'dev' in scripts ? 'dev' : 'start' in scripts ? 'start' : null;
  const devScript = devKey ? scripts[devKey] ?? null : null;

  if (!buildScript) {
    issues.push({
      code: 'BUILD_SCRIPT_MISSING',
      message: 'Script "build" não encontrado no package.json.',
      suggestion: 'Adicione um script "build" ao package.json antes de executar o build Docker.',
      severity: 'warning',
    });
  }

  const pmRun = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : pm === 'bun' ? 'bun' : 'npm';
  const buildCommand = buildScript ? `${pmRun} run build` : null;
  const devCommand = devKey ? `${pmRun} run ${devKey}` : null;

  return {
    hasBuildScript: !!buildScript,
    buildCommand,
    hasDevScript: !!devScript,
    devCommand,
    packageManager: pm,
    issues,
  };
}

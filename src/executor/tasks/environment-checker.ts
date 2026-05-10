import { execSync } from 'child_process';
import type { ProjectContext } from '../../core/types';
import type { EnvironmentCheck, ExecutionIssue } from '../types';

function probe(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export function checkEnvironment(ctx: ProjectContext): EnvironmentCheck {
  const pm = ctx.analysis?.packageManager ?? 'npm';
  const issues: ExecutionIssue[] = [];

  const nodeVersion   = probe('node --version');
  const dockerVersion = probe('docker --version');

  const pmVersionCmd =
    pm === 'bun'  ? 'bun --version'  :
    pm === 'pnpm' ? 'pnpm --version' :
    pm === 'yarn' ? 'yarn --version' :
    'npm --version';
  const pmVersion = probe(pmVersionCmd);

  if (!nodeVersion) {
    issues.push({
      code: 'NODE_NOT_FOUND',
      message: 'Node.js não encontrado no PATH.',
      suggestion: 'Instale Node.js >= 18 antes de continuar.',
      severity: 'blocker',
    });
  }

  if (!dockerVersion) {
    issues.push({
      code: 'DOCKER_NOT_FOUND',
      message: 'Docker não encontrado no PATH.',
      suggestion: 'Instale Docker Desktop ou Docker Engine antes de executar o deploy.',
      severity: 'blocker',
    });
  }

  if (!pmVersion) {
    issues.push({
      code: 'PACKAGE_MANAGER_NOT_FOUND',
      message: `Package manager "${pm}" não encontrado no PATH.`,
      suggestion: `Instale ${pm} antes de prosseguir com o build.`,
      severity: 'warning',
    });
  }

  return {
    nodeAvailable:              !!nodeVersion,
    nodeVersion,
    dockerAvailable:            !!dockerVersion,
    dockerVersion,
    packageManagerAvailable:    !!pmVersion,
    packageManagerVersion:      pmVersion,
    issues,
  };
}

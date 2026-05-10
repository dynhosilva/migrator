import type { ProjectContext } from '../../core/types';
import type { DeploymentStrategyResult, HostProfile, RemoteIssue } from '../types';

const STRATEGY_REQUIREMENTS: Record<string, string[]> = {
  static:        ['Docker Engine', 'Nginx (incluído no Dockerfile gerado)'],
  'node-server': ['Docker Engine', 'Node.js >= 18 (gerenciado pelo container)'],
  docker:        ['Docker Engine'],
  unknown:       ['Docker Engine'],
};

export function checkDeploymentStrategy(
  ctx: ProjectContext,
  profile: HostProfile,
): DeploymentStrategyResult {
  const issues: RemoteIssue[] = [];
  const strategy = ctx.plan?.deployStrategy.recommended ?? ctx.deploy?.docker.strategy ?? 'unknown';
  const requirements = STRATEGY_REQUIREMENTS[strategy] ?? ['Docker Engine'];

  if (strategy === 'unknown') {
    issues.push({
      code:       'REMOTE_STRATEGY_UNKNOWN',
      message:    'Estratégia de deploy não determinada — pipeline incompleto.',
      suggestion: 'Execute o pipeline completo (analyze → plan → validate → migrate → deploy) antes do remote.',
      severity:   'blocker',
    });
  }

  if (!profile.dockerAvailable) {
    issues.push({
      code:       'REMOTE_DOCKER_REQUIRED',
      message:    'Docker não está disponível no host remoto — necessário para todas as estratégias.',
      suggestion: 'Instale Docker Engine no servidor: https://docs.docker.com/engine/install/',
      severity:   'blocker',
    });
  }

  const compatible = !issues.some((i) => i.severity === 'blocker');
  return { strategy, compatible, requirements, issues };
}

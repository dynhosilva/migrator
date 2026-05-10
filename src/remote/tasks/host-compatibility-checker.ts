import type { ProjectContext } from '../../core/types';
import type { HostCompatibilityResult, HostProfile, RemoteIssue } from '../types';
import { isPortAvailable, parseNodeMajor } from '../host';

const MIN_DISK_GB  = 2;
const MIN_NODE_MAJOR = 18;

const DEPLOY_PORT: Record<string, number> = {
  static:       80,
  'node-server': 3000,
  docker:       80,
  unknown:      80,
};

export function checkHostCompatibility(
  ctx: ProjectContext,
  profile: HostProfile,
): HostCompatibilityResult {
  const issues: RemoteIssue[] = [];
  const strategy = ctx.plan?.deployStrategy.recommended ?? ctx.deploy?.docker.strategy ?? 'unknown';
  const requiredPort = DEPLOY_PORT[strategy] ?? 80;

  // OS detectável
  if (profile.os === 'unknown') {
    issues.push({
      code:       'HOST_OS_UNKNOWN',
      message:    'Sistema operacional do host não identificado.',
      suggestion: 'Use um perfil com os="ubuntu" ou os="debian" para garantir compatibilidade.',
      severity:   'warning',
    });
  }

  // Node.js >= 18
  const nodeMajor = parseNodeMajor(profile.nodeVersion);
  if (nodeMajor === null) {
    issues.push({
      code:       'HOST_NODE_MISSING',
      message:    'Node.js não disponível no host remoto.',
      suggestion: `Instale Node.js >= ${MIN_NODE_MAJOR} ou garanta que o Docker está disponível para builds containerizados.`,
      severity:   'warning',
    });
  } else if (nodeMajor < MIN_NODE_MAJOR) {
    issues.push({
      code:       'HOST_NODE_VERSION_INCOMPATIBLE',
      message:    `Node.js ${profile.nodeVersion} no host — requerido >= v${MIN_NODE_MAJOR}.`,
      suggestion: `Atualize o Node.js no servidor para v${MIN_NODE_MAJOR} ou superior.`,
      severity:   'blocker',
    });
  }

  // Docker disponível
  if (!profile.dockerAvailable) {
    issues.push({
      code:       'HOST_DOCKER_MISSING',
      message:    'Docker não disponível no host remoto.',
      suggestion: 'Instale Docker Engine no servidor: https://docs.docker.com/engine/install/',
      severity:   'blocker',
    });
  }

  // Porta necessária disponível
  if (!isPortAvailable(profile, requiredPort)) {
    issues.push({
      code:       'HOST_PORT_UNAVAILABLE',
      message:    `Porta ${requiredPort} não está na lista de portas disponíveis do host.`,
      suggestion: `Libere a porta ${requiredPort} no firewall do servidor.`,
      severity:   'warning',
    });
  }

  // Espaço em disco mínimo
  if (profile.diskSpaceGB < MIN_DISK_GB) {
    issues.push({
      code:       'HOST_DISK_SPACE_LOW',
      message:    `Espaço em disco insuficiente: ${profile.diskSpaceGB}GB disponível (mínimo: ${MIN_DISK_GB}GB).`,
      suggestion: 'Libere espaço em disco ou expanda o volume do servidor.',
      severity:   'blocker',
    });
  }

  const compatible = !issues.some((i) => i.severity === 'blocker');
  return { compatible, profile, issues };
}

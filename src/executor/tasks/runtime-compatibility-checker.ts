import type { ProjectContext } from '../../core/types';
import type { RuntimeCompatibilityCheck, ExecutionIssue } from '../types';

const REQUIRED_NODE_MAJOR = 18;

function parseNodeMajor(version: string | null): number | null {
  if (!version) return null;
  const clean = version.replace(/^v/, '').split('.')[0];
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

export function checkRuntimeCompatibility(
  _ctx: ProjectContext,
  nodeVersion: string | null,
): RuntimeCompatibilityCheck {
  const issues: ExecutionIssue[] = [];
  const requiredNodeVersion = `>= ${REQUIRED_NODE_MAJOR}`;
  const major = parseNodeMajor(nodeVersion);
  const nodeVersionOk = major !== null && major >= REQUIRED_NODE_MAJOR;

  if (nodeVersion !== null && !nodeVersionOk) {
    issues.push({
      code: 'NODE_VERSION_INCOMPATIBLE',
      message: `Node.js ${nodeVersion} detectado — requerido ${requiredNodeVersion}.`,
      suggestion: `Atualize para Node.js ${REQUIRED_NODE_MAJOR} ou superior.`,
      severity: 'blocker',
    });
  }

  return {
    nodeVersionOk,
    requiredNodeVersion,
    detectedNodeVersion: nodeVersion,
    issues,
  };
}

import fs from 'fs';
import path from 'path';
import type { ProjectContext } from '../../core/types';
import type { DockerBuildResult, RuntimeIssue } from '../types';
import { runSafeCommand } from '../sandbox';

const DOCKER_BUILD_TIMEOUT_MS = 10 * 60 * 1000;

function toImageTag(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

export async function runDockerBuild(
  ctx: ProjectContext,
  outputDir: string,
  projectDir: string,
): Promise<DockerBuildResult> {
  const projectName  = ctx.analysis?.projectName ?? ctx.meta.name;
  const imageTag     = toImageTag(projectName);
  const dockerfilePath = path.join(outputDir, 'docker', 'Dockerfile');
  const issues: RuntimeIssue[] = [];

  if (!fs.existsSync(dockerfilePath)) {
    issues.push({
      code:       'DOCKERFILE_NOT_FOUND',
      message:    'Dockerfile não encontrado em outputDir/docker/ — docker build pulado.',
      suggestion: 'Execute o comando deploy antes do runtime para gerar o Dockerfile.',
      severity:   'blocker',
    });
    return { success: false, skipped: true, command: null, imageTag, issues };
  }

  // Build context = projectDir; -f aponta para o Dockerfile gerado no outputDir.
  // Isso permite que o Dockerfile multi-stage copie e compile o código-fonte real.
  const args = [
    'build',
    '--file', dockerfilePath,
    '--tag',  `${imageTag}:latest`,
    projectDir,
  ];

  const result = await runSafeCommand('docker', args, {
    cwd:       projectDir,
    timeoutMs: DOCKER_BUILD_TIMEOUT_MS,
  });

  const success = result.exitCode === 0 && !result.timedOut;

  if (result.timedOut) {
    issues.push({
      code:     'DOCKER_BUILD_TIMEOUT',
      message:  `docker build excedeu o timeout de ${DOCKER_BUILD_TIMEOUT_MS / 60000}min.`,
      severity: 'blocker',
    });
  } else if (!success) {
    issues.push({
      code:       'DOCKER_BUILD_FAILED',
      message:    `docker build falhou com exit code ${result.exitCode}.`,
      suggestion: 'Verifique o Dockerfile e os logs de runtime.',
      severity:   'blocker',
    });
  }

  return { success, skipped: false, command: result, imageTag, issues };
}

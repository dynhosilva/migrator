import fs from 'fs';
import path from 'path';
import type { ProjectContext } from '../../core/types';
import type { DockerArtifactCheck, ExecutionIssue } from '../types';

const EXPECTED_DOCKER_FILES = [
  'docker/Dockerfile',
  'docker/docker-compose.yml',
  'docker/.dockerignore',
];

export function validateDockerArtifacts(ctx: ProjectContext, outputDir: string): DockerArtifactCheck {
  const issues: ExecutionIssue[] = [];

  if (!ctx.deploy) {
    issues.push({
      code: 'DOCKER_ARTIFACTS_NOT_GENERATED',
      message: 'Fase de deploy não executada — artefatos Docker não foram gerados.',
      suggestion: 'Execute o comando deploy antes do executor.',
      severity: 'blocker',
    });
    return { valid: false, presentFiles: [], missingFiles: EXPECTED_DOCKER_FILES, issues };
  }

  const presentFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const rel of EXPECTED_DOCKER_FILES) {
    const abs = path.join(outputDir, rel);
    if (fs.existsSync(abs)) {
      presentFiles.push(rel);
    } else {
      missingFiles.push(rel);
    }
  }

  if (missingFiles.length > 0) {
    issues.push({
      code: 'DOCKER_FILES_MISSING',
      message: `${missingFiles.length} ${missingFiles.length === 1 ? 'arquivo Docker ausente' : 'arquivos Docker ausentes'} em outputDir: ${missingFiles.join(', ')}`,
      suggestion: 'Execute o comando deploy para regenerar os artefatos Docker.',
      severity: 'blocker',
    });
  }

  return {
    valid: missingFiles.length === 0,
    presentFiles,
    missingFiles,
    issues,
  };
}

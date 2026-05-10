import fs from 'fs';
import path from 'path';
import type { ProjectContext } from '../../core/types';
import type { ArtifactValidationResult, RuntimeIssue, RuntimeState } from '../types';

const BUILD_OUTPUT: Record<string, string> = {
  vite:    'dist',
  cra:     'build',
  webpack: 'dist',
  next:    '.next',
  unknown: 'dist',
};

const GENERATED_ARTIFACTS = [
  'docker/Dockerfile',
  'docker/docker-compose.yml',
  'env/.env.example',
  'reports/migration-summary.json',
];

export function validateArtifacts(
  ctx: ProjectContext,
  outputDir: string,
  projectDir: string,
  partial: Partial<RuntimeState>,
): ArtifactValidationResult {
  const buildSystem = ctx.analysis?.buildSystem ?? 'unknown';
  const artifactDir = BUILD_OUTPUT[buildSystem] ?? 'dist';
  const issues: RuntimeIssue[] = [];

  const checked: ArtifactValidationResult['checkedPaths'] = [];

  // Artefatos de build (source project)
  const buildPath = path.join(projectDir, artifactDir);
  const buildExists = fs.existsSync(buildPath);
  checked.push({ path: buildPath, exists: buildExists, type: 'source' });

  if (!buildExists && partial.build?.success) {
    issues.push({
      code:     'BUILD_OUTPUT_MISSING',
      message:  `${artifactDir}/ não encontrado após build bem-sucedido.`,
      severity: 'warning',
    });
  }

  // Artefatos gerados (outputDir)
  for (const rel of GENERATED_ARTIFACTS) {
    const abs = path.join(outputDir, rel);
    const exists = fs.existsSync(abs);
    checked.push({ path: abs, exists, type: 'generated' });

    if (!exists) {
      issues.push({
        code:       'GENERATED_ARTIFACT_MISSING',
        message:    `Artefato gerado ausente: ${rel}`,
        suggestion: 'Execute o pipeline completo (migrate + deploy) antes do runtime.',
        severity:   'warning',
      });
    }
  }

  const missingPaths = checked.filter((c) => !c.exists).map((c) => c.path);

  return { checkedPaths: checked, missingPaths, issues };
}

import path from 'path';
import type { ProjectContext } from '../core/types';
import type { CicdState, CicdReadiness, GeneratedFile } from './types';
import { CicdRegistry } from './registry';
import { writeGeneratedFiles } from '../migrator/writer';
import { withCicd } from '../core';
import { logger } from '../logger';

import { generateCiWorkflow }      from './tasks/ci-workflow-generator';
import { generateReleaseWorkflow } from './tasks/release-workflow-generator';

const registry = new CicdRegistry()
  .register({ key: 'ci',      run: (taskCtx) => generateCiWorkflow(taskCtx) })
  .register({ key: 'release', run: (taskCtx) => generateReleaseWorkflow(taskCtx) });

function collectAllFiles(partial: Partial<CicdState>): GeneratedFile[] {
  return [
    ...(partial.ci?.files      ?? []),
    ...(partial.release?.files ?? []),
  ];
}

function computeReadiness(partial: Partial<CicdState>): CicdReadiness {
  const allIssues = [
    ...(partial.ci?.issues      ?? []),
    ...(partial.release?.issues ?? []),
  ];
  if (allIssues.some((i) => i.severity === 'blocker')) return 'blocked';
  if (allIssues.some((i) => i.severity === 'warning')) return 'ready-with-warnings';
  return 'ready';
}

export function cicdProject(ctx: ProjectContext, outputDir: string): CicdState {
  const resolvedOutputDir = path.resolve(outputDir);

  logger.info(`Gerando workflows GitHub Actions para: ${ctx.meta.name}`);

  const partial = registry.run(ctx, resolvedOutputDir);

  const files = collectAllFiles(partial);
  if (files.length > 0) {
    writeGeneratedFiles(resolvedOutputDir, files);
  }

  logger.info(`${files.length} workflow(s) gerado(s) em: ${resolvedOutputDir}`);

  return {
    projectName: ctx.meta.name,
    outputDir:   resolvedOutputDir,
    ci:          partial.ci!,
    release:     partial.release!,
    readiness:   computeReadiness(partial),
    generatedAt: new Date().toISOString(),
  };
}

export function cicdContext(ctx: ProjectContext, outputDir: string): ProjectContext {
  const state = cicdProject(ctx, outputDir);
  return withCicd(ctx, state);
}

export type {
  CicdState,
  CiSummary,
  ReleaseSummary,
  CicdIssue,
  CicdReadiness,
  CicdIssueSeverity,
  CiStepKind,
} from './types';

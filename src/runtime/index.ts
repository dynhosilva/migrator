import path from 'path';
import type { ProjectContext } from '../core/types';
import type { RuntimeState, RuntimeReadiness, GeneratedFile } from './types';
import { RuntimeRegistry }         from './registry';
import { runNpmInstall }           from './tasks/npm-install-runner';
import { runBuild }                from './tasks/build-runner';
import { runDockerBuild }          from './tasks/docker-build-runner';
import { validateArtifacts }       from './tasks/artifact-validator';
import { generateRuntimeLog }      from './tasks/runtime-logger';
import { generateExecutionSummary } from './tasks/execution-summary';
import { writeGeneratedFiles }     from '../migrator/writer';
import { withRuntime }             from '../core';
import { logger }                  from '../logger';

/**
 * Ordem de registro intencional:
 *   1. install     — sem deps
 *   2. build       — sem deps diretos (pode rodar mesmo se install falhou)
 *   3. dockerBuild — sem deps diretos (multi-stage, compila internamente)
 *   4. artifacts   — depende de partial para correlacionar com resultados anteriores
 *   5. log         — agrega CommandResults de install, build, dockerBuild
 *   6. summary     — agrega todos os issues → sumário legível por humano
 */
const registry = new RuntimeRegistry()
  .register({
    key: 'install',
    run: ({ ctx, projectDir }) => runNpmInstall(ctx, projectDir),
  })
  .register({
    key: 'build',
    run: ({ ctx, projectDir }) => runBuild(ctx, projectDir),
  })
  .register({
    key: 'dockerBuild',
    run: ({ ctx, outputDir, projectDir }) => runDockerBuild(ctx, outputDir, projectDir),
  })
  .register({
    key: 'artifacts',
    run: ({ ctx, outputDir, projectDir, partial }) =>
      Promise.resolve(validateArtifacts(ctx, outputDir, projectDir, partial)),
  })
  .register({
    key: 'log',
    run: ({ ctx, partial }) =>
      Promise.resolve(generateRuntimeLog(ctx, partial)),
  })
  .register({
    key: 'summary',
    run: ({ ctx, partial }) => {
      const readiness = computeReadiness(partial);
      return Promise.resolve(generateExecutionSummary(ctx, partial, readiness));
    },
  });

function collectRuntimeFiles(partial: Partial<RuntimeState>): GeneratedFile[] {
  return [
    ...(partial.log?.files     ?? []),
    ...(partial.summary?.files ?? []),
  ];
}

function computeReadiness(partial: Partial<RuntimeState>): RuntimeReadiness {
  const allIssues = [
    ...(partial.install?.issues     ?? []),
    ...(partial.build?.issues       ?? []),
    ...(partial.dockerBuild?.issues ?? []),
    ...(partial.artifacts?.issues   ?? []),
  ];

  if (allIssues.some((i) => i.severity === 'blocker')) return 'failed';
  if (allIssues.some((i) => i.severity === 'warning')) return 'partial';
  return 'success';
}

/**
 * Executa o pipeline de runtime local: install → build → docker build → validação de artefatos.
 *
 * Limites de segurança (v1):
 *   - Apenas executáveis da whitelist (node, npm, pnpm, yarn, bun, docker)
 *   - spawn com shell: false — injeção por args é impossível
 *   - Toda escrita é restrita ao outputDir/runtime/
 *   - Nunca executa SSH, conecta VPS ou modifica serviços externos
 *   - Nunca usa shell arbitrário (bash, powershell, cmd)
 *
 * @param ctx        ProjectContext com analysis, plan e deploy preenchidos
 * @param outputDir  Mesmo outputDir das fases anteriores (migrate, deploy, execute)
 * @param projectDir Diretório do projeto fonte onde npm install e build rodam.
 *                   Default: ctx.source.inputPath
 */
export async function runProject(
  ctx: ProjectContext,
  outputDir: string,
  projectDir?: string,
): Promise<RuntimeState> {
  if (!ctx.analysis) {
    throw new Error('runProject requer análise prévia — execute analyzeContext antes.');
  }
  if (!ctx.plan) {
    throw new Error('runProject requer planejamento prévio — execute planContext antes.');
  }

  const resolvedOutputDir  = path.resolve(outputDir);
  const resolvedProjectDir = path.resolve(projectDir ?? ctx.source.inputPath);

  logger.info(`Runtime iniciado para: ${ctx.analysis.projectName}`);
  logger.info(`  Project dir: ${resolvedProjectDir}`);
  logger.info(`  Output dir : ${resolvedOutputDir}`);

  const partial  = await registry.run(ctx, resolvedOutputDir, resolvedProjectDir);
  const readiness = computeReadiness(partial);

  const allFiles = collectRuntimeFiles(partial);
  writeGeneratedFiles(resolvedOutputDir, allFiles);

  logger.info(`Runtime concluído — prontidão: ${readiness}`);

  return {
    projectName: ctx.analysis.projectName,
    outputDir:   resolvedOutputDir,
    projectDir:  resolvedProjectDir,
    install:     partial.install!,
    build:       partial.build!,
    dockerBuild: partial.dockerBuild!,
    artifacts:   partial.artifacts!,
    log:         partial.log!,
    summary:     partial.summary!,
    readiness,
    ranAt: new Date().toISOString(),
  };
}

/**
 * Fase de runtime do pipeline: enriquece o ProjectContext com RuntimeState.
 */
export async function runContext(
  ctx: ProjectContext,
  outputDir: string,
  projectDir?: string,
): Promise<ProjectContext> {
  const result = await runProject(ctx, outputDir, projectDir);
  return withRuntime(ctx, result);
}

export type {
  RuntimeState,
  NpmInstallResult,
  BuildResult,
  DockerBuildResult,
  ArtifactValidationResult,
  RuntimeLogArtifacts,
  RuntimeSummaryArtifacts,
  RuntimeIssue,
  CommandResult,
  RuntimeReadiness,
  RuntimeIssueSeverity,
} from './types';

export { validateCommand, runSafeCommand, ALLOWED_EXECUTABLES, SandboxViolationError } from './sandbox';
